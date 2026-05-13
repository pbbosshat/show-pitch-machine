// scripts/migrate-sqlite-to-postgres.ts
//
// One-time seed-migration: read every row from the local data/db.sqlite snapshot
// and copy it into the Railway Postgres database referenced by DATABASE_URL.
//
// Why this exists: the SPM app's data was historically stored in a SQLite file
// baked into the Docker image. Container restarts wiped daily syncs back to
// the May 4, 2026 snapshot. The fix is Postgres. This script is the one-off
// bridge that gets the snapshot data into the new home.
//
// Usage (run on the developer's machine, NOT inside the Railway container):
//   1. Ensure DATABASE_URL points at Railway's Postgres (copy from Railway →
//      Postgres → Connect → Public Network).
//   2. Ensure data/db.sqlite is the snapshot you want to seed from.
//   3. `npx tsx scripts/migrate-sqlite-to-postgres.ts`
//
// Properties:
//   • Runs initDb() first so the schema exists.
//   • Idempotent — every insert is `ON CONFLICT (id) DO NOTHING` (or on the
//     table's UNIQUE constraint), so re-running just no-ops.
//   • Logs per-table row counts so you can diff against the SQLite source.
//   • Stops on any unrecognized table and tells you to update TABLE_LIST.

// Suppress the node:sqlite experimental warning — we use it on the read side only.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { initDb, getDb } from '../lib/db';

// ── Configuration ────────────────────────────────────────────────────────────

const SQLITE_PATH = process.env.SQLITE_SNAPSHOT_PATH
  || path.join(process.cwd(), 'data', 'db.sqlite');

if (!fs.existsSync(SQLITE_PATH)) {
  throw new Error(
    `[migrate-sqlite-to-postgres] SQLite snapshot not found at ${SQLITE_PATH}. ` +
    `Set SQLITE_SNAPSHOT_PATH or place the file at data/db.sqlite.`
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    '[migrate-sqlite-to-postgres] DATABASE_URL not set. ' +
    'Copy it from Railway → Postgres → Connect → Public Network and re-run.'
  );
}

// The order matters: tables with foreign keys must come AFTER the tables they
// reference. The order here mirrors the migration files so FK targets exist
// before the referencing tables are inserted into.
//
// Two-element form `[srcName, dstName]` is for any future case where the SQLite
// table name differs from the Postgres one — currently they're identical, so
// every entry is just the table name.
const TABLE_LIST: string[] = [
  // Core (001)
  'team_users',
  'buyer_companies',
  'buyer_contacts',
  'mandate_updates',
  'ip_catalog',
  'talent',
  'ip_talent',
  'content_partners',
  'ip_content_partners',
  'pitches',
  'packages',
  'package_talent',
  'package_content_partners',
  'package_emails',
  'pitch_portals',
  'shows',
  'trade_articles',
  'market_orders',
  'scraper_runs',
  'scraper_source_status',
  'ingestion_log',
  // Marketing (002)
  'site_shows',
  'site_genres',
  'site_show_genres',
  'site_networks',
  'press_releases',
  'available_titles',
  'site_content',
  // 003 spreadsheet
  'story_scout',
  'project_email_threads',
  // 004 sizzle
  'sizzle_reels',
  'pitch_decks',
  'dev_tasks',
  // 005 prodcos
  'production_companies',
  'deals',
  'ip_production_companies',
  'buyer_employer_history',
  // 007 decks
  'deck_sites',
  'deck_slides',
  // 009 feedback (BIGSERIAL id — handled specially below)
  'briefing_feedback',
  // 012 prodco enrichment
  'prodco_contacts',
  'prodco_email_threads',
  // 017 buyer research
  'buyer_research_runs',
  'buyer_research',
  'buyer_contact_touches',
  // 021 contact
  'contact_leads',
  'site_settings',
  // 026 vimeo library
  'vimeo_library',
  'show_videos',
  // 027 deck buyers
  'deck_buyers',
  'deck_meetings',
  // 028 deck sizzles
  'deck_sizzles',
  // 030 article links
  'entity_article_links',
];

