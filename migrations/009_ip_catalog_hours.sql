-- Migration 009: add production_hours to ip_catalog
-- Enables tracking pipeline hours: content in active development/pitching
-- that counts toward the production hours goal but isn't on air yet.
ALTER TABLE ip_catalog ADD COLUMN production_hours INTEGER DEFAULT 0;
