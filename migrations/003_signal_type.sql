-- 003_signal_type.sql
-- Adds signal_type to trade_articles so the pipeline can distinguish
-- greenlit (buyer active) from freed-budget (cancellation = open slot at that buyer).
--
-- signal_type values:
--   greenlit     — network commissioned a new show in MYE's lane → buyer is active
--   renewed      — existing in-lane show renewed → buyer still committed to genre
--   freed-budget — in-lane show cancelled → buyer needs a replacement, budget available
--   mandate      — explicit buyer mandate statement → highest-priority signal
--   noise        — outside MYE's lane, skip

ALTER TABLE trade_articles ADD COLUMN IF NOT EXISTS signal_type TEXT;
CREATE INDEX IF NOT EXISTS idx_articles_signal ON trade_articles(signal_type);
