-- 030_article_links.sql
-- entity_article_links — a join table connecting trade articles to buyer
-- contacts, shows, and production companies found within them. Also adds
-- processed_at to trade_articles so the process-articles script can skip
-- rows it has already handled.
--
-- Postgres conversions:
--   • `unixepoch() * 1000` default → `(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`
--   • REAL stays REAL.

-- ── entity_article_links ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entity_article_links (
  id            TEXT    PRIMARY KEY,
  -- 'buyer_contact' | 'show' | 'production_company'
  entity_type   TEXT    NOT NULL,
  entity_id     TEXT    NOT NULL,
  article_id    TEXT    NOT NULL REFERENCES trade_articles(id),
  -- 'exec_move' | 'cancelled' | 'mandate' | 'greenlit' | 'mentioned'
  link_reason   TEXT,
  confidence    REAL    DEFAULT 1.0,
  auto_applied  INTEGER DEFAULT 0,
  applied_field TEXT,
  applied_value TEXT,
  created_at    BIGINT  DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  -- Prevent duplicate rows across re-runs — one link per (entity, article) pair.
  UNIQUE(entity_type, entity_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_eal_entity  ON entity_article_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_eal_article ON entity_article_links(article_id);

-- ── Extend trade_articles ─────────────────────────────────────────────────────
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS processed_at INTEGER DEFAULT NULL;
