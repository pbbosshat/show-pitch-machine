-- 023_deck_site_link.sql
-- Add deck_site_id to available_titles so each available show can reference
-- its source pitch deck in the deck_sites table.

ALTER TABLE available_titles ADD COLUMN IF NOT EXISTS deck_site_id TEXT REFERENCES deck_sites(id);
