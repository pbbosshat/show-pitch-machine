-- 028_deck_sizzles.sql
-- Adds sizzle reel storage per deck and a theme_color field on deck_sites.

CREATE TABLE IF NOT EXISTS deck_sizzles (
  id         TEXT    PRIMARY KEY,
  deck_id    TEXT    NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,
  vimeo_url  TEXT    NOT NULL,
  title      TEXT,
  password   TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_deck_sizzles_deck ON deck_sizzles(deck_id);

ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS theme_color TEXT;
