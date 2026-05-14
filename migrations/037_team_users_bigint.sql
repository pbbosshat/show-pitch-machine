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

ALTER TABLE team_users ALTER COLUMN updated_at             TYPE BIGINT;
ALTER TABLE team_users ALTER COLUMN password_reset_expires TYPE BIGINT;
ALTER TABLE team_users ALTER COLUMN invite_expires         TYPE BIGINT;
ALTER TABLE sessions   ALTER COLUMN created_at             TYPE BIGINT;
ALTER TABLE sessions   ALTER COLUMN expires_at             TYPE BIGINT;
