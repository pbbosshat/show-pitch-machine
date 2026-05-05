-- 022_available_package.sql
-- Extend available_titles with public package fields (slug, image, video, password).
-- Extend contact_leads to capture company and which available title was requested.

ALTER TABLE available_titles ADD COLUMN slug TEXT;
ALTER TABLE available_titles ADD COLUMN image_url TEXT;
ALTER TABLE available_titles ADD COLUMN vimeo_url TEXT;
ALTER TABLE available_titles ADD COLUMN password TEXT;

-- SQLite ALTER TABLE cannot add UNIQUE constraints; use a partial index instead.
-- WHERE slug IS NOT NULL so NULL slugs don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_available_titles_slug
  ON available_titles(slug) WHERE slug IS NOT NULL;

ALTER TABLE contact_leads ADD COLUMN company TEXT;
ALTER TABLE contact_leads ADD COLUMN available_title_id TEXT REFERENCES available_titles(id);
