-- 003_spreadsheet_import.sql
-- Extends the schema to store raw spreadsheet data imported from the MYE Google Sheet.
-- Also adds region/is_former to buyer_contacts and two new tables for story scouts
-- and project-level email thread cross-references.
--
-- Postgres conversions:
--   • `ADD COLUMN IF NOT EXISTS` everywhere so reruns are safe.
--   • `TEXT DEFAULT (datetime('now'))` → `TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')`
--     to preserve the original column type (existing code reads the value as a
--     string, not a TIMESTAMPTZ). A future migration can promote to TIMESTAMPTZ
--     once callers are audited.

-- ── Extend ip_catalog ──────────────────────────────────────────────────────────

-- Which sheet tab this row came from (e.g. 'Priorities', 'Passes', 'Brainstorms').
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_source TEXT;

-- Raw Status column value from the spreadsheet (e.g. 'In Development', 'Passed').
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_status TEXT;

-- Point person listed in the spreadsheet (internal MYE exec responsible for the project).
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_point_person TEXT;

-- Comma-separated list of target networks from the sheet (e.g. 'A&E, Discovery, Netflix').
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_target_nets TEXT;

-- Who the project was pitched to (buyer name or network, from "Pitching/Pitched" column).
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_pitched_to TEXT;

-- Passed buyers or pass notes from the "Passed" column.
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_passed TEXT;

-- Next steps timing / deadline text from the sheet.
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_next_steps TEXT;

-- Attachments field from the sheet (sizzle/deck availability notes).
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_attachments TEXT;

-- The full raw combined status string before normalization.
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_raw_status TEXT;

-- Best date string extracted from next_steps or status text (ISO-ish, e.g. '2024-03-15').
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS extracted_date TEXT;

-- Confidence level for the extracted date: 'extracted' | 'year-only' | 'none'.
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS date_confidence TEXT DEFAULT 'none';

-- Rank from the Brainstorms sheet (lower = higher priority).
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS brainstorm_rank INTEGER;

-- Stable dedup key: slugified sheet tab name + slugified project title.
-- e.g. 'priorities--ghost-adventures'. Used as the upsert key during import.
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS sheet_row_key TEXT;

-- Unique index on sheet_row_key for fast upsert lookups — partial so NULLs don't conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_sheet_row_key
  ON ip_catalog(sheet_row_key)
  WHERE sheet_row_key IS NOT NULL;

-- ── Extend buyer_contacts ──────────────────────────────────────────────────────

-- Geographic region for network contacts imported from the contact sheets.
-- Values: 'us' | 'uk' | 'canada' | 'australia'.
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us';

-- 1 if contact came from "Former A&E Execs" sheet — useful for targeting/filtering.
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS is_former INTEGER DEFAULT 0;

-- ── story_scout ───────────────────────────────────────────────────────────────
-- Stories from the STORY SCOUT sheet that may be optioned or tracked for development.
-- Optional FK to ip_catalog if the story has been elevated to an active project.

CREATE TABLE IF NOT EXISTS story_scout (
  id              TEXT PRIMARY KEY,
  headline        TEXT NOT NULL,
  summary         TEXT,
  link            TEXT,
  -- Banner / working title for a potential project based on this story.
  project_banner  TEXT,
  -- Rights status: 'optioned', 'available', 'public domain', etc.
  article_rights  TEXT,
  -- Raw "ACTION" column value from the sheet.
  action_notes    TEXT,
  -- Set if this story has been promoted to an active IP catalog entry.
  ip_catalog_id   TEXT REFERENCES ip_catalog(id),
  -- Stored as ISO-ish text (the existing SQLite snapshot has them as TEXT
  -- because some callers compare against bare year/date strings). The default
  -- mirrors SQLite's `datetime('now')` shape: 'YYYY-MM-DD HH:MI:SS'.
  created_at      TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS')
);

-- ── project_email_threads ─────────────────────────────────────────────────────
-- Cross-reference table linking ip_catalog entries to Gmail thread IDs.
-- Separate from pitches.thread_id — that field is a single-thread FK.
-- This table supports many-threads-per-project for full email history.

CREATE TABLE IF NOT EXISTS project_email_threads (
  id                  TEXT PRIMARY KEY,
  ip_catalog_id       TEXT NOT NULL REFERENCES ip_catalog(id),
  thread_id           TEXT NOT NULL,
  subject             TEXT,
  -- JSON array of participant email addresses.
  participants        TEXT,
  first_message_date  TEXT,
  last_message_date   TEXT,
  message_count       INTEGER DEFAULT 1,
  -- Short preview of the latest message in the thread.
  snippet             TEXT,
  -- 'inbound' | 'outbound' — based on whether MYE sent or received the first message.
  direction           TEXT,
  -- How the thread was found: 'gmail-live' (real-time) | 'gmail-import' (bulk scan).
  source              TEXT DEFAULT 'gmail-live',
  -- 'exact' = title matched exactly | 'fuzzy' = partial/alias match.
  match_confidence    TEXT DEFAULT 'exact',
  created_at          TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
  UNIQUE(ip_catalog_id, thread_id)
);

-- Speed up lookups by project (join to ip_catalog) and by date (timeline views).
CREATE INDEX IF NOT EXISTS idx_pet_ip   ON project_email_threads(ip_catalog_id);
CREATE INDEX IF NOT EXISTS idx_pet_date ON project_email_threads(first_message_date);
