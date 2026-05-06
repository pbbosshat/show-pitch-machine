-- migrations/028_deck_sizzles.sql
-- Adds sizzle reel storage per deck and a theme_color field on deck_sites.
--
--   deck_sizzles  — one row per Vimeo sizzle reel attached to a deck.
--                   Supports multiple sizzles per deck with sort order.
--
-- Also extends deck_sites with:
--   theme_color   — hex accent color for the public-facing deck page
--                   (e.g. '#CC1C2C' for MYE crimson). NULL = default theme.
--
-- Runs exactly once via initDb() migration tracker in lib/db.ts.

-- ── deck_sizzles ──────────────────────────────────────────────────────────────
-- Multiple sizzle reels can be attached to a deck. Each row stores one Vimeo
-- URL with an optional display title and password.

CREATE TABLE IF NOT EXISTS deck_sizzles (
  id         TEXT    PRIMARY KEY,

  -- The deck this sizzle belongs to. Cascades on delete so sizzles are
  -- removed automatically when their parent deck is deleted.
  deck_id    TEXT    NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,

  -- Full Vimeo URL (e.g. https://vimeo.com/123456/abc789)
  vimeo_url  TEXT    NOT NULL,

  -- Optional display label shown on the deck page (e.g. "Full Sizzle Reel")
  title      TEXT,

  -- Optional Vimeo password for private embeds
  password   TEXT,

  -- Controls display order on the deck page (0 = first)
  sort_order INTEGER DEFAULT 0,

  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deck_sizzles_deck ON deck_sizzles(deck_id);

-- ── Extend deck_sites ─────────────────────────────────────────────────────────
-- Hex accent color for the public-facing deck web page.
-- NULL means use the default MYE crimson (#CC1C2C).
ALTER TABLE deck_sites ADD COLUMN theme_color TEXT;
