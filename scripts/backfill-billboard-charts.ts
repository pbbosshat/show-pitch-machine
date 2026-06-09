/**
 * Billboard Historical Chart Backfill
 * =====================================
 * Fetches all weekly Billboard chart pages from a date range and upserts them
 * into `trade_articles` exactly as the live scraper would — enabling the RAG
 * pipeline to answer questions about historical chart performance.
 *
 * ARCHIVE ACCESS (verified June 2026):
 *   https://www.billboard.com/charts/{slug}/{YYYY-MM-DD}/
 *   Returns HTTP 200 with full chart HTML for any past week. No login required.
 *   The dated URL is the canonical unique key, so ON CONFLICT(url) makes reruns
 *   fully idempotent — kill and restart at any point without duplicate rows.
 *
 * USAGE:
 *   npx tsx --env-file=.env scripts/backfill-billboard-charts.ts \
 *     [--slugs=hot-100,billboard-200,artist-100] \
 *     [--from=YYYY-MM-DD] \
 *     [--to=YYYY-MM-DD] \
 *     [--delay=2500]
 *
 * DEFAULTS:
 *   --slugs   hot-100,billboard-200,artist-100
 *   --from    the Saturday ~5 years before today
 *   --to      the most recent Saturday
 *   --delay   2500 ms between requests (be polite to Billboard's servers)
 *
 * SATURDAY DATING:
 *   Billboard charts are published weekly, dated on Saturdays. The backfill
 *   generates every Saturday in [from, to] and forms the URL:
 *     https://www.billboard.com/charts/{slug}/{YYYY-MM-DD}/
 *   A chart that started after `from` will return 404 for early weeks — those
 *   are silently skipped with a console.warn (normal behaviour, not an error).
 *
 * VOLUME WARNING:
 *   5 years × 52 weeks × 3 slugs = ~780 requests at 2.5s each ≈ 33 minutes.
 *   Full 10-chart × 5-year run ≈ 2,600 requests ≈ 1h50m.
 *   Run on Bang (CDPProxy machine) overnight — do NOT run on PB's workstation.
 *   Rate limit is intentionally conservative; lower --delay at your own risk.
 *
 * RECOMMENDED CADENCE:
 *   One-time seed: run this script with full date range on Bang.
 *   Ongoing:       the daily scrape-all.ts keeps current-week charts fresh.
 *                  No need to re-run backfill unless adding a new slug.
 */

// Suppress Node's experimental-sqlite warning emitted on import (Node 22+)
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { v4 as uuidv4 } from 'uuid';
import { parseChartPage } from '../scrapers/billboard';
import { classify } from '../scrapers/classify';
import type { ScrapedArticle } from '../scrapers/base';

// ── DB abstraction ────────────────────────────────────────────────────────────
//
// The project is mid-migration from node:sqlite (local/Bang) → Railway Postgres.
// lib/db.ts is now Postgres-only and throws if DATABASE_URL is absent.
// This script supports BOTH environments:
//   • DATABASE_URL set   → use lib/db.ts (Railway or Bang prod)
//   • DATABASE_URL unset → use node:sqlite against DATABASE_PATH (local dev / Bang SQLite)
//
// WHY not just always use lib/db.ts:
//   Bang's .env has DATABASE_PATH=./data/db.sqlite, not DATABASE_URL.
//   All existing scrape-all.ts runs on Bang write to that SQLite file.
//   Forcing Postgres here would break the Bang workflow until the full migration lands.

type RunFn = (sql: string, params: unknown[]) => Promise<void>;

async function setupDb(): Promise<{ runSql: RunFn; initDone: boolean }> {
  if (process.env.DATABASE_URL) {
    // Postgres path — lib/db.ts (Railway / Bang prod)
    const { initDb, run } = await import('../lib/db');
    await initDb();
    const runSql: RunFn = async (sql, params) => { await run(sql, params); };
    console.log('[backfill] DB: Railway Postgres (DATABASE_URL)');
    return { runSql, initDone: true };
  }

  // SQLite path — node:sqlite built-in (local dev / Bang SQLite)
  const dbPath = process.env.DATABASE_PATH ?? './data/db.sqlite';
  const { DatabaseSync } = await import('node:sqlite') as any;
  const db = new DatabaseSync(dbPath);
  // Ensure WAL mode for better concurrent write performance during long backfills
  db.exec('PRAGMA journal_mode=WAL');
  const runSql: RunFn = async (sql, params) => {
    // node:sqlite uses ? placeholders natively; no translation needed
    db.prepare(sql).run(...(params as unknown[]));
  };
  console.log(`[backfill] DB: SQLite (${dbPath})`);
  return { runSql, initDone: false };
}

