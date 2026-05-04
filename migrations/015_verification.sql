-- migrations/015_verification.sql
-- Adds is_verified / verified_at / verified_by columns to 5 tables so we can
-- distinguish records that a human has reviewed from raw scraped/unreviewed data.
--
-- Auto-verifies existing trusted records (sheet imports, manual entries) that
-- we know are clean. Scraper-sourced records remain is_verified=0 for later review.
-- Runs exactly once via initDb() migration tracker in lib/db.ts.

-- ── buyer_contacts ────────────────────────────────────────────────────────────
ALTER TABLE buyer_contacts ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE buyer_contacts ADD COLUMN verified_at  INTEGER;
ALTER TABLE buyer_contacts ADD COLUMN verified_by  TEXT;

-- All existing buyer_contacts came from sheet/CSV/manual import — none from scrapers.
UPDATE buyer_contacts
SET is_verified = 1,
    verified_at  = (unixepoch() * 1000),
    verified_by  = 'system:migration'
WHERE is_verified = 0;

-- ── production_companies ──────────────────────────────────────────────────────
ALTER TABLE production_companies ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE production_companies ADD COLUMN verified_at  INTEGER;
ALTER TABLE production_companies ADD COLUMN verified_by  TEXT;

-- All existing production_companies came from sheet import / manual entry.
UPDATE production_companies
SET is_verified = 1,
    verified_at  = (unixepoch() * 1000),
    verified_by  = 'system:migration'
WHERE is_verified = 0;

-- ── shows ─────────────────────────────────────────────────────────────────────
ALTER TABLE shows ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE shows ADD COLUMN verified_at  INTEGER;
ALTER TABLE shows ADD COLUMN verified_by  TEXT;

-- Only verify non-trade shows: 'manual' and 'sheet' data_source rows are trusted.
-- 'trade' = scraped from trade press — leave unverified for human review.
UPDATE shows
SET is_verified = 1,
    verified_at  = (unixepoch() * 1000),
    verified_by  = 'system:migration'
WHERE data_source IN ('manual', 'sheet') OR data_source IS NULL;

-- ── mandate_updates ───────────────────────────────────────────────────────────
ALTER TABLE mandate_updates ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE mandate_updates ADD COLUMN verified_at  INTEGER;
ALTER TABLE mandate_updates ADD COLUMN verified_by  TEXT;

-- Verify only non-trade, non-scraper mandate entries; those sourced from
-- 'trade' or 'scraper' remain unverified until a human reviews the statement.
UPDATE mandate_updates
SET is_verified = 1,
    verified_at  = (unixepoch() * 1000),
    verified_by  = 'system:migration'
WHERE source IS NULL OR source NOT IN ('trade', 'scraper');

-- ── market_orders ─────────────────────────────────────────────────────────────
ALTER TABLE market_orders ADD COLUMN is_verified INTEGER DEFAULT 0;
ALTER TABLE market_orders ADD COLUMN verified_at  INTEGER;
ALTER TABLE market_orders ADD COLUMN verified_by  TEXT;

-- All market_orders come from scrapers — leave is_verified=0 (no UPDATE).
