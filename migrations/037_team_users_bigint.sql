-- 037_team_users_bigint.sql
-- Migration 035_int_to_bigint widened most ms-epoch timestamp columns to BIGINT,
-- but missed team_users.updated_at, team_users.password_reset_expires,
-- team_users.invite_expires, and the sessions table — all of which store
-- `Date.now()` (~1.78T in 2026, well past INTEGER's 2.1B max).
--
-- Symptom on the live DB: any INSERT/UPDATE that wrote one of these fields
-- failed with "integer out of range". This blocked seeding team_users and any
-- session create after a 32-bit-overflow boundary. Live Railway Postgres was
-- patched manually on 2026-05-14; this file captures the change so fresh DBs
-- don't relapse.
--
-- REWRITTEN 2026-08-18 — the original version of this file crash-looped FRESH
-- databases. It assumed the columns and the sessions table already existed, but
-- none of them are created by any migration: lib/auth.ts adds the auth columns
-- and creates sessions lazily at RUNTIME, and migrations run at boot before any
-- runtime code. So against a fresh DB, bare `ALTER COLUMN` here failed with
-- 'column "updated_at" does not exist', the transaction rolled back, and the
-- container restart-looped. The live DB never hit this because its columns
-- predate this file; schema_migrations also records this file as applied there,
-- so this rewrite never re-runs in production — it exists purely so a
-- from-scratch rebuild (new environment, disaster recovery, local dev) works.
--
-- Strategy: create everything this migration touches if absent — as BIGINT —
-- then widen to BIGINT unconditionally. Both halves are idempotent, so the file
-- is safe on a fresh DB (create runs, alter is a no-op), on a pre-037 live DB
-- (create skips, alter widens INTEGER→BIGINT), and on a re-run (both no-op).

-- team_users auth columns (mirrors the lazy-create list in lib/auth.ts, which
-- skips them once they exist).
ALTER TABLE team_users ADD COLUMN IF NOT EXISTS password_hash          TEXT;
ALTER TABLE team_users ADD COLUMN IF NOT EXISTS updated_at             BIGINT;
ALTER TABLE team_users ADD COLUMN IF NOT EXISTS password_reset_token   TEXT;
ALTER TABLE team_users ADD COLUMN IF NOT EXISTS password_reset_expires BIGINT;
ALTER TABLE team_users ADD COLUMN IF NOT EXISTS invite_token           TEXT;
ALTER TABLE team_users ADD COLUMN IF NOT EXISTS invite_expires         BIGINT;

-- sessions (mirrors lib/auth.ts's lazy CREATE, but BIGINT from the start).
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES team_users(id) ON DELETE CASCADE
);

-- The original intent of this migration: widen to BIGINT. No-ops when the
-- column is already BIGINT (fresh DBs via the statements above).
ALTER TABLE team_users ALTER COLUMN updated_at             TYPE BIGINT;
ALTER TABLE team_users ALTER COLUMN password_reset_expires TYPE BIGINT;
ALTER TABLE team_users ALTER COLUMN invite_expires         TYPE BIGINT;
ALTER TABLE sessions   ALTER COLUMN created_at             TYPE BIGINT;
ALTER TABLE sessions   ALTER COLUMN expires_at             TYPE BIGINT;
