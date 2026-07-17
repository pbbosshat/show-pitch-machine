# Postgres migration — Wave 1 Phase 1A foundation

This is the contract that lets every API route in `app/` switch from node:sqlite
to Railway Postgres without renaming a single function.

## Why

The Railway `app` service ran Next.js with `lib/db.ts` opening `node:sqlite`
against `process.cwd() + '/data/db.sqlite'`. The file was baked into the Docker
image at build time and lived on the container's ephemeral filesystem — no
volume mount, no persistence. Every container restart silently destroyed every
daily Bang sync and reverted the DB to the May 4 seed snapshot.

The Railway Postgres add-on is already attached to the `app` service via
`DATABASE_URL=${{Postgres.DATABASE_URL}}` (see `RAILWAY_SETUP.md`), and the
MCP server has been talking to it successfully since launch. We just never
wired up the Next.js side.

## What changed in Phase 1A

| File | Change |
|---|---|
| `lib/db.ts` | Rewritten on top of `pg` (node-postgres). Helpers are now async. `?` placeholders still work — translated internally to `$1, $2, …`. |
| `migrations/*.sql` (all 34) | Ported in place from SQLite to Postgres syntax. Filename history preserved so `schema_migrations` tracking still works on a fresh DB. |
| `scripts/migrate-sqlite-to-postgres.ts` | New one-time script: reads `data/db.sqlite` and copies all rows into Postgres. Idempotent. |
| `Dockerfile` | Removed `NODE_OPTIONS=--experimental-sqlite` (no longer needed). |
| `package.json` | Added `pg` runtime dep, `@types/pg` dev dep, `migrate:sqlite-to-postgres` npm script. |

## The `lib/db.ts` contract (for Phase 1B agents)

### Function signatures

| Function | Old (sync) | New (async) |
|---|---|---|
| `getDb()` | `DatabaseSync` | `Pool` |
| `query<T>(sql, params)` | `T[]` | `Promise<T[]>` |
| `queryOne<T>(sql, params)` | `T \| undefined` | `Promise<T \| undefined>` |
| `run(sql, params)` | `{ changes, lastInsertRowid }` | `Promise<{ changes, lastInsertRowid }>` |
| `initDb()` | `void` | `Promise<void>` |

Every caller MUST `await` these helpers. The async/sync boundary is the single
biggest behavioural change — TypeScript will catch most mistakes (the return
type now becomes `Promise<…>`), but a few patterns slip through:

- `const rows = query(…)` followed by `rows.length` → now type-errors at
  `.length` on a `Promise<…>`. Add `await`.
- `for (const row of query(…))` → now type-errors. Add `await`.
- `if (queryOne(…))` → previously truthy on a row, now truthy on the promise.
  **Most insidious failure** — always `await` first.

### Placeholder syntax

The translator inside `query` / `queryOne` / `run` rewrites every `?` outside
single-/double-quoted strings to Postgres `$1, $2, …` positionally.

So this still works unchanged:

```ts
const rows = await query<Buyer>(
  'SELECT * FROM buyer_contacts WHERE region = ? AND is_former = ?',
  ['us', 0]
);
```

Limits:

- `?` inside `'…?…'` or `"…?…"` is preserved verbatim. None of our SQL uses
  this pattern, but if a future caller embeds a literal `?` in a string
  literal, document it inline.
- SQLite numeric placeholders (`?1`, `?2`) are NOT supported. We never used
  them in this codebase.
- The translator does NOT strip SQL comments. A `?` inside a `-- …` or
  `/* … */` comment would be incorrectly counted. We don't currently have
  any `?` in comments.

### `lastInsertRowid` limitation

Postgres has no implicit last-insert-id concept. The new `run()` returns:

```ts
{ changes: number, lastInsertRowid: number | bigint }
```

