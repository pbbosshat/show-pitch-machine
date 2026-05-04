-- migrations/014_tvmaze_seed.sql
-- Adds columns to support the TVMaze network seed pipeline and improve
-- the show ↔ network ↔ buyer ↔ prodco triangulation queries.
--
-- Runs exactly once via initDb() migration tracker.

-- Raw TVMaze genre tags as a JSON array (e.g. '["Crime","Documentary","Investigation"]').
-- Separate from the `genre` column, which holds our own internal classification.
-- Enables filtering like: WHERE tvmaze_genres LIKE '%Reality%'
ALTER TABLE shows ADD COLUMN tvmaze_genres TEXT;

-- TVMaze's show type string ("Reality", "Documentary", "Game Show", etc.).
-- Separate from our `format` column (which we use for episode format/runtime classification).
-- Populated by seed-tvmaze-networks.ts; used as a pre-filter signal before our classifier runs.
ALTER TABLE shows ADD COLUMN tvmaze_type TEXT;

-- Data confidence tier for every show row.
--   'confirmed' — verified by at least one authoritative source; surfaced in UI and queries.
--   'pending'   — data is present but something is unresolved (network ownership unclear,
--                 type ambiguous, etc.); hidden from main UI until a second source confirms it.
--
-- Upgrade path: 'pending' → 'confirmed' only — never downgrade confirmed data.
-- Second sources that can promote: TMDB seed, trade scraper article, manual review.
ALTER TABLE shows ADD COLUMN confidence TEXT NOT NULL DEFAULT 'confirmed';

-- Indexes to make the triangulation queries fast at scale.
-- These support the core "give me all shows on this network" and
-- "which shows does this prodco have on the air" queries.
CREATE INDEX IF NOT EXISTS idx_shows_network_id  ON shows(network_id);
CREATE INDEX IF NOT EXISTS idx_shows_prodco_id   ON shows(prodco_id);
CREATE INDEX IF NOT EXISTS idx_shows_prodco_2_id ON shows(prodco_2_id);
CREATE INDEX IF NOT EXISTS idx_shows_confidence  ON shows(confidence);

-- Composite index for the most common triangulation join:
-- "all confirmed on-air unscripted shows linked to a network we know about"
CREATE INDEX IF NOT EXISTS idx_shows_triangle
  ON shows(network_id, air_status, is_unscripted, confidence);

-- TMDB prodco ID for dedup when seeding production companies from TMDB.
-- Separate from the show's tmdb_id — this is the prodco's own TMDB entity ID.
ALTER TABLE production_companies ADD COLUMN tmdb_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prodco_tmdb_id
  ON production_companies(tmdb_id) WHERE tmdb_id IS NOT NULL;
