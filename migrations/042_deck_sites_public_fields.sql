-- 042_deck_sites_public_fields.sql
-- WHY: The public /available/[slug] one-sheet pages (and the /available catalog)
-- SELECT these columns from deck_sites, but no migration ever added them to the
-- table (the equivalent columns live in available_titles per migration 002).
--
-- Symptom before this fix:
--   • /available        → 200 (empty catalog, error swallowed in getTitles try/catch)
--   • /available/[slug] → 500 (Postgres throws "column does not exist", no try/catch)
--
-- All ADD COLUMN IF NOT EXISTS — safe whether columns already exist (manually applied
-- in production) or not (fresh Railway DB).

ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS image_url       TEXT;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS vimeo_url       TEXT;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS rights_type     TEXT;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS markets         TEXT;    -- JSON array e.g. '["Europe","Asia"]'
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS seasons         INTEGER;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS episode_count   INTEGER;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS runtime_mins    INTEGER;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS contact_email   TEXT     DEFAULT 'info@myentertainment.tv';
-- ADD COLUMN IF NOT EXISTS is a no-op when the column was manually hotfixed without
-- a DEFAULT. These ensure the default is set for future inserts and existing NULLs backfilled.
ALTER TABLE deck_sites ALTER COLUMN contact_email SET DEFAULT 'info@myentertainment.tv';
UPDATE deck_sites SET contact_email = 'info@myentertainment.tv' WHERE contact_email IS NULL;
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS sort_order      INTEGER  DEFAULT 0;
