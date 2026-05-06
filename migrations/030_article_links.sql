-- migrations/030_article_links.sql
--
-- Adds entity_article_links — a join table that connects trade articles to
-- buyer contacts, shows, and production companies found within them. Also adds
-- processed_at to trade_articles so the process-articles script can skip rows
-- it has already handled.
--
-- entity_article_links stores both the raw match (confidence, link_reason) and
-- the result of any auto-applied update (auto_applied, applied_field, applied_value)
-- so every DB change made by the processor is fully auditable and reversible.
--
-- initDb() in lib/db.ts runs each migration file exactly once — ALTER TABLE
-- statements here are safe; they will never run a second time on an existing DB.
--
-- Runs exactly once via initDb() migration tracker in lib/db.ts.

-- ── entity_article_links ──────────────────────────────────────────────────────
-- One row per (entity, article) pair. A single article can link to multiple
-- buyers, shows, and production companies; a single entity can link to many
-- articles. The UNIQUE constraint prevents duplicate rows from re-runs.

CREATE TABLE IF NOT EXISTS entity_article_links (
  id           TEXT    PRIMARY KEY,

  -- Which type of entity this row links to.
  -- Values: 'buyer_contact' | 'show' | 'production_company'
  entity_type  TEXT    NOT NULL,

  -- FK to the entity row (buyer_contacts.id, shows.id, or production_companies.id).
  -- No hard FK constraint because entity_type determines the target table and
  -- SQLite does not support polymorphic FK enforcement.
  entity_id    TEXT    NOT NULL,

  -- FK to the trade article that mentions this entity.
  article_id   TEXT    NOT NULL REFERENCES trade_articles(id),

  -- Why this link was created.
  -- Values: 'exec_move' | 'cancelled' | 'mandate' | 'greenlit' | 'mentioned'
  link_reason  TEXT,

  -- Fuzzy-match confidence score from the processor (0.0–1.0).
  -- Matches below 0.6 are discarded; auto-applies require >= 0.75.
  confidence   REAL    DEFAULT 1.0,

  -- 1 if the processor wrote a field update to the entity row based on this link.
  -- Allows querying "what did the processor change?" without scanning all entities.
  auto_applied INTEGER DEFAULT 0,

  -- Which field was updated on the entity row (e.g. 'title', 'air_status').
  -- NULL if auto_applied = 0.
  applied_field TEXT,

  -- The value that was written to applied_field.
  -- NULL if auto_applied = 0.
  applied_value TEXT,

  created_at   INTEGER DEFAULT (unixepoch() * 1000),

  -- Prevent duplicate rows across re-runs — one link per (entity, article) pair.
  UNIQUE(entity_type, entity_id, article_id)
);

-- Index for "all articles mentioning this entity" (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_eal_entity  ON entity_article_links(entity_type, entity_id);

-- Index for "all entities mentioned in this article" (used by the processor)
CREATE INDEX IF NOT EXISTS idx_eal_article ON entity_article_links(article_id);

-- ── Extend trade_articles ─────────────────────────────────────────────────────
-- Timestamp set by the processor when it finishes extracting entities from an
-- article. NULL = not yet processed. Used to skip already-processed rows on
-- subsequent runs (unless --reprocess flag is passed).

ALTER TABLE trade_articles ADD COLUMN processed_at INTEGER DEFAULT NULL;
