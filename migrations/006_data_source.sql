-- migrations/006_data_source.sql
-- Data provenance columns: every record now carries a source tier so the UI
-- can distinguish first-party knowledge (sheet, email, manual) from scraped
-- trade press data.

-- shows: which pipeline produced this comp show record?
--   'manual' — hand-coded in seed.ts or entered via UI (the 15 existing mock shows)
--   'sheet'  — imported from MYE Google Sheet
--   'trade'  — extracted from trade press scraper output
ALTER TABLE shows ADD COLUMN data_source TEXT NOT NULL DEFAULT 'manual';

-- Shows that match an MYE ip_catalog title can be linked back to their parent record.
-- NULL = pure comp show with no MYE connection.
ALTER TABLE shows ADD COLUMN ip_catalog_id TEXT REFERENCES ip_catalog(id);

-- ip_catalog: where did this IP record come from?
--   'csv'    — seeded from mye_pitch_database.csv by scripts/seed.ts
--   'sheet'  — imported from MYE Google Spreadsheet by scripts/import-mye-sheet.ts
--   'manual' — hardcoded in seed.ts ipCatalog array or entered via UI
--   'email'  — discovered only through email cross-referencing (no sheet record)
ALTER TABLE ip_catalog ADD COLUMN origin_source TEXT NOT NULL DEFAULT 'csv';

-- Backfill existing rows: sheet_source being set is the reliable signal
-- that a record came from the Google Sheet import.
UPDATE ip_catalog SET origin_source = 'sheet' WHERE sheet_source IS NOT NULL;

-- buyer_contacts: where did the mandate statement come from?
--   'email'  — extracted from a Gmail thread
--   'sheet'  — pulled from the Google Sheet contacts tab
--   'trade'  — scraped from a trade press article
--   'manual' — typed in by a team member
ALTER TABLE buyer_contacts ADD COLUMN mandate_data_source TEXT;
