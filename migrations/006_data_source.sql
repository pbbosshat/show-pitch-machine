-- 006_data_source.sql
-- Data provenance columns: every record now carries a source tier so the UI
-- can distinguish first-party knowledge (sheet, email, manual) from scraped
-- trade press data.
--
-- Postgres conversion: `ADD COLUMN IF NOT EXISTS` so reruns are safe.

-- shows: which pipeline produced this comp show record?
--   'manual' — hand-coded in seed.ts or entered via UI
--   'sheet'  — imported from MYE Google Sheet
--   'trade'  — extracted from trade press scraper output
ALTER TABLE shows ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'manual';

-- Shows that match an MYE ip_catalog title can be linked back to their parent record.
ALTER TABLE shows ADD COLUMN IF NOT EXISTS ip_catalog_id TEXT REFERENCES ip_catalog(id);

-- ip_catalog: where did this IP record come from?
ALTER TABLE ip_catalog ADD COLUMN IF NOT EXISTS origin_source TEXT NOT NULL DEFAULT 'csv';

-- Backfill existing rows: sheet_source being set is the reliable signal that
-- a record came from the Google Sheet import.
UPDATE ip_catalog SET origin_source = 'sheet' WHERE sheet_source IS NOT NULL;

-- buyer_contacts: where did the mandate statement come from?
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS mandate_data_source TEXT;
