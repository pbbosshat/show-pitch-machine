-- 012_prodco_enrichment.sql
-- Enrich production_companies with contact info, social links, and import metadata
-- sourced from the Canadian and US production company Google Spreadsheets.

ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS email             TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS phone             TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS country           TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS region            TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS bio               TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS linkedin_url      TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS twitter_url       TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS youtube_url       TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS facebook_url      TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS organization_type TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS contact_status    TEXT DEFAULT 'N';
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS contacted_detail  TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS current_shows     TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS current_networks  TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS employee_count    TEXT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS source_sheet      TEXT;

CREATE INDEX IF NOT EXISTS idx_prodco_country ON production_companies(country);

-- Named contacts at each prodco (owners, EPs, development execs).
CREATE TABLE IF NOT EXISTS prodco_contacts (
  id              TEXT PRIMARY KEY,
  prodco_id       TEXT NOT NULL REFERENCES production_companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  title           TEXT,
  email           TEXT,
  phone           TEXT,
  linkedin_url    TEXT,
  outreach_status TEXT,
  is_owner        INTEGER DEFAULT 1,
  notes           TEXT,
  created_at      BIGINT
);

CREATE INDEX IF NOT EXISTS idx_prodco_contacts_prodco ON prodco_contacts(prodco_id);
CREATE INDEX IF NOT EXISTS idx_prodco_contacts_email  ON prodco_contacts(email);

-- Gmail thread references so the detail page can surface email history inline.
CREATE TABLE IF NOT EXISTS prodco_email_threads (
  prodco_id   TEXT NOT NULL REFERENCES production_companies(id) ON DELETE CASCADE,
  thread_id   TEXT NOT NULL,
  subject     TEXT,
  snippet     TEXT,
  last_date   BIGINT,
  PRIMARY KEY (prodco_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_prodco_threads_prodco ON prodco_email_threads(prodco_id);
