import { initDb, run, query } from '../lib/db';
import { classify } from '../scrapers/classify';
import { extractGenre } from '../scrapers/base';

initDb();

const rows = query('SELECT id, headline, body, item_type FROM trade_articles') as any[];
let fixed = 0;
let changed = 0;

for (const row of rows) {
  const fullText = `${row.headline} ${row.body ?? ''}`;
  const genre = extractGenre(fullText);
  const result = classify(row.headline, row.body ?? '', genre, undefined, undefined, row.item_type);
  run(
    'UPDATE trade_articles SET format_type=?, relevance_tier=?, signal_type=?, tier_reason=? WHERE id=?',
    [result.format_type, result.relevance_tier, result.signal_type, result.tier_reason, row.id]
  );
  fixed++;
  changed++;
}

console.log(`Reclassified: ${fixed} articles (${changed} updated)`);

const fmt = query('SELECT format_type, COUNT(*) as n FROM trade_articles GROUP BY format_type ORDER BY n DESC') as any[];
fmt.forEach((r: any) => console.log(r.format_type, r.n));

const scripted = query('SELECT headline, tier_reason FROM trade_articles WHERE format_type LIKE \'scripted-%\' ORDER BY headline') as any[];
console.log(`\nScripted (${scripted.length}):`);
scripted.forEach((r: any) => console.log(' ', r.headline?.substring(0, 70)));
