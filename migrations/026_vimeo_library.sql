-- Vimeo library: all videos scraped from the MYE Vimeo account (myedevelopment@gmail.com)
-- One row per video; populated by scripts/scrape-vimeo-library.js
CREATE TABLE IF NOT EXISTS vimeo_library (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  clip_id      TEXT NOT NULL,            -- numeric Vimeo clip ID (e.g. '807745998')
  hash         TEXT,                     -- private hash for unlisted URLs (e.g. 'fc4c72d276')
  url          TEXT NOT NULL,            -- full shareable link
  title        TEXT NOT NULL,
  duration_sec INTEGER,                  -- seconds
  privacy      TEXT,                     -- unlisted | anybody | password | nobody
  has_password INTEGER NOT NULL DEFAULT 0,
  last_modified TEXT,                    -- ISO8601 from Vimeo API
  scraped_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clip_id)
);

-- show_videos: many-to-many between ip_catalog shows and vimeo_library videos
-- Allows multiple videos per show (sizzle + casting tape + rough cut, etc.)
-- and the same video to apply to multiple shows
CREATE TABLE IF NOT EXISTS show_videos (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ip_catalog_id   TEXT NOT NULL REFERENCES ip_catalog(id) ON DELETE CASCADE,
  vimeo_library_id TEXT NOT NULL REFERENCES vimeo_library(id) ON DELETE CASCADE,
  video_type      TEXT NOT NULL DEFAULT 'sizzle',  -- sizzle | casting_tape | interview | rough_cut | character_reel | other
  sort_order      INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ip_catalog_id, vimeo_library_id)
);

CREATE INDEX IF NOT EXISTS idx_show_videos_catalog ON show_videos(ip_catalog_id);
CREATE INDEX IF NOT EXISTS idx_show_videos_video   ON show_videos(vimeo_library_id);
CREATE INDEX IF NOT EXISTS idx_vimeo_library_clip  ON vimeo_library(clip_id);
