// Data enrichment script for the Show DB feature.
// Three sequential steps controlled by CLI flags:
//   Step 1 — Mark MYE-produced shows (is_our_show = 1) by matching site_shows titles → shows table
//   Step 2 — Enrich shows rows with TVMaze API data (tvmaze_id, schedule, total_seasons, air_status, off_air_date)
//   Step 3 — Parse Production Weekly issue pages for new show titles and upsert them into shows
//
// Run via: npx tsx scripts/enrich-tvmaze.ts [--dry-run] [--all] [--pw-only] [--our-shows-only] [--skip-pw]

// Suppress node:sqlite experimental warning on startup
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { randomUUID } from 'node:crypto';
import { initDb, run, query, queryOne } from '../lib/db';

// ─── TVMaze API types ─────────────────────────────────────────────────────────

interface TVMazeSearchResult {
  score: number;
  show: TVMazeShow;
}

interface TVMazeShow {
  id: number;
  name: string;
  type: string;
  status: string;
  premiered: string | null;
  ended: string | null;
  schedule: { time: string; days: string[] } | null;
  _embedded?: { seasons: Array<{ id: number }> };
}

// ─── DB row types ─────────────────────────────────────────────────────────────

interface ShowRow {
  id: string;
  title: string;
  tvmaze_id: number | null;
}

