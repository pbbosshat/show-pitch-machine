-- 004_sizzle_and_contacts.sql
-- Adds first-class sizzle reel and pitch deck tracking, a dev-team task tracker,
-- and extends ip_catalog / buyer_contacts / talent / content_partners with columns
-- discovered from the actual Google Sheet structure.
--
-- Postgres conversions:
--   • `ADD COLUMN IF NOT EXISTS` everywhere (idempotent).
--   • `TEXT DEFAULT (datetime('now'))` → `TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')`
--     to keep the value as a string for downstream code that compares it as text.

-- ── sizzle_reels ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sizzle_reels (
  id              TEXT PRIMARY KEY,
  ip_catalog_id   TEXT NOT NULL REFERENCES ip_catalog(id),
  title           TEXT,              -- project title copied for quick reference
  vimeo_url       TEXT,              -- extracted Vimeo URL if present in raw_value
  vimeo_password  TEXT,              -- password extracted from "Sizzle PW: HoopDreams" pattern
  platform        TEXT DEFAULT 'vimeo', -- 'vimeo' | 'youtube' | 'dropbox' | 'other'
  raw_value       TEXT,              -- original cell value verbatim from the sheet
  sheet_source    TEXT,              -- which sheet tab this came from
  notes           TEXT,
  created_at      TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_sizzle_ip ON sizzle_reels(ip_catalog_id);

-- Unique index so the equivalent of SQLite's `INSERT OR IGNORE` can dedup on re-runs.
-- Two records are the same sizzle if they point at the same project + raw cell text.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sizzle_unique
  ON sizzle_reels(ip_catalog_id, raw_value);

-- ── pitch_decks ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pitch_decks (
  id              TEXT PRIMARY KEY,
  ip_catalog_id   TEXT NOT NULL REFERENCES ip_catalog(id),
  material_type   TEXT DEFAULT 'deck', -- 'deck' | 'one-sheet' | 'episode-proposal' | 'talent-reel' | 'other'
  deck_url        TEXT,                -- extracted URL if present in raw_value
  raw_value       TEXT,                -- original cell value verbatim
  sheet_source    TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

CREATE INDEX IF NOT EXISTS idx_deck_ip ON pitch_decks(ip_catalog_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_unique
  ON pitch_decks(ip_catalog_id, raw_value);

-- ── dev_tasks ─────────────────────────────────────────────────────────────────
-- Tasks imported from the Dev Team Tracker tab.
-- ip_catalog_id is nullable because some tasks are research briefs not tied to a project.

CREATE TABLE IF NOT EXISTS dev_tasks (
  id               TEXT PRIMARY KEY,
  ip_catalog_id    TEXT REFERENCES ip_catalog(id), -- nullable for research-only tasks
  task_description TEXT NOT NULL,
  assigned_to      TEXT,
  deadline         TEXT,
  section          TEXT,
  status           TEXT DEFAULT 'open',
  created_at       TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

-- ── Extend ip_catalog ─────────────────────────────────────────────────────────

ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_other_materials TEXT;
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_sent_materials  TEXT;
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_signed          TEXT;
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_talent_email    TEXT;

-- ── Extend buyer_contacts ─────────────────────────────────────────────────────

ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS phone             TEXT;
-- The "Phone" column in MYE sheets often contains mandate/role descriptions
-- rather than actual phone numbers — preserved here verbatim.
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS coverage_notes    TEXT;
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS linkedin_url      TEXT;
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS former_role       TEXT;
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS outreach_priority INTEGER DEFAULT 0;

-- ── Extend talent ─────────────────────────────────────────────────────────────

ALTER TABLE talent ADD COLUMN IF NOT EXISTS talent_tier       TEXT DEFAULT 'relationship';
ALTER TABLE talent ADD COLUMN IF NOT EXISTS genre_fit         TEXT;
ALTER TABLE talent ADD COLUMN IF NOT EXISTS digital_platforms TEXT;

-- ── Extend content_partners ───────────────────────────────────────────────────

ALTER TABLE content_partners ADD COLUMN IF NOT EXISTS agency TEXT;
