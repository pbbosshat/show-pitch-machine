-- migrations/016_sizzle_thumbnail.sql
-- Adds thumbnail_url to sizzle_reels so thumbnails are pre-built server-side.
-- Populated by scripts/build-sizzle-thumbnails.ts (Vimeo player config API).
-- Page renders use this cached value — no per-card client-side oEmbed fetch needed.

ALTER TABLE sizzle_reels ADD COLUMN thumbnail_url TEXT;
