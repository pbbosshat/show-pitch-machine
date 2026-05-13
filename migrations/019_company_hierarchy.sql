-- 019_company_hierarchy.sql
-- Adds self-referential parent_id to buyer_companies for department grouping.
-- A row with parent_id = NULL is a top-level entity (parent or standalone).
-- A row with parent_id SET is a department/division of that parent.

ALTER TABLE buyer_companies ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES buyer_companies(id);
