-- 047_contact_leads_followup.sql
-- Lead follow-up tracking for the Leads tab: a triage status per lead, free-text
-- internal notes, and who last changed the status and when.
--
-- Kept trivial and idempotent on purpose: migrations auto-apply on boot and a
-- failing one crash-loops the whole public site.
-- • status defaults to 'new' so every existing row starts untriaged. Allowed
--   values live in lib/lead-meta.ts (LEAD_STATUSES); no CHECK constraint, so
--   adding a status later never needs a migration.
-- • Existing rows are NOT rewritten. In particular `source` stays NULL where it
--   is NULL today; the UI derives a source key at read time (leadSourceKey).
-- • status_changed_at is epoch milliseconds, matching contact_leads.created_at.

ALTER TABLE contact_leads
  ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at BIGINT,
  ADD COLUMN IF NOT EXISTS status_changed_by TEXT;
CREATE INDEX IF NOT EXISTS contact_leads_status_idx ON contact_leads (status);
