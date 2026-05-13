-- 005_people_and_prodcos.sql
-- Adds production company tracking, deal intelligence, employer history for buyer
-- contacts, and the triangulation layer linking buyers × prodcos × networks via deals.
--
-- Postgres conversion: `ADD COLUMN IF NOT EXISTS` everywhere (idempotent).

-- ── production_companies ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_companies (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  name_normalized  TEXT NOT NULL,         -- lowercase trim for dedup
  ownership_type   TEXT DEFAULT 'independent',  -- 'independent' | 'studio_owned' | 'network_owned'
  parent_company   TEXT,                  -- if studio/network owned, who owns them
  genres           TEXT,                  -- JSON array of primary genres they make
  strategic_tag    TEXT DEFAULT 'watch_list',  -- 'co_pro_partner' | 'acquisition_target' | 'competitor' | 'watch_list'
  notes            TEXT,
  website          TEXT,
  hq_city          TEXT,
  created_at       INTEGER,
  updated_at       INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prodco_name ON production_companies(name_normalized);

-- ── deals ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deals (
  id           TEXT PRIMARY KEY,
  show_id      TEXT REFERENCES shows(id),
  show_title   TEXT,                    -- denormalized for when show isn't in DB yet
  network_id   TEXT REFERENCES buyer_companies(id),
  network_name TEXT,                    -- denormalized
  buyer_id     TEXT REFERENCES buyer_contacts(id),
  buyer_name   TEXT,                    -- denormalized
  prodco_id    TEXT REFERENCES production_companies(id),
  prodco_name  TEXT,                    -- denormalized
  deal_type    TEXT DEFAULT 'commission',  -- 'commission' | 'co_production' | 'acquisition' | 'format_sale'
  genre        TEXT,
  format       TEXT,
  deal_date    INTEGER,
  source       TEXT,                    -- trade publication where we learned this
  source_url   TEXT,
  notes        TEXT,
  created_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deals_buyer   ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_prodco  ON deals(prodco_id);
CREATE INDEX IF NOT EXISTS idx_deals_network ON deals(network_id);
CREATE INDEX IF NOT EXISTS idx_deals_show    ON deals(show_id);
CREATE INDEX IF NOT EXISTS idx_deals_date    ON deals(deal_date);

-- ── ip_production_companies ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ip_production_companies (
  ip_id        TEXT REFERENCES ip_catalog(id),
  prodco_id    TEXT REFERENCES production_companies(id),
  relationship TEXT DEFAULT 'co_pro',  -- 'co_pro' | 'service' | 'distribution'
  notes        TEXT,
  PRIMARY KEY (ip_id, prodco_id)
);

-- ── buyer_employer_history ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_employer_history (
  id            TEXT PRIMARY KEY,
  contact_id    TEXT NOT NULL REFERENCES buyer_contacts(id),
  company_name  TEXT NOT NULL,
  company_type  TEXT,                  -- 'network' | 'streamer' | 'cable' | 'prodco' | 'studio'
  title         TEXT,
  is_buyer_seat INTEGER DEFAULT 0,    -- 1 if title is a dev/programming/acquisitions role
  start_date    INTEGER,
  end_date      INTEGER,              -- NULL = current position
  created_at    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_emp_history_contact ON buyer_employer_history(contact_id);

-- ── Extend buyer_contacts ─────────────────────────────────────────────────────

ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS role_type             TEXT DEFAULT 'buyer_exec';
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS is_buyer_seat         INTEGER DEFAULT 1;
ALTER TABLE buyer_contacts ADD COLUMN IF NOT EXISTS production_type_focus TEXT DEFAULT 'independent';

-- ── Extend shows ──────────────────────────────────────────────────────────────

ALTER TABLE shows ADD COLUMN IF NOT EXISTS prodco_id       TEXT REFERENCES production_companies(id);
ALTER TABLE shows ADD COLUMN IF NOT EXISTS prodco_2_id     TEXT REFERENCES production_companies(id);
ALTER TABLE shows ADD COLUMN IF NOT EXISTS production_type TEXT DEFAULT 'independent';
