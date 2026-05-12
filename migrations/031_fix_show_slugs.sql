-- 031_fix_show_slugs.sql
-- Rename 6 show slugs to match the legacy Webflow URLs exactly so existing inbound
-- links, Google index entries, and bookmarks continue to resolve after the DNS
-- cutover from Webflow to Railway. The auto-generated slugs split apostrophes into
-- "-s-" while Webflow strips the apostrophe entirely ("manson-s" vs "mansons").
-- Idempotent: each UPDATE is a no-op on a fresh DB that already has the correct slug.

UPDATE site_shows SET slug = 'mansons-bloodline'                  WHERE slug = 'manson-s-bloodline';
UPDATE site_shows SET slug = 'shermans-warriors'                  WHERE slug = 'sherman-s-warriors';
UPDATE site_shows SET slug = 'wild-and-crazy-kids'                WHERE slug = 'wild-crazy-kids';
UPDATE site_shows SET slug = 'worlds-edge'                        WHERE slug = 'world-s-edge';
UPDATE site_shows SET slug = 'comedy-centrals-bar-mitzvah-bash'   WHERE slug = 'comedy-central-s-bar-mitzvah-bash';
UPDATE site_shows SET slug = 'ghost-adventures-haunted-museum-live' WHERE slug = 'haunted-museum-live';
