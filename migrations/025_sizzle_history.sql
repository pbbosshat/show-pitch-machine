-- 025_sizzle_history.sql
-- Adds a sizzle_history column to deck_sites to track all past and present
-- sizzle reel URLs. Stored as a JSON array of {url, added_at} objects.
-- The active URL continues to live in vimeo_url; this column is purely historical.

ALTER TABLE deck_sites ADD COLUMN sizzle_history TEXT;
