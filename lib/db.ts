// Database singleton — Railway Postgres via node-postgres (pg).
//
// History: the app shipped on node:sqlite with a single file under data/db.sqlite.
// That file was baked into the Docker image at build time and lived on the container's
// ephemeral disk, so every Railway redeploy wiped daily Bang syncs back to the May 4
// seed snapshot. The fix is Postgres — the Railway addon is already provisioned and
// the MCP server has been talking to it successfully since launch.
//
// ── Contract for callers (read this before writing query code) ───────────────
// • Every helper is ASYNC. The pg driver has no sync API. Each call site MUST `await`.
// • SQL placeholders use `?` exactly like the old node:sqlite API. This module
//   rewrites them to Postgres-native `$1, $2, …` positionally inside the helpers.
//   Callers can keep their existing `?` placeholders unchanged.
// • `run()` returns `{ changes, lastInsertRowid }`. `lastInsertRowid` is only
//   populated when the caller's SQL includes `RETURNING id` (Postgres has no
//   implicit last-insert-id concept). Otherwise it is 0.
// • `getDb()` still exists and returns the underlying `pg.Pool`. Callers that
//   used `db.prepare(...)` against node:sqlite must be rewritten to use `query`,
//   `queryOne`, or `run` instead — there is no sync prepared-statement API.
//
// ── SQL portability the translator does NOT fix (Phase 1B must rewrite) ──────
// • `INSERT OR IGNORE`        → `INSERT … ON CONFLICT DO NOTHING`
// • `INSERT OR REPLACE`       → `INSERT … ON CONFLICT (cols) DO UPDATE SET …`
// • `datetime('now')`         → `NOW()`
// • `unixepoch()`             → `EXTRACT(EPOCH FROM NOW())::INTEGER`
// • `unixepoch() * 1000`      → `(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`
// • `strftime('%s','now')`    → `EXTRACT(EPOCH FROM NOW())::INTEGER`
// • `randomblob(N)` / `hex()` → use `gen_random_uuid()` or generate IDs in JS
// • FTS5 `MATCH`              → `search_vector @@ plainto_tsquery('english', ?)`
// • SQLite `rowid`            → no equivalent; join on `id` instead
// • Boolean coercion: 0/1 INTEGER columns stay numeric — pg returns numbers,
//   not booleans, for those columns by design (we kept the type as INTEGER).

import { Pool, type QueryResult } from 'pg';

// ── Connection pool (lazy singleton) ─────────────────────────────────────────

// Module-level holder. Created on first call so import-time side effects don't
// crash the Next.js build when DATABASE_URL isn't set (e.g. during `npm run build`).
let _pool: Pool | null = null;

/**
 * Returns the singleton pg Pool, creating it on first call.
 *
 * Throws if `DATABASE_URL` is missing — every Railway env should set it via
 * `${{Postgres.DATABASE_URL}}`. Local dev: copy DATABASE_URL from Railway or
 * point at a local Postgres.
 *
 * Exported because a handful of callsites (auth bootstrap, dev tooling) used
 * to call the old `getDb()` directly. Most code should go through query/
 * queryOne/run instead — those carry the `?` → `$N` placeholder translation.
 */
export function getDb(): Pool {
  if (_pool) return _pool;

  // Surface a precise error: name the env var and tell the operator how to fix it.
  // Generic "DB not connected" messages waste hours in Railway logs.
  if (!process.env.DATABASE_URL) {
    throw new Error(
      '[db] DATABASE_URL env var is not set. ' +
      'On Railway: bind the Postgres plugin via `DATABASE_URL=${{Postgres.DATABASE_URL}}`. ' +
      'Locally: copy the connection string from Railway → Postgres → Connect, or run a local Postgres.'
    );
  }

  // SSL handling: Railway-internal Postgres URLs use TLS but with a self-signed
  // certificate, so rejectUnauthorized must be false. In dev, callers may point
  // at a non-TLS local Postgres — keep ssl off there to avoid handshake errors.
  // Heuristic: NODE_ENV=production OR the connection string explicitly says sslmode=require.
  const url = process.env.DATABASE_URL;
  const useSsl =
    process.env.NODE_ENV === 'production' ||
    /sslmode=require/i.test(url) ||
    /\.railway\.app/i.test(url) ||
    /\.proxy\.rlwy\.net/i.test(url);

  _pool = new Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    // 10 is plenty for a single-user internal tool. Bumping it doesn't help
    // throughput — Postgres connections are expensive — and Railway's plan
    // has a connection cap.
    max: 10,
    // Idle clients can sit around for 30s before the pool kills them. Lower
    // would churn connections; higher wastes Railway slots while idle.
    idleTimeoutMillis: 30_000,
    // 5s is enough on healthy Railway-internal networking; if it takes longer
    // the network is broken and we want to fail loud, not hang the request.
    connectionTimeoutMillis: 5_000,
  });

  // Pool-level errors (e.g. idle client disconnected) shouldn't crash the
  // Next.js process — Railway will restart on hard exits but transient pool
  // errors are usually recoverable on the next query.
  _pool.on('error', (err) => {
    console.error('[db] pg pool error:', err.message);
  });

  return _pool;
}

