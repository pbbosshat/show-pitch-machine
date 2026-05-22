-- Newsletter signups table (SEO Option A — fan engagement + show-page email capture).
--
-- V1 scope: store email + optional show context in Postgres; no external provider.
-- show_slug is nullable — signups from generic pages (e.g. homepage) have no slug.
-- source tracks which surface the form was submitted from for segmentation.
-- confirmed is reserved for double opt-in when we wire up Mailchimp/ConvertKit;
--   leave FALSE for all V1 submissions (single opt-in until a provider is live).
-- unsubscribed is the soft-delete flag — we keep the row for audit but exclude
--   it from any export or future provider sync.
--
-- Constraint: one email per source+show_slug combination prevents duplicate
-- submissions from the same show page (e.g. user rage-clicks the button).
-- The same email can legitimately sign up from multiple show pages and each row
-- is tracked separately so we know which shows drive the most engagement.

CREATE TABLE IF NOT EXISTS newsletter_signups (
  id            TEXT        PRIMARY KEY,
  email         TEXT        NOT NULL,
  show_slug     TEXT,                          -- nullable: set when signup originates from a show page
  source        TEXT        NOT NULL DEFAULT 'show-page',
  confirmed     BOOLEAN     NOT NULL DEFAULT FALSE,  -- reserved for double opt-in; always FALSE in V1
  unsubscribed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    BIGINT      NOT NULL           -- Unix epoch milliseconds, consistent with contact_leads
);

-- Index on email for deduplication lookups and future unsubscribe flows.
CREATE INDEX IF NOT EXISTS newsletter_signups_email_idx ON newsletter_signups (email);

-- Index on show_slug for per-show analytics queries.
CREATE INDEX IF NOT EXISTS newsletter_signups_show_slug_idx ON newsletter_signups (show_slug);

-- Index on created_at for sorted admin views.
CREATE INDEX IF NOT EXISTS newsletter_signups_created_at_idx ON newsletter_signups (created_at DESC);
