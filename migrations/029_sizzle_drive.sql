-- 029_sizzle_drive.sql
-- Adds drive_file_id to sizzle_reels so the Drive API can be called
-- directly to manage/delete/re-share without parsing the shareable URL.

ALTER TABLE sizzle_reels ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
