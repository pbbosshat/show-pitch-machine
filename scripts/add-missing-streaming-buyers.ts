// One-time seed: adds three streaming networks missing from buyer_companies.
// TMDB seed flagged Amazon Prime Video, Apple TV+, and discovery+ as absent —
// shows for those networks were seeded with network_id = NULL.
//
// This script:
//   1. Inserts each missing network into buyer_companies (INSERT OR IGNORE)
//   2. Backfills network_id on all existing shows that matched by name but had NULL FK
//
// Safe to re-run — all inserts use INSERT OR IGNORE, backfill uses WHERE ... IS NULL.
// Run: npx tsx scripts/add-missing-streaming-buyers.ts

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { randomUUID } from 'node:crypto';
import { initDb, run, queryOne } from '../lib/db';

initDb();

const now = Date.now();

// Three streaming networks confirmed missing by the TMDB seed run.
// type='streamer' and tier='A' matches how seed.ts classifies the major SVODs.
const MISSING: Array<{ name: string; hq_city: string }> = [
  { name: 'Amazon Prime Video', hq_city: 'Seattle, WA'   },
  { name: 'Apple TV+',          hq_city: 'Cupertino, CA'  },
  { name: 'discovery+',         hq_city: 'New York, NY'   },
];

let inserted  = 0;
let backfilled = 0;

for (const s of MISSING) {
  // Prefer an existing row if it already exists under any case variant
  const existing = queryOne<{ id: string }>(
    `SELECT id FROM buyer_companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
    [s.name]
  );

  let id: string;

  if (existing) {
    id = existing.id;
    console.log(`~ ${s.name}: already in buyer_companies (${id}) — skipping insert`);
  } else {
    id = randomUUID();
    const r = run(
      `INSERT OR IGNORE INTO buyer_companies
         (id, name, type, tier, hq_city, created_at, updated_at)
       VALUES (?, ?, 'streamer', 'A', ?, ?, ?)`,
      [id, s.name, s.hq_city, now, now]
    );
    if (r.changes > 0) {
      inserted++;
      console.log(`✓ ${s.name}: inserted (${id})`);
    } else {
      // INSERT OR IGNORE silently no-oped — look up the real row
      const refound = queryOne<{ id: string }>(
        `SELECT id FROM buyer_companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
        [s.name]
      );
      id = refound?.id ?? id;
      console.log(`~ ${s.name}: insert no-oped — found existing (${id})`);
    }
  }

  // Backfill shows whose network text matches but network_id was NULL
  const backfillResult = run(
    `UPDATE shows
        SET network_id = ?, updated_at = ?
      WHERE LOWER(TRIM(network)) = LOWER(TRIM(?))
        AND network_id IS NULL`,
    [id, now, s.name]
  );

  if (backfillResult.changes > 0) {
    backfilled += backfillResult.changes;
    console.log(`  → backfilled network_id on ${backfillResult.changes} show(s)`);
  } else {
    console.log(`  → no shows needed backfill for "${s.name}"`);
  }
}

console.log('');
console.log('─────────────────────────────────────────────');
console.log(`buyer_companies inserted : ${inserted}`);
console.log(`shows backfilled         : ${backfilled}`);
console.log('─────────────────────────────────────────────');
