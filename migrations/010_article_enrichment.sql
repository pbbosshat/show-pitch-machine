-- Migration 010: article enrichment columns for Daily Briefing context panel.
-- brief             — one-sentence summary of why the item matters to MYE
-- production_company — production company behind the show (extracted from body)
-- buyer_name        — specific exec or person making the order/move
-- buyer_company     — network, streamer, or studio involved
-- Populated lazily by the /api/intelligence/briefing/enrich batch endpoint.
ALTER TABLE trade_articles ADD COLUMN brief             TEXT;
ALTER TABLE trade_articles ADD COLUMN production_company TEXT;
ALTER TABLE trade_articles ADD COLUMN buyer_name         TEXT;
ALTER TABLE trade_articles ADD COLUMN buyer_company      TEXT;
