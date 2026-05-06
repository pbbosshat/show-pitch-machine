-- migrations/029_sizzle_drive.sql
-- Adds drive_file_id to sizzle_reels so the Drive API can be called
-- directly to manage/delete/re-share without parsing the shareable URL.
-- vimeo_url continues to hold any video URL regardless of platform.

ALTER TABLE sizzle_reels ADD COLUMN drive_file_id TEXT;
