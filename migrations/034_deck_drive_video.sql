-- 034_deck_drive_video.sql
-- Decks now embed Google Drive videos instead of Vimeo. drive_file_id maps to a
-- file in the myentprod.com "Sizzle Reels" folder (set anyone-with-link reader).
-- vimeo_url stays as a legacy fallback for rows whose Drive backfill hasn't run.

ALTER TABLE deck_sites ADD COLUMN drive_file_id TEXT;