interface SiteShowRow {
  title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 100ms pause — respects TVMaze's ~20 req/sec free-tier rate limit
const tvmazeDelay = (): Promise<void> =>
  new Promise((r) => setTimeout(r, 100));

// Normalize a show title for case-insensitive dedup matching
function normTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Step 1: Mark "our shows" ─────────────────────────────────────────────────

/**
 * Queries site_shows (MYE-produced titles) and sets is_our_show = 1 on matching
 * rows in the shows (comp DB) table. Tries exact match first, then contains match.
 * Called by: scripts/enrich-tvmaze.ts main()
 */
export async function markOurShows(dryRun: boolean): Promise<void> {
  const prefix = dryRun ? 'DRY RUN: ' : '';
  const now = Date.now();

  const siteShows = query<SiteShowRow>('SELECT title FROM site_shows ORDER BY title ASC');

  let matched = 0;
  const noMatch: string[] = [];

  for (const { title } of siteShows) {
    const lowerTitle = title.toLowerCase().trim();

    // Try exact normalized match first
    const exact = queryOne<{ id: string }>(
      'SELECT id FROM shows WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))',
      [title]
    );

    if (exact) {
      // Exact match found — mark as our show
      if (!dryRun) {
        run('UPDATE shows SET is_our_show = 1, updated_at = ? WHERE id = ?', [now, exact.id]);
      }
      matched++;
      continue;
    }

    // Fall back to contains match — finds e.g. "Ghost Adventures: Aftershocks" when site_shows has "Ghost Adventures"
    const containsResults = query<{ id: string }>(
      'SELECT id FROM shows WHERE LOWER(title) LIKE ?',
      [`%${lowerTitle}%`]
    );

    if (containsResults.length > 0) {
      // Update all partial matches (e.g. all Ghost Adventures spinoffs)
      if (!dryRun) {
        for (const row of containsResults) {
          run('UPDATE shows SET is_our_show = 1, updated_at = ? WHERE id = ?', [now, row.id]);
        }
      }
      matched++;
    } else {
      noMatch.push(title);
    }
  }

  console.log(
    `${prefix}✓ Marked ${matched} / ${siteShows.length} site_shows titles as our shows in shows table`
  );

  for (const title of noMatch) {
    console.log(`${prefix}⚠ No match found for: ${title}`);
  }
}

// ─── Step 2: TVMaze enrichment ────────────────────────────────────────────────

/**
 * Fetches TVMaze data for each show row missing a tvmaze_id (or all rows if --all).
 * Enriches: tvmaze_id, schedule, total_seasons, air_status, off_air_date.
 * Per-show errors are caught and logged — the loop never crashes.
 * Rate-limited to 100ms between API calls to stay within TVMaze's free tier.
 * Called by: scripts/enrich-tvmaze.ts main()
 */
export async function enrichTVMaze(dryRun: boolean, allShows: boolean): Promise<void> {
  const prefix = dryRun ? 'DRY RUN: ' : '';

  // Decide which shows to process — all or only those without a tvmaze_id
  const shows = allShows
    ? query<ShowRow>('SELECT id, title, tvmaze_id FROM shows ORDER BY title ASC')
    : query<ShowRow>('SELECT id, title, tvmaze_id FROM shows WHERE tvmaze_id IS NULL ORDER BY title ASC');

  console.log(`${prefix}TVMaze enrichment: processing ${shows.length} show(s)...`);

  let enriched = 0;
  let skipped = 0;

  for (const show of shows) {
    try {
      // Search TVMaze for this show title
      const searchUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(show.title)}`;
      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) {
        throw new Error(`TVMaze search HTTP ${searchRes.status}`);
      }

      const results: TVMazeSearchResult[] = await searchRes.json() as TVMazeSearchResult[];

      // Only accept the first result if confidence score is high enough
      if (!results.length || results[0].score < 0.7) {
        console.log(`${prefix}  ~ Skipped ${show.title}: no confident TVMaze match (best score: ${results[0]?.score ?? 0})`);
        skipped++;
        await tvmazeDelay();
        continue;
      }

      const tvmazeId = results[0].show.id;

      // Fetch full show detail with embedded seasons for total season count
      await tvmazeDelay(); // Rate-limit between the two calls for this show
      const detailUrl = `https://api.tvmaze.com/shows/${tvmazeId}?embed=seasons`;
      const detailRes = await fetch(detailUrl);

      if (!detailRes.ok) {
        throw new Error(`TVMaze detail HTTP ${detailRes.status}`);
      }

      const detail: TVMazeShow = await detailRes.json() as TVMazeShow;

      // Build schedule string — e.g. "Friday 21:00" or "Sunday/Monday 20:00"
      const days = detail.schedule?.days ?? [];
      const time = detail.schedule?.time ?? '';
      const schedule = days.length
        ? days.join('/') + (time ? ' ' + time : '')
        : time || null;

      // Total seasons from embedded seasons array
      const totalSeasons = detail._embedded?.seasons?.length ?? null;

      // Map TVMaze status to our air_status enum
      let airStatus: 'on_air' | 'available' | 'off_air';
      if (detail.status === 'Running') {
        airStatus = 'on_air';
      } else if (detail.status === 'In Development') {
        airStatus = 'available';
      } else {
        // 'Ended', 'Canceled', etc.
        airStatus = 'off_air';
      }

      // off_air_date: parse ISO date string to unix ms timestamp
      const offAirDate = detail.ended ? Date.parse(detail.ended) : null;

      const now = Date.now();

      if (!dryRun) {
        run(
          `UPDATE shows
             SET tvmaze_id = ?, schedule = ?, total_seasons = ?,
                 air_status = ?, off_air_date = ?, updated_at = ?
           WHERE id = ?`,
          [tvmazeId, schedule, totalSeasons, airStatus, offAirDate, now, show.id]
        );
      }

      console.log(
        `${prefix}✓ ${show.title} → TVMaze #${tvmazeId} [${detail.status}] ${totalSeasons ?? '?'} seasons`
      );
      enriched++;
    } catch (err) {
      // Catch per-show errors so a single bad lookup never kills the whole run
      console.log(`${prefix}✗ Skipped ${show.title}: ${(err as Error).message}`);
      skipped++;
    }

    // Rate limit: 100ms between each show (two API calls per show share this delay)
    await tvmazeDelay();
  }

  console.log(`${prefix}TVMaze enrichment complete: ${enriched} enriched, ${skipped} skipped`);
}

// ─── Step 3: Production Weekly integration ────────────────────────────────────

