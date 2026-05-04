/**
 * Quick smoke-test for the 5 updated scrapers.
 * Run with: BROWSER_MODE=local npx tsx scripts/test-scrapers.ts
 */

process.env.BROWSER_MODE = 'local';

const SOURCES = ['variety', 'indiewire', 'c21', 'realscreen', 'bc'] as const;

async function run() {
  console.log('Testing 5 updated scrapers against local Chrome (port 9222)...\n');

  for (const source of SOURCES) {
    const start = Date.now();
    try {
      const mod = await import(`../scrapers/${source}`);
      const articles = await mod.default();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const byType = articles.reduce<Record<string, number>>((acc, a) => {
        acc[a.item_type] = (acc[a.item_type] || 0) + 1;
        return acc;
      }, {});
      console.log(`✓ ${source.padEnd(12)} ${articles.length} articles in ${elapsed}s  ${JSON.stringify(byType)}`);
      if (articles.length > 0) {
        console.log(`  first: "${articles[0].headline.slice(0, 80)}"`);
      }
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✗ ${source.padEnd(12)} FAILED in ${elapsed}s: ${(err as Error).message}`);
    }
    console.log();
  }

  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
