-- Migration 043: add site_show_id to deck_sites so an Available one-sheet (deck)
-- can be linked to a marketing show (site_shows.id). Nullable, no hard FK; the
-- app enforces validity via the picker and the read path tolerates orphans.
-- Idempotent; applied automatically on boot by initDb() (lib/db.ts).
ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS site_show_id TEXT;
