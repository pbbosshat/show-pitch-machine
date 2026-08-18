-- 045_contact_leads_submission_release.sql
-- Records the MY Entertainment Submissions Release agreement alongside the lead
-- that it applies to, plus the material-identifying fields the release itself
-- asks for (title, nature, page count) and a phone number.
--
-- WHY these live on contact_leads rather than a separate `submission_releases`
-- table: the agreement is strictly 1:1 with the submission it covers — a lead
-- has at most one release, and a release has no meaning apart from its lead.
-- A join table would add a JOIN to every dashboard read and every export for
-- no modelling benefit. This matches the precedent set by 041 (attribution).
--
-- WHY every column is nullable / defaulted: contact_leads already holds live
-- production rows, and three of the four public entry points that write to it
-- are deliberately NOT gated by the release (see `source` below). A NOT NULL
-- column would fail the migration against existing rows and break those forms.
--
-- EVIDENTIARY INTENT: release_accepted alone is a claim; the surrounding
-- columns are what make it demonstrable after the fact. Together they record
-- WHO agreed (release_signature), to WHAT exact wording (release_version),
-- WHEN (release_accepted_at) and FROM WHERE (release_ip). Do not drop any of
-- them without understanding that they exist to evidence an agreement.

ALTER TABLE contact_leads
  -- Which public form produced this lead. Drives server-side release enforcement
  -- in app/api/contact/route.ts: 'pitch' and 'work-with-us' REQUIRE a release;
  -- every other value (and NULL) does not.
  --
  -- NULL is the correct default for historical rows and for the ten
  -- /available/[slug] one-sheet forms, which are buyers REQUESTING materials
  -- from MY Entertainment — the opposite direction of travel from a show
  -- submission, and nothing a submissions release should ever gate.
  ADD COLUMN IF NOT EXISTS source              TEXT,

  -- Contact + material identification, mirroring the fields on the paper release.
  -- NOTE: the paper form also has an Address line, deliberately not collected
  -- here — it was scoped out to limit form friction. Add it if counsel wants it.
  ADD COLUMN IF NOT EXISTS phone               TEXT,
  ADD COLUMN IF NOT EXISTS material_title      TEXT,     -- "Title:" on the release
  ADD COLUMN IF NOT EXISTS material_nature     TEXT,     -- treatment | outline | teaser tape | …
  ADD COLUMN IF NOT EXISTS material_pages      INTEGER,  -- "Number of pages (including title…)"

  -- The agreement record itself.
  ADD COLUMN IF NOT EXISTS release_accepted    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS release_signature   TEXT,     -- full legal name, typed as signature
  ADD COLUMN IF NOT EXISTS release_version     TEXT,     -- e.g. '2026-08-18' — which wording was shown
  ADD COLUMN IF NOT EXISTS release_accepted_at BIGINT,   -- Unix epoch ms, consistent with created_at
  ADD COLUMN IF NOT EXISTS release_ip          TEXT;     -- client IP at time of acceptance

-- Dashboard/export filters group by entry point ("show me pitch submissions").
CREATE INDEX IF NOT EXISTS contact_leads_source_idx ON contact_leads (source);

-- Supports the operational query that matters most: surfacing any submission
-- that arrived through a gated channel WITHOUT an accepted release, which is
-- the signal that someone bypassed the form and posted to the API directly.
CREATE INDEX IF NOT EXISTS contact_leads_release_accepted_idx
  ON contact_leads (release_accepted);
