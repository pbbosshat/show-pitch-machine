-- 023_deck_site_link.sql
-- Add deck_site_id to available_titles so each available show can reference
-- its source pitch deck in the deck_sites table.
-- Also update the available_titles POST API insert to include image_url.

ALTER TABLE available_titles ADD COLUMN deck_site_id TEXT REFERENCES deck_sites(id);
