-- 010_article_enrichment.sql
-- Article enrichment columns for the Daily Briefing context panel.
-- Populated lazily by the /api/intelligence/briefing/enrich batch endpoint.
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS brief              TEXT;
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS production_company TEXT;
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS buyer_name         TEXT;
ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS buyer_company      TEXT;
