-- migrations/004_sizzle_and_contacts.sql
-- Adds first-class sizzle reel and pitch deck tracking, a dev-team task tracker,
-- and extends ip_catalog / buyer_contacts / talent / content_partners with columns
-- discovered from the actual Google Sheet structure.
--
-- Runs exactly once via initDb() migration tracker in lib/db.ts.
-- All ALTER TABLE statements are safe to add here because initDb() skips already-applied files.

-- ── sizzle_reels ──────────────────────────────────────────────────────────────
-- Sizzle reels are first-class brand assets: each sheet row that contains a sizzle
-- link gets its own record here so we can surface, filter, and share them independently.

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
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sizzle_ip ON sizzle_reels(ip_catalog_id);

-- Unique index so INSERT OR IGNORE can dedup on re-runs without inserting duplicates.
-- Two records are the same sizzle if they point at the same project + same raw cell text.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sizzle_unique
  ON sizzle_reels(ip_catalog_id, raw_value);

-- ── pitch_decks ───────────────────────────────────────────────────────────────
-- Pitch decks and other supporting materials (one-sheets, episode proposals, talent reels).
-- A single ip_catalog row may have multiple material types, each stored as its own record.

CREATE TABLE IF NOT EXISTS pitch_decks (
  id              TEXT PRIMARY KEY,
  ip_catalog_id   TEXT NOT NULL REFERENCES ip_catalog(id),
  material_type   TEXT DEFAULT 'deck', -- 'deck' | 'one-sheet' | 'episode-proposal' | 'talent-reel' | 'other'
  deck_url        TEXT,                -- extracted URL if present in raw_value
  raw_value       TEXT,                -- original cell value verbatim
  sheet_source    TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deck_ip ON pitch_decks(ip_catalog_id);

-- Unique index to prevent duplicate deck records on re-runs (same project + same raw text).
CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_unique
  ON pitch_decks(ip_catalog_id, raw_value);

-- ── dev_tasks ─────────────────────────────────────────────────────────────────
-- Tasks imported from the Dev Team Tracker tab.
-- ip_catalog_id is nullable because some tasks are research briefs not tied to a specific project.

CREATE TABLE IF NOT EXISTS dev_tasks (
  id               TEXT PRIMARY KEY,
  ip_catalog_id    TEXT REFERENCES ip_catalog(id), -- nullable — research tasks have no project link
  task_description TEXT NOT NULL,
  assigned_to      TEXT,              -- "Sarah", "Ashley/Logan", "Team", etc.
  deadline         TEXT,              -- raw date string from the sheet
  section          TEXT,              -- "ACTIVE PRIORITIES" | "TEAM BRAINSTORMS" | "RESEARCH INITIATIVES"
  status           TEXT DEFAULT 'open',
  created_at       TEXT DEFAULT (datetime('now'))
);

-- ── Extend ip_catalog ─────────────────────────────────────────────────────────
-- Additional columns discovered from sheet structure that weren't in migration 003.

-- Raw "Other Materials" column value (one-sheets, episode proposals, talent reels, etc.)
ALTER TABLE ip_catalog ADD COLUMN sheet_other_materials TEXT;

-- Raw "Sent Materials" column value — which assets were actually sent to a buyer
ALTER TABLE ip_catalog ADD COLUMN sheet_sent_materials TEXT;

-- Signed / NDA status from the sheet (e.g. "NDA signed 3/15", "LOI pending")
ALTER TABLE ip_catalog ADD COLUMN sheet_signed TEXT;

-- Talent contact email from the sheet (not the buyer — the talent/producer attached to the IP)
ALTER TABLE ip_catalog ADD COLUMN sheet_talent_email TEXT;

-- ── Extend buyer_contacts ─────────────────────────────────────────────────────
-- Additional columns to capture data from the contact sheets that had no home before.

-- Direct phone number (US/UK/intl format — sparse; many contacts have no phone listed)
ALTER TABLE buyer_contacts ADD COLUMN phone TEXT;

-- Coverage / mandate notes from the "Phone" column in contact sheets.
-- Counterintuitively the "Phone" column in MYE sheets often contains mandate/role descriptions
-- like "Head of Documentary Features at Amazon" rather than actual phone numbers.
ALTER TABLE buyer_contacts ADD COLUMN coverage_notes TEXT;

-- LinkedIn profile URL imported from Former A&E Execs sheet (col C when it starts with https://)
ALTER TABLE buyer_contacts ADD COLUMN linkedin_url TEXT;

-- Prior role at another network (e.g. "Former EP Lifetime") — from Former A&E Execs col C
ALTER TABLE buyer_contacts ADD COLUMN former_role TEXT;

-- Priority flag: 1 = priority contact (marked "X" in Former A&E Execs), 0 = standard
ALTER TABLE buyer_contacts ADD COLUMN outreach_priority INTEGER DEFAULT 0;

-- ── Extend talent ─────────────────────────────────────────────────────────────

-- Tier classification for the talent relationship:
--   'signed'       = our talent (under agreement with MYE)
--   'relationship' = existing working relationship but not signed
--   'target'       = aspirational attachment we want to pursue
ALTER TABLE talent ADD COLUMN talent_tier TEXT DEFAULT 'relationship';

-- Comma-separated genre categories this talent is known for (e.g. "crime,paranormal,sports")
ALTER TABLE talent ADD COLUMN genre_fit TEXT;

-- JSON object of digital platform affiliations (e.g. {"paywall":"Substack","branded":"Samsung"})
ALTER TABLE talent ADD COLUMN digital_platforms TEXT;

-- ── Extend content_partners ───────────────────────────────────────────────────

-- Intermediary agency through which this brand partner is accessed.
-- Examples: 'Buchwald Brands', 'Edelman', 'Hearst', 'Abbvie' (direct)
ALTER TABLE content_partners ADD COLUMN agency TEXT;
