-- 024_fix_contact_leads_fk.sql
-- contact_leads.available_title_id referenced available_titles(id) which no longer
-- exists — data now lives in deck_sites. Recreate the table with the FK pointing
-- at deck_sites(id) so deck-page contact submissions can be saved and linked.

PRAGMA foreign_keys = OFF;

CREATE TABLE contact_leads_new (
  id                 TEXT PRIMARY KEY,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT NOT NULL,
  message            TEXT,
  created_at         INTEGER NOT NULL,
  company            TEXT,
  available_title_id TEXT REFERENCES deck_sites(id)
);

INSERT INTO contact_leads_new
  SELECT id, first_name, last_name, email, message, created_at, company, available_title_id
  FROM contact_leads;

DROP TABLE contact_leads;
ALTER TABLE contact_leads_new RENAME TO contact_leads;

PRAGMA foreign_keys = ON;
