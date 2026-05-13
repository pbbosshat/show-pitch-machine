-- 011_show_db.sql
-- Show lifecycle tracking and TVMaze enrichment columns for the Show DB page.
ALTER TABLE shows ADD COLUMN IF NOT EXISTS air_status    TEXT    DEFAULT 'on_air';
ALTER TABLE shows ADD COLUMN IF NOT EXISTS is_our_show   INTEGER DEFAULT 0;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS total_seasons INTEGER;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS schedule      TEXT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS off_air_date  BIGINT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS tvmaze_id     INTEGER;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS notes         TEXT;

CREATE INDEX IF NOT EXISTS idx_shows_air_status  ON shows(air_status);
CREATE INDEX IF NOT EXISTS idx_shows_is_our_show ON shows(is_our_show);
