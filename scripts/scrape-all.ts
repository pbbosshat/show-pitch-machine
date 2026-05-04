// Standalone scraper runner — imports all scrapers directly and persists to SQLite.
// Uses Bubba Bang Chrome via SSH tunnel (bang-tunnel mode, port 19223) — never PB's local Chrome.
// Run via: npx tsx --env-file=.env scripts/scrape-all.ts
// Can also target specific sources: npx tsx --env-file=.env scripts/scrape-all.ts deadline variety
// Note: --env-file is required for gmail-newsletters (needs GMAIL_NEWSLETTER_USER) and bang-tunnel config

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { initDb, run, query } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { ScrapedArticle } from '../scrapers/base';
import { classify } from '../scrapers/classify';

initDb();

const ALL_SOURCES = [
  'gmail-newsletters',
  'deadline', 'variety', 'thr', 'c21', 'realscreen',
  'cynopsis', 'tvline', 'indiewire', 'bc', 'production-weekly',
  'network-press',
];

// Resolve which sources to run (CLI args override default ALL_SOURCES)
const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const sources = args.length > 0 ? args : ALL_SOURCES;

async function importScraper(source: string): Promise<() => Promise<ScrapedArticle[]>> {
  switch (source) {
    case 'deadline':          return (await import('../scrapers/deadline')).default;
    case 'variety':           return (await import('../scrapers/variety')).default;
    case 'thr':               return (await import('../scrapers/thr')).default;
    case 'c21':               return (await import('../scrapers/c21')).default;
    case 'realscreen':        return (await import('../scrapers/realscreen')).default;
    case 'cynopsis':          return (await import('../scrapers/cynopsis')).default;
    case 'tvline':            return (await import('../scrapers/tvline')).default;
    case 'indiewire':         return (await import('../scrapers/indiewire')).default;
    case 'bc':                return (await import('../scrapers/bc')).default;
    case 'production-weekly': return (await import('../scrapers/production-weekly')).default;
    case 'gmail-newsletters': return (await import('../scrapers/gmail-newsletters')).default;
    // network-press default export accepts an optional source arg; calling with no arg runs all three sites
    case 'network-press':     return (await import('../scrapers/network-press')).default;
    default: throw new Error(`Unknown source: ${source}`);
  }
}

function persist(source: string, articles: ScrapedArticle[]) {
  for (const article of articles) {
    const { format_type, relevance_tier, signal_type, tier_reason } = classify(
      article.headline, article.body, article.genre, article.format,
      undefined, article.item_type
    );
    run(
      `INSERT INTO trade_articles
         (id, source, url, headline, body, item_type, format_type, relevance_tier, signal_type, tier_reason, scraped_at, embedded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(url) DO UPDATE SET
         headline = excluded.headline,
         body = excluded.body,
         item_type = excluded.item_type,
         format_type = excluded.format_type,
         relevance_tier = excluded.relevance_tier,
         signal_type = excluded.signal_type,
         tier_reason = excluded.tier_reason,
         scraped_at = excluded.scraped_at`,
      [
        // article.source may differ from scraper source (e.g. gmail-newsletters resolves per sender)
        uuidv4(), article.source ?? source, article.url, article.headline, article.body,
        article.item_type, format_type, relevance_tier, signal_type, tier_reason, article.scraped_at,
      ]
    );
  }
  run(
    `INSERT INTO scraper_source_status (source, last_run_at, last_success_at, last_items, consecutive_failures)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(source) DO UPDATE SET
       last_run_at = excluded.last_run_at,
       last_success_at = excluded.last_success_at,
       last_items = excluded.last_items,
       consecutive_failures = 0`,
    [source, Date.now(), Date.now(), articles.length]
  );
}

async function run_all() {
  console.log(`\nRunning ${sources.length} scrapers with local Chrome (port 9222)...\n`);
  let totalItems = 0;

  for (const source of sources) {
    const start = Date.now();
    process.stdout.write(`  ${source.padEnd(20)}`);
    try {
      const scrape = await importScraper(source);
      const articles = await scrape();
      persist(source, articles);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✓  ${articles.length} items  (${elapsed}s)`);
      totalItems += articles.length;
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✗  ERROR: ${(err as Error).message.slice(0, 80)}  (${elapsed}s)`);
    }
  }

  const total = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM trade_articles')[0]?.cnt ?? 0;
  console.log(`\nDone. ${totalItems} new/updated articles this run. Total in DB: ${total}`);
}

run_all().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
