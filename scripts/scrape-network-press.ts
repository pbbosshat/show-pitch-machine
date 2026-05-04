/**
 * Network Press Scraper — standalone runner
 *
 * Fetches official show announcements from Discovery, A+E Networks, and
 * NBCUniversal press sites. These are first-party, authoritative sources.
 *
 * Usage:
 *   npx tsx scripts/scrape-network-press.ts
 *   npx tsx scripts/scrape-network-press.ts --source=discovery
 *   npx tsx scripts/scrape-network-press.ts --source=aenetworks
 *   npx tsx scripts/scrape-network-press.ts --source=nbcuniversal
 *   npx tsx scripts/scrape-network-press.ts --source=all
 *
 * Output: articles persisted to trade_articles table; shows table enriched
 * where show titles can be matched. Summary printed on exit.
 */

// Suppress the Node 24 experimental sqlite warning — we use it intentionally
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { initDb, run as dbRun, query, queryOne } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { ScrapedArticle } from '../scrapers/base';
import { classify } from '../scrapers/classify';
import scrapeNetworkPress, { enrichShows, type NetworkPressSource } from '../scrapers/network-press';

// ─── Init DB ──────────────────────────────────────────────────────────────────

initDb();

// ─── Argument parsing ─────────────────────────────────────────────────────────

/**
 * Parse --source= flag from CLI args.
 * Accepted values: discovery | aenetworks | nbcuniversal | all
 * Defaults to 'all' when not specified.
 */
function parseSource(): NetworkPressSource | 'all' {
  const sourceArg = process.argv
    .slice(2)
    .find((a) => a.startsWith('--source='));

  if (!sourceArg) return 'all';

  const raw = sourceArg.replace('--source=', '').toLowerCase().trim();

  // Map CLI shorthands to canonical source identifiers
  const aliasMap: Record<string, NetworkPressSource | 'all'> = {
    'all':          'all',
    'discovery':    'discovery-press',
    'aenetworks':   'aenetworks-press',
    'nbcuniversal': 'nbcuniversal-press',
    // Accept full canonical forms too
    'discovery-press':    'discovery-press',
    'aenetworks-press':   'aenetworks-press',
    'nbcuniversal-press': 'nbcuniversal-press',
  };

  const resolved = aliasMap[raw];
  if (!resolved) {
    console.error(
      `Unknown --source value: "${raw}". Valid options: discovery, aenetworks, nbcuniversal, all`
    );
    process.exit(1);
  }

  return resolved;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/**
 * Persist scraped articles to trade_articles, using the same classify() +
 * INSERT OR UPDATE pattern as scrape-all.ts.
 *
 * Also updates scraper_source_status so the dashboard reflects this run.
 *
 * @returns Number of rows inserted or updated
 */
function persistArticles(source: string, articles: ScrapedArticle[]): number {
  let persisted = 0;

  for (const article of articles) {
    const { format_type, relevance_tier, signal_type, tier_reason } = classify(
      article.headline,
      article.body,
      article.genre,
      article.format,
      undefined,
      article.item_type
    );

    const result = dbRun(
      `INSERT INTO trade_articles
         (id, source, url, headline, body, item_type, format_type, relevance_tier, signal_type, tier_reason, scraped_at, embedded)
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
        uuidv4(),
        article.source ?? source,
        article.url,
        article.headline,
        article.body,
        article.item_type,
        format_type,
        relevance_tier,
        signal_type,
        tier_reason,
        article.scraped_at,
      ]
    );

    // changes = 0 means ON CONFLICT path ran but body was identical — still count it
    persisted++;
  }

  // Update the scraper health status table so the dashboard stays current
  dbRun(
    `INSERT INTO scraper_source_status (source, last_run_at, last_success_at, last_items, consecutive_failures)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(source) DO UPDATE SET
       last_run_at          = excluded.last_run_at,
       last_success_at      = excluded.last_success_at,
       last_items           = excluded.last_items,
       consecutive_failures = 0`,
    [source, Date.now(), Date.now(), articles.length]
  );

  return persisted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const source = parseSource();

  console.log(`\nNetwork Press Scraper`);
  console.log(`Source: ${source}`);
  console.log(`─────────────────────────────────────────`);

  const start = Date.now();

  // Run the scraper — returns combined results for all requested sources
  let articles: ScrapedArticle[] = [];
  try {
    articles = await scrapeNetworkPress(source);
  } catch (err) {
    console.error(`Scrape failed: ${(err as Error).message}`);
    process.exit(1);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Scraped ${articles.length} articles in ${elapsed}s`);

  // Persist to trade_articles
  const persistedCount = persistArticles(source === 'all' ? 'network-press' : source, articles);
  console.log(`Persisted ${persistedCount} articles to trade_articles`);

  // Show per-source breakdown
  const bySource: Record<string, number> = {};
  for (const a of articles) {
    bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  }
  for (const [src, count] of Object.entries(bySource)) {
    console.log(`  ${src.padEnd(24)} ${count} articles`);
  }

  // Enrich shows table with authoritative press data
  const { showsEnriched } = await enrichShows(articles, dbRun, queryOne);
  console.log(`Enriched ${showsEnriched} shows in the shows table`);

  // Final DB total
  const total = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM trade_articles')[0]?.cnt ?? 0;
  console.log(`\nTotal articles in DB: ${total}`);
  console.log(`Done.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
