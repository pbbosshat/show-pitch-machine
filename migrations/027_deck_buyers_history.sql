-- migrations/027_deck_buyers_history.sql
-- Adds buyer tracking and meeting history for specific pitch decks, and links
-- package_emails to the deck and buyer contact that generated them.
--
--   deck_buyers    — records which buyer contacts received a given deck, with
--                    pipeline stage and freeform notes per send.
--   deck_meetings  — logs calls / meetings about a specific deck with a buyer;
--                    captures outcome so we can build a meeting history view.
--
-- Also extends package_emails with three new columns:
--   deck_id            — links an email thread to a specific deck_sites row
--   buyer_contact_id   — attributes the email to a known buyer contact
--   attachment_source  — 'auto' (AI-classified) | 'manual' (user-attached)
--
-- All ALTER TABLE statements are safe here because initDb() in lib/db.ts only
-- runs each migration file once — this file is skipped on subsequent startups.
--
-- Runs exactly once via initDb() migration tracker in lib/db.ts.

-- ── deck_buyers ───────────────────────────────────────────────────────────────
-- One row per buyer contact that received a specific pitch deck.
-- pipeline_stage mirrors the stages used elsewhere in the app so that this
-- table can serve as a per-deck mini-CRM alongside the global pitches table.

CREATE TABLE IF NOT EXISTS deck_buyers (
  id               TEXT    PRIMARY KEY,

  -- The deck that was sent. Cascades on delete so orphan rows are cleaned up
  -- automatically if a deck is removed from the system.
  deck_id          TEXT    NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,

  -- The buyer who received it. Nullable: we may log a send before the contact
  -- record is created (e.g. imported from a bulk send list, then matched later).
  buyer_contact_id TEXT    REFERENCES buyer_contacts(id),

  -- Unix ms timestamp of when the deck was sent.
  sent_at          INTEGER,

  -- Current stage in the pitch pipeline for this deck+buyer pair.
  -- Typical values: 'sent' | 'opened' | 'in-review' | 'meeting' | 'pass' | 'greenlit'
  pipeline_stage   TEXT    DEFAULT 'sent',

  -- Freeform field for per-send context (e.g. "sent via Paul", "requested shorter cut")
  notes            TEXT,

  created_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deck_buyers_deck    ON deck_buyers(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_buyers_contact ON deck_buyers(buyer_contact_id);

-- ── deck_meetings ─────────────────────────────────────────────────────────────
-- Logs every call or in-person meeting about a specific deck with a buyer.
-- Kept separate from deck_buyers so a single buyer can have multiple meeting
-- records over the life of a pitch without one overwriting another.

CREATE TABLE IF NOT EXISTS deck_meetings (
  id               TEXT    PRIMARY KEY,

  -- The deck the meeting was about. Cascades on delete.
  deck_id          TEXT    NOT NULL REFERENCES deck_sites(id) ON DELETE CASCADE,

  -- The buyer who was in the meeting. Nullable for the same reason as deck_buyers.
  buyer_contact_id TEXT    REFERENCES buyer_contacts(id),

  -- Unix ms timestamp of the meeting or call.
  meeting_date     INTEGER,

  -- Format of the interaction.
  -- Typical values: 'call' | 'video' | 'in-person' | 'email-thread'
  meeting_type     TEXT    DEFAULT 'call',

  -- Internal notes captured during or after the meeting (agenda, key points, etc.)
  notes            TEXT,

  -- The result of the meeting — what happened next.
  -- Examples: 'pass', 'request-full-treatment', 'moving-to-development', 'follow-up-needed'
  outcome          TEXT,

  created_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deck_meetings_deck    ON deck_meetings(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_meetings_contact ON deck_meetings(buyer_contact_id);

-- ── Extend package_emails ─────────────────────────────────────────────────────
-- Three new columns that allow email threads to be associated with a specific
-- deck and buyer, and to record whether that association was made automatically
-- (by the AI classifier) or manually (by the user in the UI).

-- Link this email thread to the specific pitch deck it relates to.
-- NULL until the AI classifier or the user makes the association.
ALTER TABLE package_emails ADD COLUMN deck_id          TEXT REFERENCES deck_sites(id);

-- Attribute this email to a known buyer contact.
-- NULL until matched; can be set by the AI classifier or manually by the user.
ALTER TABLE package_emails ADD COLUMN buyer_contact_id TEXT REFERENCES buyer_contacts(id);

-- Records how the deck_id / buyer_contact_id association was established.
-- 'auto'   = AI classifier assigned it based on thread content
-- 'manual' = a team member explicitly linked it in the UI
ALTER TABLE package_emails ADD COLUMN attachment_source TEXT DEFAULT 'auto';
