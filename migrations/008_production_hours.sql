-- Migration 008: add production_hours to site_shows
-- Tracks total production hours per show so the marketing dashboard can display
-- aggregate active production hours — the primary operational metric.
ALTER TABLE site_shows ADD COLUMN production_hours INTEGER DEFAULT 0;
