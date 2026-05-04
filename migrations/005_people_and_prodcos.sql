-- migrations/005_people_and_prodcos.sql
-- Adds production company tracking, deal intelligence, employer history for buyer contacts,
-- and the triangulation layer linking buyers × prodcos × networks via deal data.
--
-- Runs exactly once via initDb() migration tracker in lib/db.ts.
-- All ALTER TABLE statements are safe here because initDb() skips already-applied files.

-- ── production_companies ──────────────────────────────────────────────────────
-- The companies that actually *make* shows — separate from buyer_companies (networks/platforms).
-- Tracks ownership structure so we know which indie prodcos are truly independent
-- vs. which are studio-backed and less likely to need a co-pro partner.

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

-- Dedup guard — two prodcos cannot have the same normalized name
CREATE UNIQUE INDEX IF NOT EXISTS idx_prodco_name ON production_companies(name_normalized);

-- ── deals ─────────────────────────────────────────────────────────────────────
-- Core triangulation junction: buyer × prodco × network × show, sourced from trade press.
-- Denormalized name columns let us record deals for entities not yet in our DB
-- (e.g. a show we've scraped but not imported, or a prodco we haven't catalogued yet).

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

-- Separate indexes so triangulation queries can hit one dimension at a time
CREATE INDEX IF NOT EXISTS idx_deals_buyer   ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_prodco  ON deals(prodco_id);
CREATE INDEX IF NOT EXISTS idx_deals_network ON deals(network_id);
CREATE INDEX IF NOT EXISTS idx_deals_show    ON deals(show_id);
CREATE INDEX IF NOT EXISTS idx_deals_date    ON deals(deal_date);

-- ── ip_production_companies ───────────────────────────────────────────────────
-- Junction: our IP catalog projects ↔ prodco partners.
-- Tracks whether the prodco is co-producing with MYE, providing production services,
-- or handling distribution — these have very different deal structure implications.

CREATE TABLE IF NOT EXISTS ip_production_companies (
  ip_id        TEXT REFERENCES ip_catalog(id),
  prodco_id    TEXT REFERENCES production_companies(id),
  relationship TEXT DEFAULT 'co_pro',  -- 'co_pro' | 'service' | 'distribution'
  notes        TEXT,
  PRIMARY KEY (ip_id, prodco_id)
);

-- ── buyer_employer_history ────────────────────────────────────────────────────
-- Tracks where each buyer contact has worked so we know when they move networks.
-- Buyer mobility is high-signal intelligence: a buyer who moves from A&E to Netflix
-- is a warm contact at a new network, not a cold call.

CREATE TABLE IF NOT EXISTS buyer_employer_history (
  id            TEXT PRIMARY KEY,
  contact_id    TEXT NOT NULL REFERENCES buyer_contacts(id),
  company_name  TEXT NOT NULL,
  company_type  TEXT,                  -- 'network' | 'streamer' | 'cable' | 'prodco' | 'studio'
  title         TEXT,
  is_buyer_seat INTEGER DEFAULT 0,    -- 1 if title is a development/programming/acquisitions role
  start_date    INTEGER,
  end_date      INTEGER,              -- NULL = current position
  created_at    INTEGER
);

-- Fast lookup by contact so we can build full career timelines
CREATE INDEX IF NOT EXISTS idx_emp_history_contact ON buyer_employer_history(contact_id);

-- ── Extend buyer_contacts ─────────────────────────────────────────────────────

-- Distinguishes actual buyers from in-house staff, showrunners, talent, agents
-- who may be in our contacts list but aren't commissioning shows
ALTER TABLE buyer_contacts ADD COLUMN role_type TEXT DEFAULT 'buyer_exec';
-- 'buyer_exec' | 'staff_producer' | 'showrunner' | 'talent' | 'agent'

-- 1 if their current title is a buying/development seat (vs in-house creative/staff role)
ALTER TABLE buyer_contacts ADD COLUMN is_buyer_seat INTEGER DEFAULT 1;

-- Tracks whether this exec tends to commission indie prodcos or use in-house production
ALTER TABLE buyer_contacts ADD COLUMN production_type_focus TEXT DEFAULT 'independent';
-- 'independent' | 'in_house' | 'mixed'

-- ── Extend shows ──────────────────────────────────────────────────────────────

-- FK to the production company that made this show — replaces the free-text production_company
-- column for any show we've catalogued the prodco for
ALTER TABLE shows ADD COLUMN prodco_id  TEXT REFERENCES production_companies(id);

-- Second prodco slot — co-productions are common; most shows have at most two named prodcos
ALTER TABLE shows ADD COLUMN prodco_2_id TEXT REFERENCES production_companies(id);

-- Whether the network used its own in-house production arm or commissioned an indie
ALTER TABLE shows ADD COLUMN production_type TEXT DEFAULT 'independent';
-- 'independent' | 'in_house'