/**
 * Parses show titles from a Production Weekly issue HTML page.
 * PW issues list titles in <p> tags, joined by the bullet point character (•).
 * Also handles HTML entities &bull; and &#8226; as separators.
 * Returns an array of trimmed, non-empty title strings.
 */
export function parsePWTitles(html: string): string[] {
  // Match all <p>...</p> content blocks — non-greedy to avoid merging paragraphs
  const pTagPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const titles: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = pTagPattern.exec(html)) !== null) {
    const inner = match[1];

    // Strip any remaining HTML tags from inside the <p> (e.g. <strong>, <em>, <a>)
    const stripped = inner.replace(/<[^>]+>/g, '');

    // Decode common HTML entities before splitting
    const decoded = stripped
      .replace(/&bull;/gi, '•')
      .replace(/&#8226;/g, '•')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, ' ');  // strip any remaining numeric entities

    // Split on bullet separator and collect non-empty titles
    const parts = decoded.split('•');
    for (const part of parts) {
      const title = part.trim();
      if (title.length > 0) {
        titles.push(title);
      }
    }
  }

  return titles;
}

/**
 * Upserts Production Weekly show titles into the shows table.
 * New titles get source='production_weekly', air_status='on_air', data_source='trade'.
 * Uses INSERT OR IGNORE — the unique index on (title_normalized, network) prevents duplicates
 * for rows that share both title_normalized and network (NULL network is handled safely).
 * After inserting new rows, triggers TVMaze enrichment for those specific shows only.
 * Called from runPWIntegration() or directly from the PW scraper.
 */
export async function upsertPWShows(
  titles: string[],
  _issueDate: Date,
  dryRun: boolean
): Promise<void> {
  const prefix = dryRun ? 'DRY RUN: ' : '';
  const now = Date.now();

  let inserted = 0;
  let alreadyExisted = 0;
  const newIds: string[] = [];

  for (const title of titles) {
    // Normalize for dedup check — matches the title_normalized column pattern
    const lowerTitle = normTitle(title);

    // Check if this title already exists (any network — PW titles have NULL network)
    const existing = queryOne<{ id: string }>(
      'SELECT id FROM shows WHERE LOWER(TRIM(title)) = ?',
      [lowerTitle]
    );

    if (existing) {
      alreadyExisted++;
      continue;
    }

    const id = randomUUID();

    if (!dryRun) {
      // INSERT OR IGNORE handles the edge case where a concurrent insert slips through
      // the check above (safe for single-process scripts but good defensive practice).
      const result = run(
        `INSERT OR IGNORE INTO shows
           (id, title, title_normalized, source, air_status, data_source, created_at, updated_at)
         VALUES (?, ?, ?, 'production_weekly', 'on_air', 'trade', ?, ?)`,
        [id, title, lowerTitle, now, now]
      );

      if (result.changes > 0) {
        console.log(`${prefix}PW: inserted '${title}'`);
        newIds.push(id);
        inserted++;
      } else {
        // INSERT OR IGNORE silently skipped — already existed
        alreadyExisted++;
      }
    } else {
      console.log(`${prefix}PW: would insert '${title}'`);
      inserted++;
    }
  }

  console.log(
    `${prefix}PW: ${inserted} new titles inserted, ${alreadyExisted} already existed`
  );

  // TVMaze enrichment for newly inserted shows only — avoids re-enriching the whole table
  if (newIds.length > 0 && !dryRun) {
    console.log(`${prefix}TVMaze: enriching ${newIds.length} new PW show(s)...`);

    const newShows = query<ShowRow>(
      `SELECT id, title, tvmaze_id FROM shows WHERE id IN (${newIds.map(() => '?').join(',')})`,
      newIds
    );

    for (const show of newShows) {
      try {
        const searchUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(show.title)}`;
        const searchRes = await fetch(searchUrl);

        if (!searchRes.ok) throw new Error(`TVMaze search HTTP ${searchRes.status}`);

        const results: TVMazeSearchResult[] = await searchRes.json() as TVMazeSearchResult[];

        if (!results.length || results[0].score < 0.7) {
          await tvmazeDelay();
          continue;
        }

        const tvmazeId = results[0].show.id;
        await tvmazeDelay();

        const detailRes = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}?embed=seasons`);
        if (!detailRes.ok) throw new Error(`TVMaze detail HTTP ${detailRes.status}`);

        const detail: TVMazeShow = await detailRes.json() as TVMazeShow;

        const days = detail.schedule?.days ?? [];
        const time = detail.schedule?.time ?? '';
        const schedule = days.length
          ? days.join('/') + (time ? ' ' + time : '')
          : time || null;

        const totalSeasons = detail._embedded?.seasons?.length ?? null;

        let airStatus: 'on_air' | 'available' | 'off_air';
        if (detail.status === 'Running') airStatus = 'on_air';
        else if (detail.status === 'In Development') airStatus = 'available';
        else airStatus = 'off_air';

        const offAirDate = detail.ended ? Date.parse(detail.ended) : null;

        run(
          `UPDATE shows
             SET tvmaze_id = ?, schedule = ?, total_seasons = ?,
                 air_status = ?, off_air_date = ?, updated_at = ?
           WHERE id = ?`,
          [tvmazeId, schedule, totalSeasons, airStatus, offAirDate, Date.now(), show.id]
        );

        console.log(
          `${prefix}✓ PW+TVMaze: ${show.title} → #${tvmazeId} [${detail.status}] ${totalSeasons ?? '?'} seasons`
        );
      } catch (err) {
        console.log(`${prefix}✗ PW+TVMaze skipped ${show.title}: ${(err as Error).message}`);
      }

      await tvmazeDelay();
    }
  }
}

