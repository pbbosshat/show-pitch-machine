-- 035_int_to_bigint.sql
-- HOTFIX: Widen all ms-epoch INTEGER columns to BIGINT on tables that were
-- already created by migrations 001-014 (applied before this fix landed).
--
-- WHY this exists:
--   Postgres INTEGER is strict 32-bit (max ~2.1B). The app stores ms-epoch
--   values via Date.now(), which is ~1.77 TRILLION in 2026. Every deployment
--   after migration 015 was crashing with "integer out of range" on INSERT.
--
--   Migrations 015+ have been fixed in-place (they hadn't run yet on Railway).
--   This migration fixes the already-applied tables created by 001-014.
--
-- SAFETY: ALTER COLUMN ... TYPE BIGINT on an already-BIGINT column is a no-op
--   in Postgres (no rewrite, no lock escalation, idempotent). Safe to re-run.
--
-- SCOPE: Only columns that store milliseconds-since-epoch (Date.now() values).
--   Boolean 0/1 INTEGER columns, small ID integers, counts, and ranks are
--   intentionally left as INTEGER.

-- ── team_users (001) ─────────────────────────────────────────────────────────
ALTER TABLE team_users ALTER COLUMN created_at TYPE BIGINT;

-- ── buyer_companies (001) ─────────────────────────────────────────────────────
ALTER TABLE buyer_companies ALTER COLUMN created_at TYPE BIGINT;
ALTER TABLE buyer_companies ALTER COLUMN updated_at TYPE BIGINT;

-- ── buyer_contacts (001) ──────────────────────────────────────────────────────
ALTER TABLE buyer_contacts ALTER COLUMN mandate_date          TYPE BIGINT;
ALTER TABLE buyer_contacts ALTER COLUMN last_greenlit_date    TYPE BIGINT;
ALTER TABLE buyer_contacts ALTER COLUMN last_mye_contact_date TYPE BIGINT;
ALTER TABLE buyer_contacts ALTER COLUMN created_at            TYPE BIGINT;
ALTER TABLE buyer_contacts ALTER COLUMN updated_at            TYPE BIGINT;

-- ── mandate_updates (001) ─────────────────────────────────────────────────────
ALTER TABLE mandate_updates ALTER COLUMN stated_date TYPE BIGINT;
ALTER TABLE mandate_updates ALTER COLUMN scraped_at  TYPE BIGINT;

-- ── ip_catalog (001) ──────────────────────────────────────────────────────────
ALTER TABLE ip_catalog ALTER COLUMN rights_expiry TYPE BIGINT;
ALTER TABLE ip_catalog ALTER COLUMN created_at    TYPE BIGINT;
ALTER TABLE ip_catalog ALTER COLUMN updated_at    TYPE BIGINT;

-- ── talent (001) ──────────────────────────────────────────────────────────────
ALTER TABLE talent ALTER COLUMN last_contact TYPE BIGINT;

-- ── content_partners (001) ───────────────────────────────────────────────────
ALTER TABLE content_partners ALTER COLUMN deal_expiry TYPE BIGINT;

-- ── pitches (001) ────────────────────────────────────────────────────────────
ALTER TABLE pitches ALTER COLUMN pitch_date  TYPE BIGINT;
ALTER TABLE pitches ALTER COLUMN created_at  TYPE BIGINT;

-- ── packages (001) ────────────────────────────────────────────────────────────
ALTER TABLE packages ALTER COLUMN stage_entered_at TYPE BIGINT;
ALTER TABLE packages ALTER COLUMN created_at       TYPE BIGINT;
ALTER TABLE packages ALTER COLUMN updated_at       TYPE BIGINT;

-- ── package_emails (001) ──────────────────────────────────────────────────────
ALTER TABLE package_emails ALTER COLUMN received_at  TYPE BIGINT;
ALTER TABLE package_emails ALTER COLUMN processed_at TYPE BIGINT;

-- ── pitch_portals (001) ───────────────────────────────────────────────────────
ALTER TABLE pitch_portals ALTER COLUMN sent_at     TYPE BIGINT;
ALTER TABLE pitch_portals ALTER COLUMN created_at  TYPE BIGINT;

-- ── shows (001) ───────────────────────────────────────────────────────────────
ALTER TABLE shows ALTER COLUMN greenlit_date     TYPE BIGINT;
ALTER TABLE shows ALTER COLUMN production_start  TYPE BIGINT;
ALTER TABLE shows ALTER COLUMN premiere_date     TYPE BIGINT;
ALTER TABLE shows ALTER COLUMN created_at        TYPE BIGINT;
ALTER TABLE shows ALTER COLUMN updated_at        TYPE BIGINT;

-- ── trade_articles (001) ──────────────────────────────────────────────────────
ALTER TABLE trade_articles ALTER COLUMN scraped_at TYPE BIGINT;

-- ── market_orders (001) ───────────────────────────────────────────────────────
ALTER TABLE market_orders ALTER COLUMN order_date  TYPE BIGINT;
ALTER TABLE market_orders ALTER COLUMN created_at  TYPE BIGINT;

-- ── scraper_runs (001) ────────────────────────────────────────────────────────
ALTER TABLE scraper_runs ALTER COLUMN started_at   TYPE BIGINT;
ALTER TABLE scraper_runs ALTER COLUMN completed_at TYPE BIGINT;

-- ── scraper_source_status (001) ───────────────────────────────────────────────
ALTER TABLE scraper_source_status ALTER COLUMN last_run_at     TYPE BIGINT;
ALTER TABLE scraper_source_status ALTER COLUMN last_success_at TYPE BIGINT;

-- ── ingestion_log (001) ───────────────────────────────────────────────────────
ALTER TABLE ingestion_log ALTER COLUMN ingested_at TYPE BIGINT;

-- ── site_shows (002) ──────────────────────────────────────────────────────────
ALTER TABLE site_shows ALTER COLUMN created_at TYPE BIGINT;
ALTER TABLE site_shows ALTER COLUMN updated_at TYPE BIGINT;

-- ── press_releases (002) ──────────────────────────────────────────────────────
ALTER TABLE press_releases ALTER COLUMN published_at TYPE BIGINT;
ALTER TABLE press_releases ALTER COLUMN created_at   TYPE BIGINT;
ALTER TABLE press_releases ALTER COLUMN updated_at   TYPE BIGINT;

-- ── available_titles (002) ────────────────────────────────────────────────────
ALTER TABLE available_titles ALTER COLUMN created_at TYPE BIGINT;
ALTER TABLE available_titles ALTER COLUMN updated_at TYPE BIGINT;

-- ── site_content (002) ────────────────────────────────────────────────────────
ALTER TABLE site_content ALTER COLUMN updated_at TYPE BIGINT;

-- ── production_companies (005) ────────────────────────────────────────────────
ALTER TABLE production_companies ALTER COLUMN created_at TYPE BIGINT;
ALTER TABLE production_companies ALTER COLUMN updated_at TYPE BIGINT;

-- ── deals (005) ───────────────────────────────────────────────────────────────
ALTER TABLE deals ALTER COLUMN deal_date  TYPE BIGINT;
ALTER TABLE deals ALTER COLUMN created_at TYPE BIGINT;

-- ── buyer_employer_history (005) ──────────────────────────────────────────────
ALTER TABLE buyer_employer_history ALTER COLUMN start_date TYPE BIGINT;
ALTER TABLE buyer_employer_history ALTER COLUMN end_date   TYPE BIGINT;
ALTER TABLE buyer_employer_history ALTER COLUMN created_at TYPE BIGINT;

-- ── deck_sites (007) ──────────────────────────────────────────────────────────
ALTER TABLE deck_sites ALTER COLUMN created_at TYPE BIGINT;
ALTER TABLE deck_sites ALTER COLUMN updated_at TYPE BIGINT;

-- ── deck_slides (007) ─────────────────────────────────────────────────────────
ALTER TABLE deck_slides ALTER COLUMN created_at TYPE BIGINT;

-- ── shows.off_air_date (011) — added via ALTER in migration 011 ───────────────
ALTER TABLE shows ALTER COLUMN off_air_date TYPE BIGINT;

-- ── prodco_contacts (012) ────────────────────────────────────────────────────
ALTER TABLE prodco_contacts ALTER COLUMN created_at TYPE BIGINT;

-- ── prodco_email_threads (012) ───────────────────────────────────────────────
ALTER TABLE prodco_email_threads ALTER COLUMN last_date TYPE BIGINT;
