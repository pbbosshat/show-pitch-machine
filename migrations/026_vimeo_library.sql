-- 026_vimeo_library.sql
-- Vimeo library: all videos scraped from the MYE Vimeo account.
-- One row per video; populated by scripts/scrape-vimeo-library.js
--
-- Postgres conversions:
--   • SQLite `lower(hex(randomblob(16)))` default → Postgres `gen_random_uuid()::text`
--     which produces a 36-char UUID string. Existing rows seeded by the scraper
--     use the SQLite hex format (32 chars no dashes); both forms coexist fine
--     because the column is TEXT.
--   • `datetime('now')` default → `to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')` so
--     downstream code that reads the column as a string keeps working.
--   • `gen_random_uuid()` is built-in since Postgres 13. Railway provisions PG
--     14+, so no `CREATE EXTENSION pgcrypto` is required.

CREATE TABLE IF NOT EXISTS vimeo_library (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clip_id       TEXT NOT NULL,
  hash          TEXT,
  url           TEXT NOT NULL,
  title         TEXT NOT NULL,
  duration_sec  INTEGER,
  privacy       TEXT,
  has_password  INTEGER NOT NULL DEFAULT 0,
  last_modified TEXT,
  scraped_at    TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  UNIQUE(clip_id)
);

-- show_videos: many-to-many between ip_catalog shows and vimeo_library videos.
CREATE TABLE IF NOT EXISTS show_videos (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ip_catalog_id    TEXT NOT NULL REFERENCES ip_catalog(id) ON DELETE CASCADE,
  vimeo_library_id TEXT NOT NULL REFERENCES vimeo_library(id) ON DELETE CASCADE,
  video_type       TEXT NOT NULL DEFAULT 'sizzle',  -- sizzle | casting_tape | interview | rough_cut | character_reel | other
  sort_order       INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  UNIQUE(ip_catalog_id, vimeo_library_id)
);

CREATE INDEX IF NOT EXISTS idx_show_videos_catalog ON show_videos(ip_catalog_id);
CREATE INDEX IF NOT EXISTS idx_show_videos_video   ON show_videos(vimeo_library_id);
CREATE INDEX IF NOT EXISTS idx_vimeo_library_clip  ON vimeo_library(clip_id);
