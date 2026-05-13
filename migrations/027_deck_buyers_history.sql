-- 027_deck_buyers_history.sql
-- Adds buyer tracking and meeting history for specific pitch decks, and links
-- package_emails to the deck and buyer contact that generated them.

-- ── deck_buyers ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deck_buyers (
  id               TEXT    PRIMARY KEY,
  deck_id          TEXT    NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,
  buyer_contact_id TEXT    REFERENCES buyer_contacts(id),
  sent_at          INTEGER,
  pipeline_stage   TEXT    DEFAULT 'sent',
  notes            TEXT,
  created_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deck_buyers_deck    ON deck_buyers(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_buyers_contact ON deck_buyers(buyer_contact_id);

-- ── deck_meetings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deck_meetings (
  id               TEXT    PRIMARY KEY,
  deck_id          TEXT    NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,
  buyer_contact_id TEXT    REFERENCES buyer_contacts(id),
  meeting_date     INTEGER,
  meeting_type     TEXT    DEFAULT 'call',
  notes            TEXT,
  outcome          TEXT,
  created_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deck_meetings_deck    ON deck_meetings(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_meetings_contact ON deck_meetings(buyer_contact_id);

-- ── Extend package_emails ─────────────────────────────────────────────────────

ALTER TABLE package_emails ADD COLUMN IF NOT EXISTS deck_id           TEXT REFERENCES deck_sites(id);
ALTER TABLE package_emails ADD COLUMN IF NOT EXISTS buyer_contact_id  TEXT REFERENCES buyer_contacts(id);
ALTER TABLE package_emails ADD COLUMN IF NOT EXISTS attachment_source TEXT DEFAULT 'auto';
