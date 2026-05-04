-- CMPA (Canadian Media Producers Association) membership enrichment.
-- Marks which production companies are verified CMPA members and stores
-- CMPA-sourced platform/model data from the member directory spreadsheet.

ALTER TABLE production_companies ADD COLUMN is_cmpa_member INTEGER DEFAULT 0;
ALTER TABLE production_companies ADD COLUMN primary_platform TEXT;
ALTER TABLE production_companies ADD COLUMN production_model TEXT;

CREATE INDEX IF NOT EXISTS idx_prodco_cmpa ON production_companies(is_cmpa_member);
