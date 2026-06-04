-- 041_contact_leads_attribution.sql
-- Additive attribution columns for contact_leads.
--
-- WHY additive ALTER TABLE instead of a new table: the attribution data is
-- 1:1 with each lead (one visit → one form submit), so denormalising into
-- contact_leads keeps export queries simple and avoids a JOIN on every read.
-- All columns are nullable so existing rows aren't affected and the migration
-- is safe against a partially-filled table.
--
-- WHY TEXT for all UTM/referrer columns: UTM values are arbitrary strings set
-- by marketers. Using TEXT avoids any length-limit foot-guns (Google Ads can
-- produce very long utm_content values) and keeps comparison queries simple.
--
-- channel is a computed/classified field written at insert time by the
-- classifyChannel() function in app/api/contact/route.ts. Storing it avoids
-- re-running the classification on every export or dashboard read.

ALTER TABLE contact_leads
  ADD COLUMN IF NOT EXISTS utm_source    TEXT,   -- e.g. "google", "facebook", "newsletter"
  ADD COLUMN IF NOT EXISTS utm_medium    TEXT,   -- e.g. "cpc", "organic", "social"
  ADD COLUMN IF NOT EXISTS utm_campaign  TEXT,   -- e.g. "spring-2026"
  ADD COLUMN IF NOT EXISTS utm_term      TEXT,   -- paid keyword, e.g. "tv show pitch"
  ADD COLUMN IF NOT EXISTS utm_content   TEXT,   -- ad/creative variant
  ADD COLUMN IF NOT EXISTS gclid         TEXT,   -- Google Click ID (present → paid_search)
  ADD COLUMN IF NOT EXISTS fbclid        TEXT,   -- Facebook Click ID (present → paid_social)
  ADD COLUMN IF NOT EXISTS landing_page  TEXT,   -- full URL of first page the visitor landed on
  ADD COLUMN IF NOT EXISTS referrer      TEXT,   -- document.referrer at first landing
  ADD COLUMN IF NOT EXISTS channel       TEXT;   -- classified channel: paid_search | paid_social | organic_social | referral | organic_search | direct

-- Index channel for dashboard grouping queries (e.g. "leads by channel this month").
CREATE INDEX IF NOT EXISTS contact_leads_channel_idx ON contact_leads (channel);

-- Index created_at for the export endpoint's time-window cursor.
-- Most queries order by created_at ASC; this index covers both ASC and DESC scans.
CREATE INDEX IF NOT EXISTS contact_leads_created_at_idx ON contact_leads (created_at);
