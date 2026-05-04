// db.ts — Postgres connection pool and query helpers for the standalone MCP server.
//
// Converts SQLite's synchronous query()/queryOne()/run() pattern to async/await
// with node-postgres. Parameter placeholders are $1, $2, $3 (not SQLite's ?).
//
// initDb() runs every migration file in mcp-server/migrations/ in filename order,
// tracking applied files in schema_migrations so re-deploys are safe.

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// ── Connection pool ───────────────────────────────────────────────────────────

// Railway injects DATABASE_URL automatically when a Postgres addon is attached.
// Locally, set DATABASE_URL in .env.
if (!process.env.DATABASE_URL) {
  throw new Error('[db] DATABASE_URL env var is required');
}

// Use a connection pool sized for a low-traffic service (max 10 concurrent).
// ssl: rejectUnauthorized=false works for Railway's managed Postgres over SSL.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  // Log pool-level errors without crashing — Railway will restart the process if needed
  console.error('[db] Pool error:', err.message);
});

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Execute a SELECT and return all matching rows as type T.
 * Params must use Postgres $1, $2, $3 placeholders.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

/**
 * Execute a SELECT and return the first row as type T, or undefined if no match.
 * Appends LIMIT 1 internally if not already present — safe to omit it in the SQL.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  // Only append LIMIT 1 if there's no existing LIMIT clause
  const normalized = sql.trimEnd().toUpperCase();
  const limitedSql = normalized.includes('LIMIT') ? sql : `${sql} LIMIT 1`;
  const { rows } = await pool.query(limitedSql, params);
  return rows[0] as T | undefined;
}

/**
 * Execute an INSERT, UPDATE, or DELETE.
 * Returns { changes, lastInsertRowid } to match the SQLite run() shape
 * so callers don't need to change their response handling.
 *
 * lastInsertRowid comes from a RETURNING id clause if you include one;
 * otherwise it's null (Postgres doesn't have a global last-insert-id concept).
 */
export async function run(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastInsertRowid: string | null }> {
  const result = await pool.query(sql, params);
  const lastInsertRowid = result.rows[0]?.id ?? null;
  return {
    changes: result.rowCount ?? 0,
    lastInsertRowid: lastInsertRowid ? String(lastInsertRowid) : null,
  };
}

// ── Migration runner ──────────────────────────────────────────────────────────

/**
 * Run all .sql migration files in mcp-server/migrations/ in alphabetical order.
 * Skips files already recorded in schema_migrations, so re-deploys are safe.
 *
 * Called once at server startup before the HTTP server begins accepting requests.
 */
export async function initDb(): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    // Create the migration tracker table first — this is the bootstrap step.
    // IF NOT EXISTS ensures this is idempotent even on a fresh DB.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Resolve migrations directory relative to this file (works in dist/ after build too)
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('[db] No migrations directory found — skipping migrations');
      return;
    }

    // Sort filenames so 001_ runs before 002_ etc.
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Fetch already-applied files in a single round-trip
    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[db] Migration already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`[db] Applying migration: ${file}`);

      // Wrap each migration in its own transaction so a failure doesn't leave
      // the schema in a half-applied state
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[db] Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`[db] Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    console.log('[db] All migrations up to date');
  } finally {
    client.release();
  }
}
