-- 033_vimeo_drive_backfill.sql
-- Adds Drive-mirror columns to vimeo_library so the backfill script
-- (scripts/backfill-vimeo-to-drive.js, runs on Bang) can track per-video
-- upload state and so the Vimeo Library page can show whether a video has
-- already been mirrored.
--
-- backfill_status values:
--   NULL       — not attempted
--   'pending'  — claimed by a worker; resume if older than the lock TTL
--   'done'     — upload complete; drive_file_id is set
--   'failed'   — see backfill_error for the reason

ALTER TABLE vimeo_library ADD COLUMN IF NOT EXISTS drive_file_id   TEXT;
ALTER TABLE vimeo_library ADD COLUMN IF NOT EXISTS drive_url       TEXT;
ALTER TABLE vimeo_library ADD COLUMN IF NOT EXISTS backfill_status TEXT;
ALTER TABLE vimeo_library ADD COLUMN IF NOT EXISTS backfilled_at   TEXT;
ALTER TABLE vimeo_library ADD COLUMN IF NOT EXISTS backfill_error  TEXT;
ALTER TABLE vimeo_library ADD COLUMN IF NOT EXISTS size_bytes      BIGINT;

CREATE INDEX IF NOT EXISTS idx_vimeo_library_backfill ON vimeo_library(backfill_status);
