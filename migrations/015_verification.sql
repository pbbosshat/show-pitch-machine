-- 015_verification.sql
-- Adds is_verified / verified_at / verified_by columns to 5 tables so we can
-- distinguish records that a human has reviewed from raw scraped/unreviewed data.
--
-- Postgres conversions:
--   • `unixepoch() * 1000` → `(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`
--   • `ADD COLUMN IF NOT EXISTS` for idempotency.

-- ── buyer_contacts ────────────────────────────────────────────────────────────
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS verified_by TEXT;

UPDATE buyer_contacts
SET is_verified = 1,
    verified_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    verified_by = 'system:migration'
WHERE is_verified = 0;

-- ── production_companies ──────────────────────────────────────────────────────
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE production_companies ADD COLUMN IF NOT EXISTS verified_by TEXT;

UPDATE production_companies
SET is_verified = 1,
    verified_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    verified_by = 'system:migration'
WHERE is_verified = 0;

-- ── shows ─────────────────────────────────────────────────────────────────────
ALTER TABLE shows ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE shows ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Only verify non-trade shows: 'manual' and 'sheet' data_source rows are trusted.
UPDATE shows
SET is_verified = 1,
    verified_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    verified_by = 'system:migration'
WHERE data_source IN ('manual', 'sheet') OR data_source IS NULL;

-- ── mandate_updates ───────────────────────────────────────────────────────────
ALTER TABLE mandate_updates ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;
ALTER TABLE mandate_updates ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE mandate_updates ADD COLUMN IF NOT EXISTS verified_by TEXT;

UPDATE mandate_updates
SET is_verified = 1,
    verified_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    verified_by = 'system:migration'
WHERE source IS NULL OR source NOT IN ('trade', 'scraper');

-- ── market_orders ─────────────────────────────────────────────────────────────
ALTER TABLE market_orders ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;
ALTER TABLE market_orders ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE market_orders ADD COLUMN IF NOT EXISTS verified_by TEXT;
-- All market_orders come from scrapers — leave is_verified=0 (no UPDATE).
