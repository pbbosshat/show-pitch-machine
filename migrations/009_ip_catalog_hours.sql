-- 009_ip_catalog_hours.sql
-- Enables tracking pipeline hours: content in active development/pitching
-- that counts toward the production hours goal but isn't on air yet.
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS production_hours INTEGER DEFAULT 0;