// ─── Step 3 wrapper: run PW scraper and integrate titles ─────────────────────

/**
 * Orchestrates the Production Weekly integration step.
 * Imports the PW scraper (which does the fetch/parse), then calls upsertPWShows
 * for each issue's titles. The PW scraper is also extended in production-weekly.ts
 * to call parsePWTitles + upsertPWShows inline during a live scrape run.
 * Called by: scripts/enrich-tvmaze.ts main()
 */
async function runPWIntegration(dryRun: boolean): Promise<void> {
  const prefix = dryRun ? 'DRY RUN: ' : '';
  console.log(`${prefix}Production Weekly integration: fetching recent issues...`);

  // Import the PW scraper — it returns ScrapedArticle[] but the integration hook
  // inside it also calls parsePWTitles + upsertPWShows for each page it visits.
  // When called from here (not from scrape-all), we trigger it manually.
  try {
    const { default: scrapePW } = await import('../scrapers/production-weekly');
    await scrapePW(dryRun);
    console.log(`${prefix}PW integration complete`);
  } catch (err) {
    console.error(`${prefix}PW integration failed: ${(err as Error).message}`);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Initialize the DB (runs all pending migrations) before any queries
  initDb();

  const args = process.argv.slice(2);
  const dryRun         = args.includes('--dry-run');
  const allShows       = args.includes('--all');
  const pwOnly         = args.includes('--pw-only');
  const ourShowsOnly   = args.includes('--our-shows-only');
  const skipPW         = args.includes('--skip-pw');

  if (dryRun) console.log('DRY RUN: no DB writes will be made\n');

  // Step 1: mark MYE shows — skipped only when --pw-only is set
  if (!pwOnly) await markOurShows(dryRun);

  // Step 2: TVMaze enrichment — skipped when --pw-only or --our-shows-only
  if (!pwOnly && !ourShowsOnly) await enrichTVMaze(dryRun, allShows);

  // Step 3: PW integration — skipped when --our-shows-only or --skip-pw
  if (!ourShowsOnly && !skipPW) await runPWIntegration(dryRun);
}

main().catch(console.error);