// ── Constants ────────────────────────────────────────────────────────────────

const SOURCE = 'billboard';
const BASE_URL = 'https://www.billboard.com';

// Desktop UA — same as scrapers/billboard.ts; required for full chart HTML
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Genre map for the charts we support — mirrors the CHARTS array in billboard.ts
// so body text and RAG queries get the right genre tag on historical entries.
// Add new slugs here if you extend --slugs beyond the defaults.
const SLUG_META: Record<string, { name: string; genre: string }> = {
  'hot-100':                  { name: 'Hot 100',               genre: 'Music'       },
  'billboard-200':            { name: 'Billboard 200',         genre: 'Music'       },
  'artist-100':               { name: 'Artist 100',            genre: 'Music'       },
  'billboard-global-200':     { name: 'Global 200',            genre: 'Music'       },
  'billboard-global-excl-us': { name: 'Global Excl. US',       genre: 'Music'       },
  'streaming-songs':          { name: 'Streaming Songs',       genre: 'Music'       },
  'radio-songs':              { name: 'Radio Songs',           genre: 'Music'       },
  'digital-song-sales':       { name: 'Digital Song Sales',    genre: 'Music'       },
  'top-album-sales':          { name: 'Top Album Sales',       genre: 'Music'       },
  'country-songs':            { name: 'Hot Country Songs',     genre: 'Country'     },
  'country-albums':           { name: 'Top Country Albums',    genre: 'Country'     },
  'rock-songs':               { name: 'Hot Rock Songs',        genre: 'Rock'        },
  'rock-albums':              { name: 'Top Rock Albums',       genre: 'Rock'        },
  'hot-alternative-songs':    { name: 'Hot Alternative Songs', genre: 'Rock'        },
  'r-b-hip-hop-songs':        { name: 'Hot R&B/Hip-Hop Songs', genre: 'R&B/Hip-Hop' },
  'r-b-hip-hop-albums':       { name: 'Top R&B/Hip-Hop Albums',genre: 'R&B/Hip-Hop' },
  'rap-song':                 { name: 'Hot Rap Songs',         genre: 'R&B/Hip-Hop' },
  'latin-songs':              { name: 'Hot Latin Songs',       genre: 'Latin'       },
  'latin-albums':             { name: 'Top Latin Albums',      genre: 'Latin'       },
  'dance-electronic-songs':   { name: 'Hot Dance/Electronic',  genre: 'Music'       },
  'christian-songs':          { name: 'Hot Christian Songs',   genre: 'Music'       },
  'gospel-songs':             { name: 'Hot Gospel Songs',      genre: 'Music'       },
  'pop-songs':                { name: 'Pop Airplay',           genre: 'Music'       },
  'adult-contemporary':       { name: 'Adult Contemporary',    genre: 'Music'       },
};

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

/**
 * Parse --key=value style flags from process.argv. Returns undefined for
 * absent flags so callers can apply their own defaults.
 */
function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

/**
 * Find the most recent Saturday on or before `from` (inclusive).
 * Billboard chart weeks end on Saturday; the URL date is that Saturday.
 * Day index: 0=Sun, 1=Mon, ..., 6=Sat
 */
function mostRecentSaturday(d: Date): Date {
  const day = d.getDay(); // 0–6
  // Number of days to subtract to reach the preceding (or same-day) Saturday:
  // Sat=0, Sun=6, Mon=5, Tue=4, Wed=3, Thu=2, Fri=1
  const daysBack = day === 6 ? 0 : day + 1;
  const sat = new Date(d);
  sat.setDate(sat.getDate() - daysBack);
  return sat;
}

/**
 * Generate every Saturday date (inclusive) from `startDate` to `endDate`.
 * Dates are returned as ISO strings ("YYYY-MM-DD") in ascending chronological order.
 * Both bounds are snapped to their nearest preceding Saturday before generating.
 */
function generateSaturdayRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  // Snap both bounds to Saturday so the range is inclusive on both ends
  const cur = mostRecentSaturday(startDate);
  const end = mostRecentSaturday(endDate);

  while (cur <= end) {
    // Build YYYY-MM-DD in local time (Billboard dates are in US time; close enough)
    const yyyy = cur.getFullYear();
    const mm   = String(cur.getMonth() + 1).padStart(2, '0');
    const dd   = String(cur.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    // Advance by exactly 7 days
    cur.setDate(cur.getDate() + 7);
  }

  return dates;
}

/** Sleep helper — enforces the per-request rate limit. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch the HTML for a single Billboard chart URL.
 * Returns null on any non-200 response instead of throwing — 404s for chart
 * weeks before the chart launched are expected and should be silently skipped.
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

/**
 * Build a bound persistArticle function once DB is ready.
 *
 * Returns an async function that persists one ScrapedArticle to trade_articles
 * using the same INSERT…ON CONFLICT pattern as persist() in scrape-all.ts.
 *   - First run  → inserts the row.
 *   - Re-run     → updates headline/body/scraped_at in place (idempotent/resumable).
 *
 * The dated URL (e.g. /charts/hot-100/2020-01-04/) is globally unique per
 * chart-week, so ON CONFLICT(url) is the correct dedup key.
 *
 * Sets embedded=0 so the existing embed-articles step ingests it in the next cycle.
 *
 * NOTE: We await the runSql call explicitly here — scrape-all.ts's persist() does
 * NOT await run(), which silently swallows DB errors. During a long multi-year
 * backfill we want connection errors to surface so we can stop and retry.
 */
