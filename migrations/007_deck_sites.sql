-- 007_deck_sites.sql
-- deck_sites: one row per imported pitch deck, tracks metadata + publication state.
-- deck_slides: one row per captured slide image, with AI-generated copy and image fields.
--
-- Postgres conversion: trivial — only types kept. No SQLite-specific syntax was used.

CREATE TABLE IF NOT EXISTS deck_sites (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,         -- URL slug e.g. "gotta-catch-em-all"
  title           TEXT NOT NULL,
  subtitle        TEXT,                         -- Tagline or format description
  logline         TEXT,                         -- One-line pitch
  canva_url       TEXT,                         -- Source Canva URL
  genre           TEXT,
  format          TEXT,                         -- "4-Part Investigation", "Documentary Series" etc
  ep_count        TEXT,                         -- "8 Episodes", "6 x 60 min" etc
  network_target  TEXT,                         -- Target network/buyer
  ep_name         TEXT,                         -- Executive Producer name
  status          TEXT NOT NULL DEFAULT 'draft',     -- draft | published
  visibility      TEXT NOT NULL DEFAULT 'internal',  -- public | internal | gated
  gate_password   TEXT,                         -- Only used when visibility = gated
  slide_count     INTEGER DEFAULT 0,
  created_at      BIGINT NOT NULL,
  updated_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS deck_slides (
  id               TEXT PRIMARY KEY,
  deck_site_id     TEXT NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,
  slide_order      INTEGER NOT NULL,            -- 1-based position within deck
  slide_image_path TEXT,                        -- /deck-assets/{deck_id}/slides/slide_N.png
  ai_image_path    TEXT,                        -- /deck-assets/{deck_id}/ai/slide_N.png
  ai_prompt        TEXT,                        -- Prompt sent to DALL-E for this slide
  section_label    TEXT,                        -- "THE CONCEPT", "THE FORMAT", "THE TEAM" etc
  section_type     TEXT DEFAULT 'content',      -- hero | stats | content | talent | ask | cta
  heading          TEXT,
  body             TEXT,
  stats_json       TEXT,                        -- JSON array [{label, value}] for stats sections
  created_at       BIGINT NOT NULL
);
