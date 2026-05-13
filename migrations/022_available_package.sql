-- 022_available_package.sql
-- Extend available_titles with public package fields (slug, image, video, password).
-- Extend contact_leads to capture company and which available title was requested.
-- Postgres uses a partial unique index (same as the SQLite version) so NULL slugs
-- don't collide.

ALTER TABLE available_titles ADD COLUMN IF NOT EXISTS slug      TEXT;
ALTER TABLE available_titles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE available_titles ADD COLUMN IF NOT EXISTS vimeo_url TEXT;
ALTER TABLE available_titles ADD COLUMN IF NOT EXISTS password  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_available_titles_slug
  ON available_titles(slug) WHERE slug IS NOT NULL;

ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS company            TEXT;
ALTER TABLE contact_leads ADD COLUMN IF NOT EXISTS available_title_id TEXT REFERENCES available_titles(id);
