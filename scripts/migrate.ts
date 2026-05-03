// Migration runner — reads 001_schema.sql and executes it against the SQLite database.
// Safe to run repeatedly because all DDL uses CREATE IF NOT EXISTS.
// Run via: npx tsx scripts/migrate.ts

// Suppress the node:sqlite experimental warning — it's stable enough for our use case
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
const MIGRATION_PATH = path.join(process.cwd(), 'migrations', '001_schema.sql');

// Ensure data directory exists before SQLite tries to create the file
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory: ${dataDir}`);
}

if (!fs.existsSync(MIGRATION_PATH)) {
  throw new Error(`Migration file not found: ${MIGRATION_PATH}`);
}

const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

const db = new DatabaseSync(DATABASE_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(sql);

// Count tables to confirm the migration applied — virtual tables (fts5) count too
const tables = db.prepare(
  "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type IN ('table')"
).get() as { cnt: number };

console.log(`Migration complete — ${tables.cnt} tables in ${DATABASE_PATH}`);

db.close();
