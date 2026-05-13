-- 002_relevance_classification.sql
-- Adds format_type and relevance_tier to shows, trade_articles, and market_orders.
--   relevance_tier: '1-direct' = MYE's exact lane,
--                   '2-adjacent' = buyer signal only,
--                   '3-skip' = wrong format.
--   format_type   : granular content category used by classify.ts to compute the tier.
--
-- Postgres conversion: `ADD COLUMN IF NOT EXISTS` so the migration is idempotent.
-- (SQLite has no equivalent; the original ran once via schema_migrations.)

ALTER TABLE shows          ADD COLUMN IF NOT EXISTS format_type    TEXT;
ALTER TABLE shows          ADD COLUMN IF NOT EXISTS relevance_tier TEXT;

ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS format_type    TEXT;
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS relevance_tier TEXT;
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS tier_reason    TEXT;

ALTER TABLE market_orders  ADD COLUMN IF NOT EXISTS relevance_tier TEXT;

CREATE INDEX IF NOT EXISTS idx_shows_relevance    ON shows(relevance_tier);
CREATE INDEX IF NOT EXISTS idx_articles_relevance ON trade_articles(relevance_tier);
