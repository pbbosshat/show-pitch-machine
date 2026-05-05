// Database singleton using Node 24's built-in node:sqlite — no native addon required.
// node:sqlite is synchronous-only; all calls block. This is intentional — Next.js API
// routes and scripts are already async-wrapped, and sync SQLite avoids callback hell
// on a single-user local tool.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Resolve DB path from env so CI / tests can point at :memory: without editing code
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');

let _db: DatabaseSync | null = null;

// Lazy singleton — first caller pays the file-open cost; subsequent calls are free
export function getDb(): DatabaseSync {
  if (_db) return _db;

  // Ensure the data directory exists before SQLite tries to create the file
  const dir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new DatabaseSync(DATABASE_PATH);

  // WAL mode dramatically improves concurrent read performance for dashboard queries
  _db.exec('PRAGMA journal_mode = WAL;');
  // Retry for up to 10s when another connection holds the write lock (e.g. Next.js
  // build runs 31 parallel workers that all open the DB simultaneously).
  _db.exec('PRAGMA busy_timeout = 10000;');
  // Foreign key enforcement is off by default in SQLite — turn it on for referential safety
  _db.exec('PRAGMA foreign_keys = ON;');

  return _db;
}

// Run all *.sql files in /migrations in alphabetical order (001, 002, ...).
// Tracks applied migrations in schema_migrations so ALTER TABLE statements
// in later migrations don't fail when initDb() is called multiple times.
export function initDb(): void {
  const db = getDb();

  // Bootstrap the tracking table on first ever run
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  );`);

  const applied = new Set(
    (db.prepare('SELECT filename FROM schema_migrations').all() as { filename: string }[])
      .map(r => r.filename)
  );

  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue; // already applied — skip
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
  }
}

// Convenience wrapper: run a SELECT and return typed rows without manual casting
export function query<T>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  // node:sqlite uses positional binding with array; stmt.all() returns plain objects
  return stmt.all(...params) as T[];
}

// Single-row variant — returns undefined instead of throwing when no match found
export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

// DML wrapper — returns changes/lastInsertRowid in a consistent shape
export function run(
  sql: string,
  params: unknown[] = []
): { changes: number; lastInsertRowid: number | bigint } {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
}