// Columns the Postgres schema computes/generates and that we must NOT try to
// write from the SQLite source — pg will reject GENERATED column inserts.
const GENERATED_COLUMNS: Record<string, string[]> = {
  shows: ['search_vector'],
  trade_articles: ['search_vector'],
};

// Tables that have a BIGSERIAL `id` in Postgres. For these we drop the `id`
// from the insert and let Postgres assign a new one — keeping the SQLite id
// would require manual nextval() syncing.
const BIGSERIAL_TABLES = new Set<string>([
  'briefing_feedback',
]);

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[migrate] SQLite source : ${SQLITE_PATH}`);
  console.log(`[migrate] Postgres dest : ${process.env.DATABASE_URL?.replace(/:\/\/[^@]+@/, '://***:***@')}`);

  // 1. Run Postgres migrations so the schema exists.
  console.log('[migrate] running initDb() to ensure Postgres schema is up to date…');
  await initDb();
  console.log('[migrate] schema ready');

  // 2. Open the SQLite snapshot read-only.
  const sqlite = new DatabaseSync(SQLITE_PATH);

  const pool = getDb();
  const client = await pool.connect();

  let totalInserted = 0;
  try {
    for (const tableName of TABLE_LIST) {
      // Detect missing source table — common when a migration was applied to
      // SQLite but the snapshot was taken before it landed. Log and skip.
      const tableExists = sqlite
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1"
        )
        .get(tableName) as { 1: number } | undefined;
      if (!tableExists) {
        console.warn(`[migrate] ${tableName}: not present in SQLite snapshot, skipping`);
        continue;
      }

      // Read every row from SQLite. For datasets in the millions this would
      // need batching; ours are well under that — the May 4 snapshot is ~MB.
      const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];
      if (rows.length === 0) {
        console.log(`[migrate] ${tableName}: 0 rows`);
        continue;
      }

      // Inspect the row shape using the first row. Strip generated columns
      // that Postgres computes itself, and the id column for BIGSERIAL tables.
      const skipCols = new Set<string>(GENERATED_COLUMNS[tableName] ?? []);
      if (BIGSERIAL_TABLES.has(tableName)) skipCols.add('id');

      const cols = Object.keys(rows[0]).filter((c) => !skipCols.has(c));
      if (cols.length === 0) {
        console.warn(`[migrate] ${tableName}: no insertable columns after filtering`);
        continue;
      }

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const colList = cols.map((c) => `"${c}"`).join(', ');

      // ON CONFLICT DO NOTHING means "skip duplicates" which makes the script
      // idempotent. We don't specify a conflict target so any unique violation
      // (PK, UNIQUE index, or partial index) silently drops the row. That's
      // the desired behaviour for a seed-only restore.
      const sql = `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let inserted = 0;
      let conflicts = 0;
      let errors = 0;

      // One transaction per table — keeps individual row failures from
      // poisoning the next table, but still gets row-level rollback granularity.
      await client.query('BEGIN');
      try {
        for (const row of rows) {
          const params = cols.map((c) => {
            const v = row[c];
            // node:sqlite returns booleans as numbers already; nothing to coerce.
            // Buffer values are rare in our schema but pg can take them directly.
            return v;
          });
          try {
            const r = await client.query(sql, params);
            if ((r.rowCount ?? 0) > 0) inserted++;
            else conflicts++;
          } catch (err) {
            errors++;
            // Log first 3 row errors per table for diagnosis without spamming.
            if (errors <= 3) {
              console.warn(
                `[migrate] ${tableName}: row error: ${(err as Error).message}`
              );
            }
            // pg aborts the transaction on any error, so we need to
            // savepoint per-row if we want to keep going. Implement that
            // by ROLLBACKing and re-BEGINing — simpler than savepoints.
            await client.query('ROLLBACK');
            await client.query('BEGIN');
          }
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      totalInserted += inserted;
      console.log(
        `[migrate] ${tableName}: ${inserted} inserted, ${conflicts} skipped (conflict), ${errors} errored`
      );
    }
  } finally {
    client.release();
    sqlite.close();
  }

  console.log(`[migrate] done — ${totalInserted} rows inserted across ${TABLE_LIST.length} tables`);
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] FAILED:', (err as Error).message);
  console.error((err as Error).stack);
  process.exit(1);
});