function makePersist(runSql: RunFn) {
  return async function persistArticle(article: ScrapedArticle): Promise<void> {
    const { format_type, relevance_tier, signal_type, tier_reason } = classify(
      article.headline, article.body, article.genre, article.format,
      undefined, article.item_type
    );
    await runSql(
      `INSERT INTO trade_articles
         (id, source, url, headline, body, item_type, format_type, relevance_tier,
          signal_type, tier_reason, scraped_at, embedded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(url) DO UPDATE SET
         headline       = excluded.headline,
         body           = excluded.body,
         item_type      = excluded.item_type,
         format_type    = excluded.format_type,
         relevance_tier = excluded.relevance_tier,
         signal_type    = excluded.signal_type,
         tier_reason    = excluded.tier_reason,
         scraped_at     = excluded.scraped_at`,
      [
        uuidv4(), SOURCE, article.url, article.headline, article.body,
        article.item_type, format_type, relevance_tier, signal_type, tier_reason,
        article.scraped_at,
      ]
    );
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Parse CLI args ──────────────────────────────────────────────────────────

  const slugsArg  = getArg('slugs')  ?? 'hot-100,billboard-200,artist-100';
  const fromArg   = getArg('from');
  const toArg     = getArg('to');
  const delayArg  = getArg('delay');

  const slugs    = slugsArg.split(',').map((s) => s.trim()).filter(Boolean);
  const delayMs  = delayArg ? parseInt(delayArg, 10) : 2500;

  // Default date range: from = Saturday ~5 years ago, to = most recent Saturday
  const today     = new Date();
  const fiveYearsAgo = new Date(today);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const fromDate  = fromArg ? new Date(`${fromArg}T00:00:00`) : fiveYearsAgo;
  const toDate    = toArg   ? new Date(`${toArg}T00:00:00`)   : today;

  // Validate dates
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    console.error('[backfill] Invalid --from or --to date. Expected YYYY-MM-DD format.');
    process.exit(1);
  }
  if (fromDate > toDate) {
    console.error('[backfill] --from must be before --to.');
    process.exit(1);
  }

  // Generate all Saturday dates in range
  const saturdays = generateSaturdayRange(fromDate, toDate);

  // Warn if any slug is unknown (typo guard — SLUG_META is the source of truth)
  for (const slug of slugs) {
    if (!SLUG_META[slug]) {
      console.warn(`[backfill] WARNING: slug "${slug}" not found in SLUG_META — name/genre will be "Unknown". Add it to SLUG_META in this script if you want proper metadata.`);
    }
  }

  // ── Summary header ──────────────────────────────────────────────────────────

  console.log('\nBillboard Historical Backfill');
  console.log('──────────────────────────────────────────────────');
  console.log(`  Slugs   : ${slugs.join(', ')}`);
  console.log(`  From    : ${saturdays[0] ?? '(none)'}`);
  console.log(`  To      : ${saturdays[saturdays.length - 1] ?? '(none)'}`);
  console.log(`  Weeks   : ${saturdays.length}`);
  console.log(`  Requests: ${slugs.length * saturdays.length} (${slugs.length} charts × ${saturdays.length} weeks)`);
  console.log(`  Delay   : ${delayMs}ms between requests`);
  console.log(`  Est.    : ~${Math.round(slugs.length * saturdays.length * delayMs / 60000)} minutes`);
  console.log('──────────────────────────────────────────────────\n');

  // ── DB init ─────────────────────────────────────────────────────────────────

  const { runSql } = await setupDb();
  const persistArticle = makePersist(runSql);

  // ── Counters ────────────────────────────────────────────────────────────────

  let attempted = 0;    // total (slug, date) pairs tried
  let upserted  = 0;    // rows successfully parsed + persisted
  let skipped   = 0;    // 404s / empty parses (chart didn't exist that week)
  let errors    = 0;    // unexpected fetch/persist errors

  // ── Main loop — iterate slugs × weeks ──────────────────────────────────────

  for (const slug of slugs) {
    const meta = SLUG_META[slug] ?? { name: slug, genre: 'Music' };
    console.log(`\n[backfill] Starting chart: ${slug} (${saturdays.length} weeks)`);

    let chartUpserted = 0;
    let chartSkipped  = 0;

    for (let i = 0; i < saturdays.length; i++) {
      const dateStr = saturdays[i];
      const url     = `${BASE_URL}/charts/${slug}/${dateStr}/`;
      attempted++;

      // Rate-limit before every request (including the first per chart —
      // we're polite to Billboard regardless of which request it is).
      if (attempted > 1) await sleep(delayMs);

      // Fetch the archived chart page
      const html = await fetchHtml(url);
      if (!html) {
        // Expected for weeks before the chart launched; not a hard error
        console.warn(`[backfill] SKIP ${slug}/${dateStr} — non-200 (chart may not exist for this week)`);
        skipped++;
        chartSkipped++;
        continue;
      }

      // Parse via the exported function from scrapers/billboard.ts
      const entries = parseChartPage(html);
      if (entries.length === 0) {
        console.warn(`[backfill] SKIP ${slug}/${dateStr} — no chart rows in response`);
        skipped++;
        chartSkipped++;
        continue;
      }

      // Build the body text in the same format as the live scraper
      const bodyLines = entries.map((e) => {
        const lw    = e.last_week      ? `LW ${e.last_week}`       : 'LW NEW';
        const peak  = e.peak           ? `Peak ${e.peak}`          : 'Peak -';
        const weeks = e.weeks_on_chart ? `${e.weeks_on_chart} wks` : '1 wk';
        return `${e.rank}. ${e.title} — ${e.artist} (${lw}, ${peak}, ${weeks})`;
      });

      const article: ScrapedArticle = {
        source:     SOURCE,
        url,
        // Headline format matches live scraper: "Billboard {Name} — week of YYYY-MM-DD"
        // Using the ISO date string (not a human-readable date) because archives don't
        // always embed the "Week of Month DD, YYYY" text the live scraper extracts.
        headline:   `Billboard ${meta.name} — week of ${dateStr}`,
        body:       bodyLines.join('\n'),
        item_type:  'chart',
        genre:      meta.genre,
        scraped_at: Date.now(),
      };

      try {
        await persistArticle(article);
        upserted++;
        chartUpserted++;
      } catch (err) {
        console.error(`[backfill] ERROR persisting ${slug}/${dateStr}: ${(err as Error).message}`);
        errors++;
      }

      // Periodic progress log — every 50 requests (≈ 1 year of weekly data)
      if (attempted % 50 === 0) {
        console.log(`[backfill] Progress: ${attempted} attempted, ${upserted} upserted, ${skipped} skipped, ${errors} errors`);
      }
    }

    console.log(`[backfill] Chart done: ${slug} — ${chartUpserted} upserted, ${chartSkipped} skipped`);
  }

  // ── Final summary ───────────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════════');
  console.log('Backfill complete');
  console.log(`  Attempted : ${attempted}`);
  console.log(`  Upserted  : ${upserted}`);
  console.log(`  Skipped   : ${skipped}  (404 / empty — normal for early weeks)`);
  console.log(`  Errors    : ${errors}`);
  console.log('══════════════════════════════════════════════════\n');

  if (errors > 0) {
    console.warn('[backfill] There were errors — check logs above. Re-running is safe (idempotent).');
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('[backfill] Fatal error:', e);
  process.exit(1);
});
