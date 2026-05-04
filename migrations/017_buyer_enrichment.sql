-- migrations/017_buyer_enrichment.sql
-- Adds three tables that power the buyer enrichment pipeline:
--
--   buyer_research_runs   — one row per pipeline execution; tracks what was
--                           processed and aggregate results (counts, status).
--   buyer_research        — per-buyer extraction output from a single run;
--                           stores the best signature block found for each
--                           unique non-MYE participant in the thread export.
--   buyer_contact_touches — every email message interaction between an MYE
--                           team member and a buyer contact, regardless of
--                           whether a buyer_contacts record yet exists.
--
-- Timestamps are stored as INTEGER unix milliseconds (consistent with the rest
-- of the schema). contact_id foreign keys are nullable on buyer_contact_touches
-- and buyer_research because the contact row may not exist yet when a touch or
-- research row is first inserted — it gets backfilled after create/match.
--
-- Runs exactly once via initDb() migration tracker in lib/db.ts.

-- ── buyer_research_runs ───────────────────────────────────────────────────────
-- One row per invocation of the buyer enrichment pipeline.
-- source_user identifies whose Gmail export (threads JSON) was processed so
-- we can re-run per team member without mixing results.

CREATE TABLE IF NOT EXISTS buyer_research_runs (
  id               TEXT    PRIMARY KEY,

  -- Which MYE team member's email was the source (e.g. sm@gototeam.com).
  -- Used to filter threads so we only look at mail belonging to that user.
  source_user      TEXT    NOT NULL,

  -- Filesystem path of the threads JSON file that was fed into this run.
  -- Nullable — future runs may pull live from the Gmail API without a file.
  source_file      TEXT,

  -- Pipeline wall-clock timing (unix ms). completed_at is NULL while running.
  started_at       INTEGER,
  completed_at     INTEGER,

  -- Aggregate counters written at the end of a successful run.
  buyers_seen      INTEGER DEFAULT 0,  -- unique non-MYE participants discovered
  buyers_created   INTEGER DEFAULT 0,  -- new buyer_contacts rows inserted
  buyers_updated   INTEGER DEFAULT 0,  -- existing buyer_contacts rows enriched
  touches_created  INTEGER DEFAULT 0,  -- new buyer_contact_touches rows inserted
  pitches_created  INTEGER DEFAULT 0,  -- new pitch / outreach records created

  -- Lifecycle state. Transitions: running → done | failed.
  -- 'running' while the pipeline is active; 'done' on clean exit; 'failed' on
  -- any unhandled exception (error_msg captures the thrown message).
  status           TEXT    DEFAULT 'running', -- 'running' | 'done' | 'failed'
  error_msg        TEXT,                      -- populated only when status = 'failed'

  created_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_research_runs_user
  ON buyer_research_runs(source_user);

-- ── buyer_research ────────────────────────────────────────────────────────────
-- Per-buyer extraction result from a single pipeline run.
-- One row per unique non-MYE email address seen in the run's thread export.
-- The pipeline picks the best (longest / most structured) signature block it
-- finds across all threads for this contact and stores the parsed fields here.
-- After a buyer_contacts row is created or matched, contact_id is backfilled.

CREATE TABLE IF NOT EXISTS buyer_research (
  id                TEXT    PRIMARY KEY,

  -- Links back to the parent pipeline execution.
  run_id            TEXT    NOT NULL REFERENCES buyer_research_runs(id),

  -- Backfilled once the buyer_contacts row is found or created.
  -- NULL during the extraction phase; populated in the upsert phase.
  contact_id        TEXT    REFERENCES buyer_contacts(id),

  -- The buyer's email address — always present; used as the match key.
  contact_email     TEXT    NOT NULL,

  -- Fields parsed from the best signature block found for this contact.
  -- Any or all may be NULL if the signature was absent or unparseable.
  extracted_name    TEXT,
  extracted_title   TEXT,
  extracted_company TEXT,
  extracted_phone   TEXT,

  -- The raw multi-line signature text the fields were extracted from.
  sig_raw           TEXT,

  -- Gmail thread_id of the message that contained the best signature.
  -- Used for auditability — we can re-fetch the original thread if needed.
  source_thread_id  TEXT,

  processed_at      INTEGER,  -- when this contact was extracted/processed in the run
  created_at        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_research_run
  ON buyer_research(run_id);

CREATE INDEX IF NOT EXISTS idx_research_contact
  ON buyer_research(contact_id);

-- ── buyer_contact_touches ─────────────────────────────────────────────────────
-- Every email message interaction between an MYE team member and a buyer.
-- Populated by the enrichment pipeline as it walks each thread; one row per
-- message (not per thread) so we can build a full chronological history.
--
-- contact_id is nullable at insert time — set after the contact is found or
-- created. contact_email is always stored (denormalized) so queries can join
-- on email even before contact_id is available.
--
-- message_direction encodes which side initiated each message:
--   'outbound' = MYE → buyer (a pitch, follow-up, or check-in from us)
--   'inbound'  = buyer → MYE (a reply, pass, request, or unsolicited note)

CREATE TABLE IF NOT EXISTS buyer_contact_touches (
  id                TEXT    PRIMARY KEY,

  -- Set after the buyer_contacts row is found or created. NULL on first insert.
  contact_id        TEXT    REFERENCES buyer_contacts(id),

  -- Buyer's email address — denormalized for fast lookups before contact_id is set.
  contact_email     TEXT    NOT NULL,

  -- Which MYE team member sent or received this message.
  -- Examples: sm@gototeam.com, jtownley@myentprod.com
  mye_user_email    TEXT    NOT NULL,

  -- Unix ms timestamp of the individual message (not the thread).
  touch_date        INTEGER NOT NULL,

  -- Gmail identifiers — useful for deduplication and deep-linking.
  thread_id         TEXT,
  thread_subject    TEXT,

  -- 'outbound' = mye → buyer | 'inbound' = buyer → mye
  message_direction TEXT,

  -- If the thread is associated with a known pitch, the IP/show name.
  -- NULL when the thread is general correspondence not tied to a specific pitch.
  ip_title          TEXT,

  -- Rolling outcome label for the pitch associated with this touch, if known.
  -- Values: 'pass' | 'meeting' | 'in-review' | 'greenlit' | 'unknown'
  -- Denormalized here so we can quickly filter touches by outcome in reporting.
  pitch_outcome     TEXT,

  created_at        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_touches_contact
  ON buyer_contact_touches(contact_id);

CREATE INDEX IF NOT EXISTS idx_touches_contact_email
  ON buyer_contact_touches(contact_email);

CREATE INDEX IF NOT EXISTS idx_touches_mye_user
  ON buyer_contact_touches(mye_user_email);

CREATE INDEX IF NOT EXISTS idx_touches_date
  ON buyer_contact_touches(touch_date);
