-- 036_deck_sites_is_active.sql
-- Adds the is_active column to deck_sites. The application code (added in
-- commit b037758, 2026-05-05) queries `deck_sites WHERE is_active = 1` to
-- gate the public /available/[slug] one-sheets and the internal /decks list,
-- but the matching schema change never shipped. Result: every authenticated
-- /decks and /dashboard request crashed with "column is_active does not
-- exist" until this migration was applied to the live Railway Postgres
-- (manually on 2026-05-14, then captured here so fresh DBs match prod).
--
-- Semantics (per AvailableClient.tsx): 1 = public (shows in catalog),
-- 0 = private (hidden). Default 1 so any pre-existing rows remain visible.

ALTER TABLE deck_sites ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;
