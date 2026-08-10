-- 044_daily_connections.sql
-- Daily Connections: people extracted from relevant trade articles, tiered,
-- deduped against Shawn's Gmail/Calendar, enriched via Apollo, drafted in
-- Shawn's voice, and queued for send (email inline, LinkedIn via Bubba poll).
--
-- Idempotent: every object uses IF NOT EXISTS so initDb() can re-run it safely.
-- Conventions match migrations/001_schema.sql: TEXT uuid PKs, BIGINT ms-epoch
-- timestamps, INTEGER 0/1 booleans.

CREATE TABLE IF NOT EXISTS connection_leads (
  id                  TEXT PRIMARY KEY,
  article_id          TEXT NOT NULL REFERENCES trade_articles(id),
  lead_date           TEXT NOT NULL,        -- 'YYYY-MM-DD' build-day bucket (local)
  person_name         TEXT NOT NULL,
  person_title        TEXT,                 -- new title per the article
  company             TEXT,                 -- company they are at / moved to
  prior_company       TEXT,
  reason              TEXT,                 -- one-line reason-for-connection
  tier                INTEGER NOT NULL DEFAULT 2,  -- 1 | 2 connect-worthy, 3 note-only
  tier_reason         TEXT,
  status              TEXT NOT NULL DEFAULT 'new',
    -- 'new' | 'enriching' | 'ready' | 'queued' | 'sent' | 'skipped' | 'failed'
  dedup_status        TEXT DEFAULT 'unchecked',
    -- 'unchecked' | 'clear' | 'known_gmail' | 'known_calendar'
  dedup_evidence      TEXT,                 -- matched subject/date, for the UI chip
  email               TEXT,
  email_status        TEXT,                 -- apollo email_status; send gate = 'verified' only
  linkedin_url        TEXT,
  apollo_checked_at   BIGINT,
  matched_contact_id  TEXT REFERENCES buyer_contacts(id),  -- fuzzy match to existing buyer
  voice_variant       TEXT,                 -- 'stranger' | 'reconnect'
  draft_email_subject TEXT,
  draft_email_body    TEXT,
  draft_li_note       TEXT,                 -- hard cap 200 chars
  created_at          BIGINT,
  updated_at          BIGINT,
  UNIQUE (article_id, person_name)          -- idempotent re-builds
);
CREATE INDEX IF NOT EXISTS idx_conn_leads_date   ON connection_leads(lead_date);
CREATE INDEX IF NOT EXISTS idx_conn_leads_status ON connection_leads(status);
CREATE INDEX IF NOT EXISTS idx_conn_leads_tier   ON connection_leads(tier);

CREATE TABLE IF NOT EXISTS connect_queue (
  id            TEXT PRIMARY KEY,
  lead_id       TEXT NOT NULL REFERENCES connection_leads(id),
  channel       TEXT NOT NULL,              -- 'email' | 'linkedin'
  payload       TEXT,                       -- JSON: {subject,body} or {note,email,linkedin_url,name}
  status        TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'picked' | 'sent' | 'already_connected'
    -- | 'pending_invite' | 'failed' | 'skipped'
  result_detail TEXT,                       -- exact engine/gmail error or log line
  queued_at     BIGINT,
  picked_at     BIGINT,                     -- set when Bubba GETs the row
  completed_at  BIGINT
);
CREATE INDEX IF NOT EXISTS idx_connq_status  ON connect_queue(status, channel);
CREATE INDEX IF NOT EXISTS idx_connq_lead    ON connect_queue(lead_id);
