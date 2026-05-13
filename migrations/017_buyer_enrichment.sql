-- 017_buyer_enrichment.sql
-- Adds three tables that power the buyer enrichment pipeline:
--   buyer_research_runs   — one row per pipeline execution.
--   buyer_research        — per-buyer extraction output from a single run.
--   buyer_contact_touches — every email message interaction between an MYE
--                           team member and a buyer contact.

-- ── buyer_research_runs ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_research_runs (
  id              TEXT    PRIMARY KEY,
  source_user     TEXT    NOT NULL,
  source_file     TEXT,
  started_at      BIGINT,
  completed_at    BIGINT,
  buyers_seen     INTEGER DEFAULT 0,
  buyers_created  INTEGER DEFAULT 0,
  buyers_updated  INTEGER DEFAULT 0,
  touches_created INTEGER DEFAULT 0,
  pitches_created INTEGER DEFAULT 0,
  status          TEXT    DEFAULT 'running', -- 'running' | 'done' | 'failed'
  error_msg       TEXT,
  created_at      BIGINT
);

CREATE INDEX IF NOT EXISTS idx_research_runs_user
  ON buyer_research_runs(source_user);

-- ── buyer_research ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_research (
  id                TEXT    PRIMARY KEY,
  run_id            TEXT    NOT NULL REFERENCES buyer_research_runs(id),
  contact_id        TEXT    REFERENCES buyer_contacts(id),
  contact_email     TEXT    NOT NULL,
  extracted_name    TEXT,
  extracted_title   TEXT,
  extracted_company TEXT,
  extracted_phone   TEXT,
  sig_raw           TEXT,
  source_thread_id  TEXT,
  processed_at      BIGINT,
  created_at        BIGINT
);

CREATE INDEX IF NOT EXISTS idx_research_run     ON buyer_research(run_id);
CREATE INDEX IF NOT EXISTS idx_research_contact ON buyer_research(contact_id);

-- ── buyer_contact_touches ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_contact_touches (
  id                TEXT    PRIMARY KEY,
  contact_id        TEXT    REFERENCES buyer_contacts(id),
  contact_email     TEXT    NOT NULL,
  mye_user_email   TEXT    NOT NULL,
  touch_date        BIGINT NOT NULL,
  thread_id         TEXT,
  thread_subject    TEXT,
  message_direction TEXT,
  ip_title          TEXT,
  pitch_outcome     TEXT,
  created_at        BIGINT
);

CREATE INDEX IF NOT EXISTS idx_touches_contact       ON buyer_contact_touches(contact_id);
CREATE INDEX IF NOT EXISTS idx_touches_contact_email ON buyer_contact_touches(contact_email);
CREATE INDEX IF NOT EXISTS idx_touches_mye_user      ON buyer_contact_touches(mye_user_email);
CREATE INDEX IF NOT EXISTS idx_touches_date          ON buyer_contact_touches(touch_date);
