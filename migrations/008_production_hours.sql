-- 008_production_hours.sql
-- Tracks total production hours per show so the marketing dashboard can display
-- aggregate active production hours — the primary operational metric.
ALTER TABLE site_shows ADD COLUMN IF NOT EXISTS production_hours INTEGER DEFAULT 0;