- `changes` always works (`result.rowCount ?? 0`).
- `lastInsertRowid` is populated only when the SQL includes `RETURNING id`.
  For BIGSERIAL ids it comes back as `bigint`. For TEXT/UUID ids it stays `0`
  — read it from `queryOne` instead.

Phase 1B pattern for INSERTs that need the new id:

```ts
const row = await queryOne<{ id: string }>(
  `INSERT INTO packages (id, name, …) VALUES (?, ?, …) RETURNING id`,
  [packageId, name, …]
);
const newId = row?.id;
```

### Connection lifecycle

The Pool is a module-level singleton created lazily on the first call. It is
NOT created at import time, so `npm run build` (which doesn't have
`DATABASE_URL` set) won't crash on import.

If `DATABASE_URL` is missing at call time, the first call to any helper throws:

```
[db] DATABASE_URL env var is not set.
On Railway: bind the Postgres plugin via `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
Locally: copy the connection string from Railway → Postgres → Connect, …
```

That message includes the exact env var name and the fix. Don't wrap it.

### SSL behaviour

`ssl: { rejectUnauthorized: false }` is enabled when any of:

- `NODE_ENV === 'production'`
- The connection string contains `sslmode=require`
- The connection string contains `.railway.app` or `.proxy.rlwy.net`

Otherwise SSL is off (for local Postgres in dev).

## SQL portability the translator does NOT fix

Phase 1B must rewrite these patterns in each route as they're touched:

| SQLite | Postgres |
|---|---|
| `INSERT OR IGNORE` | `INSERT … ON CONFLICT DO NOTHING` |
| `INSERT OR REPLACE` | `INSERT … ON CONFLICT (cols) DO UPDATE SET …` |
| `datetime('now')` | `NOW()` |
| `unixepoch()` | `EXTRACT(EPOCH FROM NOW())::INTEGER` |
| `unixepoch() * 1000` | `(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT` |
| `strftime('%s','now')` | `EXTRACT(EPOCH FROM NOW())::INTEGER` |
| `randomblob(N)` / `hex(...)` | `gen_random_uuid()::text` or generate the ID in JS |
| `shows_fts MATCH ?` | `search_vector @@ plainto_tsquery('english', ?)` |
| `SELECT … FROM shows JOIN shows_fts ON shows_fts.rowid = shows.rowid` | Drop the join — `search_vector` is a column on `shows` now |
| `SELECT rowid FROM …` | No `rowid` in Postgres — use `id` or whatever column the table actually has |
| Booleans as `0`/`1` in WHERE clauses | Still work; columns are still `INTEGER`. Don't switch to `true`/`false` until a future schema migration changes the type. |
| `db.exec(...)` / `db.prepare(...).run(...)` direct on the `DatabaseSync` | Rewrite to `query` / `queryOne` / `run`. The pg `Pool` exposes `pool.query()` but it takes `$1` placeholders directly. |

SQL features that DO work the same in both engines and don't need rewriting:
`SUBSTR`, `COALESCE`, `LOWER`/`UPPER`, `LIKE`, `BETWEEN`, `COUNT/SUM/AVG`,
`GROUP BY`, `ORDER BY`, `LIMIT`/`OFFSET`, `WITH` (CTEs), `CASE WHEN`.

## Seed migration runbook

Run this once after deploying the new code to Railway, from a developer machine
with the SQLite snapshot at `data/db.sqlite` and access to the production DB:

```bash
# 1. Get the public Postgres URL from Railway:
#    Railway → show-pitch-machine → Postgres → Connect → Public Network
export DATABASE_URL='postgresql://postgres:<pw>@<host>.proxy.rlwy.net:<port>/railway'

# 2. Confirm the snapshot is what you expect
ls -lh data/db.sqlite

# 3. Run the migration
npm run migrate:sqlite-to-postgres
```

The script:

1. Calls `initDb()` first, which applies every `migrations/*.sql` file that
   hasn't been applied yet.
2. Iterates through `TABLE_LIST` in dependency order.
3. For each table, copies every row with `INSERT … ON CONFLICT DO NOTHING`.
4. Reports per-table counts: `inserted / skipped (conflict) / errored`.

It is safe to re-run — already-inserted rows are silently skipped.

## Rollback plan

If the Postgres migration causes problems in production:

- **Short-term tourniquet (no code change):** Add a Railway volume mount at
  `/app/data` to the `app` service, redeploy, and the old SQLite code path
  becomes persistent until cutover. **Note:** this only works on a git revert
  of Phase 1A — once any deploy includes the new `lib/db.ts`, SQLite is gone.
- **Code-side rollback:** Revert the Phase 1A commit. The MCP server (which
  is on its own service and was already on Postgres) is unaffected — it never
  touched `lib/db.ts`.

## Environment variables required

| Var | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` | Railway `app` service env | Already set to `${{Postgres.DATABASE_URL}}` per `RAILWAY_SETUP.md`. |
| `SQLITE_SNAPSHOT_PATH` | Local shell for the seed migration | Optional; defaults to `data/db.sqlite`. |
| `NODE_ENV=production` | Railway `app` service env | Already set; triggers SSL on the pg pool. |

## Out of scope for Phase 1A

These are explicit non-goals — Phase 1B owns them:

- Rewriting any `app/api/**/route.ts` to add `await` to db calls.
- Fixing the counter bug at `app/api/ingest/articles/route.ts:113`.
- Migrating `lib/auth.ts` (`getDb().exec(...)` calls).
- Migrating `lib/mcp/tools/shows.ts` (FTS5 MATCH queries).
- Migrating any `scripts/*.ts` that runs on Bang (those stay SQLite by design).

---

## Incident: /available/[slug] returned HTTP 500 — migration 042 (2026-07-17)

### What broke

Every request to `/available/[slug]` returned HTTP 500. The catalog page
(`/available`) silently rendered empty (HTTP 200, no titles shown). Both pages
SELECTed these columns from `deck_sites`:

```
image_url, vimeo_url, description, rights_type, markets,
seasons, episode_count, runtime_mins, contact_email, sort_order
```

None of those columns existed in `deck_sites`. Postgres threw:

```
ERROR: column "image_url" does not exist
```

### Root cause

Migration 002 added equivalent columns to `available_titles` but no migration
ever added them to `deck_sites`. When the public pages were later built to
query `deck_sites`, the schema gap was never caught because:

- The list page (`app/(public)/available/page.tsx`) had a bare `catch {}`
  that swallowed the Postgres error silently — the catalog appeared empty.
- The detail page (`app/(public)/available/[slug]/page.tsx`) had no try/catch
  at all — the Postgres error propagated as an unhandled rejection → HTTP 500.

### Fix

**`migrations/042_deck_sites_public_fields.sql`** — adds all 10 missing columns
using `ADD COLUMN IF NOT EXISTS` so the migration is idempotent (safe whether
the columns already exist in prod from a manual hotfix or not).

**`app/(public)/available/[slug]/page.tsx`** — `fetchRow()` now wraps the DB
call in try/catch with `console.error` logging, then re-throws so Next.js
still emits the 500 (rather than silently returning `null` and triggering a
confusing 404). Future schema gaps will appear in Railway logs with the slug.

**`app/(public)/available/page.tsx`** — `getTitles()` changes `catch {}` to
`catch (err) { console.error(...); return []; }` so schema errors surface in
Railway logs instead of silently producing an empty catalog.

### Deploy note

Railway calls `initDb()` at boot, which runs every `migrations/*.sql` file not
yet recorded in `schema_migrations`. Migration 042 therefore applies
automatically on the next deploy — no manual SQL needed.

**After merge:** confirm Railway shows the correct commit SHA before calling
it resolved. Railway can silently build an ancestor commit when a new push
arrives mid-build — verify the deployed commit == `master` tip.
