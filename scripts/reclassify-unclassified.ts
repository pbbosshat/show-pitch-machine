// One-off backlog cleanup: classify every trade_article that has no relevance_tier.
// The scraper sets relevance_tier inline at scrape time, but a backlog of
// unclassified rows accumulated (e.g. scrapes that ran before the classifier
// was wired in, or fields blanked by a partial schema migration). The briefing
// route surfaces unclassified items by design (so brand-new scrapes are visible
// before classification), but that means scripted noise leaks through until
// the classifier catches up. This script does that catch-up in one pass.
//
// Targets only rows where relevance_tier IS NULL. Already-classified rows are
// not touched — use scripts/reclassify.ts (full re-run) if classifier rules
// change and every row needs re-evaluation.
//
// Usage: npx tsx scripts/reclassify-unclassified.ts

import { query, run } from '../lib/db';
import { classify } from '../scrapers/classify';

interface Row {
  id: string;
  headline: string | null;
  body: string | null;
  item_type: string | null;
}

async function main() {
  const rows = await query<Row>(
    `SELECT id, headline, body, item_type
       FROM trade_articles
      WHERE relevance_tier IS NULL
        AND headline IS NOT NULL`
  );

  console.log(`Unclassified rows: ${rows.length}`);

  let updated = 0;
  const tierCounts: Record<string, number> = {};
  const skipped = []; // Track scripted catches for spot-check output

  for (const row of rows) {
    const result = classify(
      row.headline ?? '',
      row.body ?? '',
      undefined,
      undefined,
      undefined,
      row.item_type ?? undefined
    );

    await run(
      'UPDATE trade_articles SET format_type = ?, relevance_tier = ?, signal_type = ?, tier_reason = ? WHERE id = ?',
      [result.format_type, result.relevance_tier, result.signal_type, result.tier_reason, row.id]
    );
    updated++;
    tierCounts[result.relevance_tier] = (tierCounts[result.relevance_tier] ?? 0) + 1;

    // Capture a few skipped scripted ones so we can eyeball the catch
    if (result.relevance_tier === '3-skip' && skipped.length < 10) {
      skipped.push(`  - ${row.headline?.slice(0, 70)} → ${result.tier_reason}`);
    }
  }

  console.log(`\nUpdated ${updated} rows.`);
  console.log('Tier breakdown:', JSON.stringify(tierCounts));
  if (skipped.length) {
    console.log('\nSample of newly-skipped scripted items:');
    skipped.forEach((s) => console.log(s));
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
