// Back-fill script: classifies all existing shows and trade_articles, then prints
// a detailed report showing what gets kept, watched, or discarded — including
// freed-budget signals from cancellations in MYE's production lane.
// Run via: npx tsx scripts/classify-shows.ts

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { initDb, run, query } from '../lib/db';
import { classify } from '../scrapers/classify';

initDb();

// ─── 1. Classify all shows ────────────────────────────────────────────────────

interface ShowRow {
  id: string;
  title: string;
  network: string | null;
  genre: string | null;
  format: string | null;
  is_unscripted: number;
}

const shows = query<ShowRow>(
  'SELECT id, title, network, genre, format, is_unscripted FROM shows'
);

let showsUpdated = 0;
for (const show of shows) {
  const result = classify('', '', show.genre, show.format, show.is_unscripted);
  run(
    'UPDATE shows SET format_type = ?, relevance_tier = ? WHERE id = ?',
    [result.format_type, result.relevance_tier, show.id]
  );
  showsUpdated++;
}

// ─── 2. Classify all trade_articles (greenlit + cancelled + mandate) ──────────

interface ArticleRow {
  id: string;
  headline: string;
  body: string | null;
  item_type: string | null;
  source: string | null;
}

// Include 'cancelled' — cancellations in MYE's lane are freed-budget signals
const articles = query<ArticleRow>(
  `SELECT id, headline, body, item_type, source
   FROM trade_articles
   WHERE item_type IN ('greenlit', 'cancelled', 'mandate-statement')`
);

let articlesUpdated = 0;
for (const article of articles) {
  const result = classify(
    article.headline, article.body ?? '',
    null, null, null,
    article.item_type
  );
  run(
    'UPDATE trade_articles SET format_type = ?, relevance_tier = ?, signal_type = ?, tier_reason = ? WHERE id = ?',
    [result.format_type, result.relevance_tier, result.signal_type, result.tier_reason, article.id]
  );
  articlesUpdated++;
}

// ─── 3. Print report ──────────────────────────────────────────────────────────

interface ClassifiedShow {
  title: string;
  network: string | null;
  genre: string | null;
  format_type: string | null;
  relevance_tier: string | null;
}

interface ClassifiedArticle {
  headline: string;
  source: string | null;
  item_type: string | null;
  format_type: string | null;
  relevance_tier: string | null;
  signal_type: string | null;
  tier_reason: string | null;
}

const classifiedShows = query<ClassifiedShow>(
  `SELECT title, network, genre, format_type, relevance_tier
   FROM shows ORDER BY relevance_tier, title`
);

const classifiedArticles = query<ClassifiedArticle>(
  `SELECT headline, source, item_type, format_type, relevance_tier, signal_type, tier_reason
   FROM trade_articles
   WHERE item_type IN ('greenlit', 'cancelled', 'mandate-statement')
   ORDER BY signal_type, relevance_tier, headline`
);

// ── Shows table ───────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(' SHOWS DATABASE — Classification Results');
console.log('════════════════════════════════════════════════════════════════\n');

for (const tier of ['1-direct', '2-adjacent', '3-skip']) {
  const rows = classifiedShows.filter((s) => s.relevance_tier === tier);
  if (rows.length === 0) continue;
  const label = tier === '1-direct' ? '✓ KEEP' : tier === '2-adjacent' ? '~ WATCH' : '✗ SKIP';
  console.log(`── ${label} [${tier}] (${rows.length} shows) ──`);
  for (const s of rows) {
    console.log(`   ${s.title.padEnd(45)} ${(s.network ?? '').padEnd(25)} ${s.genre ?? ''}`);
  }
  console.log();
}

// ── Trade articles — grouped by signal type ───────────────────────────────────
console.log('════════════════════════════════════════════════════════════════');
console.log(' TRADE ARTICLES — By Signal Type');
console.log('════════════════════════════════════════════════════════════════\n');

// Freed-budget signals first — these are pitch windows
const freedBudget = classifiedArticles.filter(
  (a) => a.signal_type === 'freed-budget' && a.relevance_tier !== '3-skip'
);
if (freedBudget.length > 0) {
  console.log(`── 💰 FREED BUDGET (${freedBudget.length} items) — cancelled in-lane show = open slot ──`);
  for (const a of freedBudget) {
    const src = `[${a.source ?? '?'}]`.padEnd(16);
    console.log(`   ${src} ${a.headline}  ← ${a.tier_reason}`);
  }
  console.log();
}

// Active mandate signals
const mandates = classifiedArticles.filter((a) => a.signal_type === 'mandate');
if (mandates.length > 0) {
  console.log(`── 🎯 MANDATE (${mandates.length} items) — explicit buyer mandate ──`);
  for (const a of mandates) {
    const src = `[${a.source ?? '?'}]`.padEnd(16);
    console.log(`   ${src} ${a.headline}`);
  }
  console.log();
}

// New greenlits in MYE's lane
const greenlits = classifiedArticles.filter(
  (a) => (a.signal_type === 'greenlit' || a.signal_type === 'renewed') && a.relevance_tier !== '3-skip'
);
if (greenlits.length > 0) {
  console.log(`── ✓ ACTIVE BUYER SIGNALS (${greenlits.length} items) — greenlit/renewed in MYE lane ──`);
  for (const a of greenlits) {
    const src = `[${a.source ?? '?'}]`.padEnd(16);
    const sig = a.signal_type === 'renewed' ? '[renewal]' : '[new]    ';
    console.log(`   ${src} ${sig} ${a.headline}  ← ${a.tier_reason}`);
  }
  console.log();
}

// Skipped items
const skipped = classifiedArticles.filter((a) => a.relevance_tier === '3-skip');
console.log(`── ✗ SKIP (${skipped.length} items) — scripted / wrong lane ──`);
for (const a of skipped) {
  const src = `[${a.source ?? '?'}]`.padEnd(16);
  console.log(`   ${src} ${a.headline.slice(0, 80)}  ← ${a.tier_reason}`);
}
console.log();

// ── Summary ───────────────────────────────────────────────────────────────────
const total = classifiedArticles.length;
const actionable = greenlits.length + freedBudget.length + mandates.length;

console.log('════════════════════════════════════════════════════════════════');
console.log(` Updated: ${showsUpdated} shows, ${articlesUpdated} trade articles`);
console.log(` Signal breakdown: ${freedBudget.length} freed-budget | ${greenlits.length} active-buyer | ${mandates.length} mandate | ${skipped.length} skip  (of ${total} relevant articles)`);
if (total > 0) {
  console.log(` Noise reduction: ${Math.round((skipped.length / total) * 100)}% filtered out   Actionable: ${actionable}/${total}`);
}
console.log('════════════════════════════════════════════════════════════════\n');