// ── Placeholder translator ───────────────────────────────────────────────────

// Why this exists: the SQLite version of this module used `?` for every binding,
// and there are hundreds of call sites across `app/`, `lib/`, and `scripts/`.
// Forcing every call site to switch to `$1, $2, …` simultaneously would be a
// huge diff and a huge merge-conflict surface. Translating inside the helpers
// keeps the surface of Phase 1A small and lets Phase 1B touch routes one at a time.
//
// Limits (document these in postgres-migration.md too):
//   • Only literal `?` outside single-quoted string literals is rewritten.
//     A `?` inside `'…?…'` is preserved verbatim.
//   • Does NOT handle SQLite-style numeric placeholders (`?1`, `?2`) — we never
//     used them in this codebase.
//   • Does NOT handle PostgreSQL's `?` JSON operators (e.g. `jsonb ? key`).
//     We don't use them currently. If we adopt JSONB ops later, escape with
//     a literal `$1`-style placeholder instead and stop using `?` for binding
//     in that statement.
//   • Comments `--` and `/* … */` are NOT stripped — they could in theory
//     contain `?` and would get rewritten. None of our SQL has `?` in comments.
function translatePlaceholders(sql: string): string {
  let out = '';
  let i = 0;
  let counter = 0;
  let inSingle = false; // inside '...'
  let inDouble = false; // inside "..."  (identifier quoting — uncommon, but support)

  while (i < sql.length) {
    const ch = sql[i];

    // Toggle quote state. SQL escapes a quote by doubling it ('' or ""),
    // which our toggle handles correctly: hitting the second quote flips
    // state back to "inside the string", and the third quote flips out again.
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      out += ch;
      i++;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      out += ch;
      i++;
      continue;
    }

    // Only rewrite `?` when we're outside any quoted region.
    if (ch === '?' && !inSingle && !inDouble) {
      counter++;
      out += '$' + counter;
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

// ── Query helpers (the public API) ───────────────────────────────────────────

/**
 * Execute a SELECT and return all matching rows.
 *
 * Placeholders are `?` (translated internally to `$1, $2, …`).
 * Returns rows in their natural Postgres-driver shape — column names are
 * lowercased unless the SQL quoted them.
 *
 * @example
 *   const rows = await query<{ id: string; name: string }>(
 *     'SELECT id, name FROM buyer_contacts WHERE region = ? ORDER BY name',
 *     ['us']
 *   );
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getDb();
  const translated = translatePlaceholders(sql);
  const result: QueryResult = await pool.query(translated, params as unknown[]);
  return result.rows as T[];
}

/**
 * Execute a SELECT and return the first matching row, or `undefined` if none.
 *
 * Does NOT auto-append `LIMIT 1`. The old SQLite helper didn't either, and
 * silently appending breaks SQL that already has `LIMIT … OFFSET …` or that
 * needs `ORDER BY` evaluated against the full result set. Add `LIMIT 1` in
 * the caller's SQL when you want it.
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const pool = getDb();
  const translated = translatePlaceholders(sql);
  const result: QueryResult = await pool.query(translated, params as unknown[]);
  return result.rows[0] as T | undefined;
}

/**
 * Execute an INSERT, UPDATE, or DELETE.
 *
 * Returns `{ changes, lastInsertRowid }` — the same shape the old SQLite helper
 * returned, so call sites don't need to change their result handling.
 *
 *   changes          = `result.rowCount` (number of rows affected by the DML).
 *   lastInsertRowid  = the `id` column from `RETURNING id`, if the SQL had it.
 *                      Otherwise `0`. Postgres has no implicit last-insert-id.
 *
 * Limitation: if your INSERT relies on the returned ID and the table's primary
 * key column isn't named `id`, append `RETURNING <pk_col> AS id` so the helper
 * can find it. We use `id` as the PK column name everywhere in this schema.
 */
export async function run(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
  const pool = getDb();
  const translated = translatePlaceholders(sql);
  const result: QueryResult = await pool.query(translated, params as unknown[]);

  // changes: rowCount can be null for statements that don't affect rows
  // (e.g. some DDL) — surface 0 so callers can do `if (result.changes > 0)`.
  const changes = result.rowCount ?? 0;

  // lastInsertRowid: pull the `id` column from the first returned row, if any.
  // Most of our tables use TEXT/UUID ids, so the value is a string — but the
  // helper signature promises number | bigint to match the old node:sqlite API.
  // We coerce a numeric-looking string to a Number; otherwise we hand back 0
  // and the caller can re-fetch via `RETURNING id` directly when they need it.
  const idValue = (result.rows[0] as { id?: unknown } | undefined)?.id;
  let lastInsertRowid: number | bigint = 0;
  if (typeof idValue === 'number' || typeof idValue === 'bigint') {
    lastInsertRowid = idValue;
  } else if (typeof idValue === 'string' && /^\d+$/.test(idValue)) {
    // BIGSERIAL ids come back as strings — keep them as bigint to avoid lossy
    // conversion on 53-bit-overflowing values.
    lastInsertRowid = BigInt(idValue);
  }
  // For TEXT/UUID ids we intentionally leave lastInsertRowid = 0. The caller
  // should read the id from `RETURNING id` via `queryOne` instead.

  return { changes, lastInsertRowid };
}

// ── Migration runner ─────────────────────────────────────────────────────────

/**
 * Run every `.sql` file under `migrations/` in alphabetical (filename) order,
 * tracking applied files in `schema_migrations` so re-deploys skip the ones
 * already executed.
 *
 * Each migration runs inside its own transaction. A failed migration rolls back
 * cleanly and re-throws — Railway's restart policy will retry the container,
 * which gives the operator a chance to patch the SQL and redeploy.
 *
 * Called from `instrumentation.ts` at server boot, BEFORE the HTTP listener
 * accepts traffic. Must be `await`ed by every caller.
 */
export async function initDb(): Promise<void> {
  const pool = getDb();

  // We need a single connection (not the pool's auto-checkout) so that BEGIN/
  // COMMIT/ROLLBACK reliably target the same session — pool.query() can route
  // sequential calls to different physical connections.
  const client = await pool.connect();

  try {
    // Bootstrap: ensure the migration tracker table itself exists. Idempotent.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Resolve the migrations dir relative to process.cwd() because the Next.js
    // server runs from the project root and that's where Dockerfile copies it.
    // Importing fs/path lazily keeps them out of the edge runtime if the file
    // is ever inadvertently bundled there.
    const fs = await import('node:fs');
    const path = await import('node:path');
    const migrationsDir = path.join(process.cwd(), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      // Not fatal — a stripped image (e.g. a future split build) might have no
      // migrations alongside the binary. Log loudly and continue; healthcheck
      // failure will surface the real problem.
      console.warn('[db] migrations directory not found:', migrationsDir);
      return;
    }

    // Find applied migrations in a single round-trip rather than checking each.
    const { rows: appliedRows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue; // already done — skip

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`[db] applying migration: ${file}`);

      // Wrap each migration in its own transaction so a syntax error or FK
      // violation leaves the DB in a clean pre-migration state. WITHOUT this,
      // partial application of a 300-line file is very painful to undo.
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[db] migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        // Re-throw with the filename so the operator sees which migration broke
        // in Railway's logs without grepping pg error positions.
        throw new Error(
          `[db] migration ${file} failed: ${(err as Error).message}`
        );
      }
    }
  } finally {
    // Always return the connection to the pool, even on throw.
    client.release();
  }
}
