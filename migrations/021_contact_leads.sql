-- 021_contact_leads.sql
-- Contact lead capture + site settings table.
-- Postgres conversions:
--   • `INSERT OR IGNORE` → `INSERT … ON CONFLICT (key) DO NOTHING`
--   • `unixepoch() * 1000` → `(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`

CREATE TABLE IF NOT EXISTS contact_leads (
  id         TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed the default lead notification email.
INSERT INTO site_settings (key, value, updated_at)
VALUES ('leads_email', 'sm@gototeam.com', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
ON CONFLICT (key) DO NOTHING;
