-- 014_tvmaze_seed.sql
-- Adds columns to support the TVMaze network seed pipeline and improve
-- the show ↔ network ↔ buyer ↔ prodco triangulation queries.

-- Raw TVMaze genre tags as a JSON array (e.g. '["Crime","Documentary","Investigation"]').
ALTER TABLE shows ADD COLUMN IF NOT EXISTS tvmaze_genres TEXT;

-- TVMaze's show type string ("Reality", "Documentary", "Game Show", etc.).
ALTER TABLE shows ADD COLUMN IF NOT EXISTS tvmaze_type TEXT;

-- Data confidence tier for every show row.
ALTER TABLE shows ADD COLUMN IF NOT EXISTS confidence TEXT NOT NULL DEFAULT 'confirmed';

CREATE INDEX IF NOT EXISTS idx_shows_network_id  ON shows(network_id);
CREATE INDEX IF NOT EXISTS idx_shows_prodco_id   ON shows(prodco_id);
CREATE INDEX IF NOT EXISTS idx_shows_prodco_2_id ON shows(prodco_2_id);
CREATE INDEX IF NOT EXISTS idx_shows_confidence  ON shows(confidence);

-- Composite index for the most common triangulation join.
CREATE INDEX IF NOT EXISTS idx_shows_triangle
  ON shows(network_id, air_status, is_unscripted, confidence);

-- TMDB prodco ID for dedup when seeding from TMDB.
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_prodco_tmdb_id
  ON production_companies(tmdb_id) WHERE tmdb_id IS NOT NULL;
