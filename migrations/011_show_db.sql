-- Migration 011: show lifecycle tracking and TVMaze enrichment columns for Show DB page.
-- air_status    — lifecycle state: 'on_air' | 'available' | 'off_air'
-- is_our_show   — 1 = MYE-produced show (Ghost Adventures, Destination Fear, etc.)
-- total_seasons — total seasons aired (distinct from season_number = current greenlit season)
-- schedule      — broadcast slot, e.g. "Sundays 9/8c"
-- off_air_date  — unix ms timestamp when show ended or was cancelled
-- tvmaze_id     — TVMaze API show ID, used for automated enrichment
-- notes         — human editorial notes for Show DB page
ALTER TABLE shows ADD COLUMN air_status    TEXT    DEFAULT 'on_air';
ALTER TABLE shows ADD COLUMN is_our_show   INTEGER DEFAULT 0;
ALTER TABLE shows ADD COLUMN total_seasons INTEGER;
ALTER TABLE shows ADD COLUMN schedule      TEXT;
ALTER TABLE shows ADD COLUMN off_air_date  INTEGER;
ALTER TABLE shows ADD COLUMN tvmaze_id     INTEGER;
ALTER TABLE shows ADD COLUMN notes         TEXT;

-- Index air_status for fast filtering on the Show DB table page (expected high cardinality split)
CREATE INDEX IF NOT EXISTS idx_shows_air_status  ON shows(air_status);
-- Index is_our_show so the "MYE shows only" toggle is instant even on large datasets
CREATE INDEX IF NOT EXISTS idx_shows_is_our_show ON shows(is_our_show);
