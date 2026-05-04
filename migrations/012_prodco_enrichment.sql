-- Enrich production_companies with contact info, social links, and import metadata
-- sourced from the Canadian and US production company Google Spreadsheets.

ALTER TABLE production_companies ADD COLUMN email             TEXT;
ALTER TABLE production_companies ADD COLUMN phone             TEXT;
ALTER TABLE production_companies ADD COLUMN country           TEXT;
ALTER TABLE production_companies ADD COLUMN region            TEXT;
ALTER TABLE production_companies ADD COLUMN bio               TEXT;
ALTER TABLE production_companies ADD COLUMN linkedin_url      TEXT;
ALTER TABLE production_companies ADD COLUMN twitter_url       TEXT;
ALTER TABLE production_companies ADD COLUMN youtube_url       TEXT;
ALTER TABLE production_companies ADD COLUMN facebook_url      TEXT;
ALTER TABLE production_companies ADD COLUMN organization_type TEXT;
ALTER TABLE production_companies ADD COLUMN contact_status    TEXT DEFAULT 'N';
ALTER TABLE production_companies ADD COLUMN contacted_detail  TEXT;
ALTER TABLE production_companies ADD COLUMN current_shows     TEXT;
ALTER TABLE production_companies ADD COLUMN current_networks  TEXT;
ALTER TABLE production_companies ADD COLUMN employee_count    TEXT;
ALTER TABLE production_companies ADD COLUMN source_sheet      TEXT;

CREATE INDEX IF NOT EXISTS idx_prodco_country ON production_companies(country);

-- Named contacts at each prodco (owners, EPs, development execs)
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
  created_at      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_prodco_contacts_prodco ON prodco_contacts(prodco_id);
CREATE INDEX IF NOT EXISTS idx_prodco_contacts_email  ON prodco_contacts(email);

-- Gmail thread references so the detail page can surface email history inline
CREATE TABLE IF NOT EXISTS prodco_email_threads (
  prodco_id   TEXT NOT NULL REFERENCES production_companies(id) ON DELETE CASCADE,
  thread_id   TEXT NOT NULL,
  subject     TEXT,
  snippet     TEXT,
  last_date   INTEGER,
  PRIMARY KEY (prodco_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_prodco_threads_prodco ON prodco_email_threads(prodco_id);
