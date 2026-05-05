-- 002_add_missing_tables.sql
-- Idempotent: adds all tables that were missing from the initial deployment.
-- production_companies is declared before shows so the FK reference resolves correctly.
-- All statements use IF NOT EXISTS so re-runs are safe.

-- ── Production companies (must come before shows for FK resolution) ────────────

CREATE TABLE IF NOT EXISTS production_companies (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  ownership_type  TEXT DEFAULT 'independent',
  parent_company  TEXT,
  genres          TEXT,
  strategic_tag   TEXT DEFAULT 'watch_list',
  notes           TEXT,
  website         TEXT,
  hq_city         TEXT,
  created_at      INTEGER,
  updated_at      INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prodco_name ON production_companies(name_normalized);

-- ── Buyer companies ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_companies (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT,
  tier       TEXT,
  hq_city    TEXT,
  notes      TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- ── Buyer contacts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_contacts (
  id                       TEXT PRIMARY KEY,
  company_id               TEXT REFERENCES buyer_companies(id),
  name                     TEXT NOT NULL,
  email                    TEXT,
  title                    TEXT,
  mandate_statement        TEXT,
  mandate_source           TEXT,
  mandate_source_url       TEXT,
  mandate_date             INTEGER,
  last_greenlit_date       INTEGER,
  orders_last_90_days      INTEGER DEFAULT 0,
  orders_last_365_days     INTEGER DEFAULT 0,
  activity_status          TEXT DEFAULT 'unknown',
  last_mye_contact_date    INTEGER,
  last_mye_contact_outcome TEXT,
  mye_pitch_count          INTEGER DEFAULT 0,
  company_history          TEXT,
  notes                    TEXT,
  region                   TEXT DEFAULT 'us',
  is_former                INTEGER DEFAULT 0,
  phone                    TEXT,
  coverage_notes           TEXT,
  linkedin_url             TEXT,
  former_role              TEXT,
  outreach_priority        INTEGER DEFAULT 0,
  role_type                TEXT DEFAULT 'buyer_exec',
  is_buyer_seat            INTEGER DEFAULT 1,
  production_type_focus    TEXT DEFAULT 'independent',
  mandate_data_source      TEXT,
  created_at               INTEGER,
  updated_at               INTEGER
);

-- ── IP catalog ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ip_catalog (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  logline               TEXT,
  format                TEXT,
  genre                 TEXT,
  subgenre              TEXT,
  episode_count         INTEGER,
  status                TEXT,
  rights_status         TEXT,
  rights_expiry         INTEGER,
  seasons_count         INTEGER,
  is_library            INTEGER DEFAULT 0,
  notes                 TEXT,
  sheet_source          TEXT,
  sheet_status          TEXT,
  sheet_point_person    TEXT,
  sheet_target_nets     TEXT,
  sheet_pitched_to      TEXT,
  sheet_passed          TEXT,
  sheet_next_steps      TEXT,
  sheet_attachments     TEXT,
  sheet_raw_status      TEXT,
  extracted_date        TEXT,
  date_confidence       TEXT DEFAULT 'none',
  brainstorm_rank       INTEGER,
  sheet_row_key         TEXT,
  sheet_other_materials TEXT,
  sheet_sent_materials  TEXT,
  sheet_signed          TEXT,
  sheet_talent_email    TEXT,
  origin_source         TEXT NOT NULL DEFAULT 'csv',
  created_at            INTEGER,
  updated_at            INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_sheet_row_key
  ON ip_catalog(sheet_row_key)
  WHERE sheet_row_key IS NOT NULL;

-- ── Pitches ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pitches (
  id               TEXT PRIMARY KEY,
  ip_id            TEXT REFERENCES ip_catalog(id),
  buyer_company_id TEXT REFERENCES buyer_companies(id),
  buyer_contact_id TEXT REFERENCES buyer_contacts(id),
  pitch_date       INTEGER,
  format_pitched   TEXT,
  outcome          TEXT,
  pass_reason      TEXT,
  pass_reason_cat  TEXT,
  thread_id        TEXT,
  notes            TEXT,
  created_at       INTEGER
);

-- ── Packages ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS packages (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  ip_id              TEXT REFERENCES ip_catalog(id),
  target_company_id  TEXT REFERENCES buyer_companies(id),
  target_contact_id  TEXT REFERENCES buyer_contacts(id),
  created_by         TEXT,
  pipeline_stage     TEXT DEFAULT 'proposal',
  stage_entered_at   INTEGER,
  days_in_stage      INTEGER DEFAULT 0,
  status             TEXT DEFAULT 'draft',
  narrative          TEXT,
  comp_show_ids      TEXT,
  ask_format         TEXT,
  ask_episode_count  INTEGER,
  ask_deal_structure TEXT,
  created_at         INTEGER,
  updated_at         INTEGER
);

-- ── Shows ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shows (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  title_normalized     TEXT,
  network              TEXT,
  network_id           TEXT REFERENCES buyer_companies(id),
  buyer_contact_name   TEXT,
  buyer_contact_id     TEXT REFERENCES buyer_contacts(id),
  production_company   TEXT,
  production_company_2 TEXT,
  showrunner           TEXT,
  executive_producers  TEXT,
  host                 TEXT,
  talent               TEXT,
  format               TEXT,
  genre                TEXT,
  subgenre             TEXT,
  is_unscripted        INTEGER DEFAULT 1,
  episode_count        INTEGER,
  season_number        INTEGER,
  runtime_mins         INTEGER,
  order_type           TEXT,
  status               TEXT,
  greenlit_date        INTEGER,
  production_start     INTEGER,
  premiere_date        INTEGER,
  location_type        TEXT,
  primary_state        TEXT,
  primary_city         TEXT,
  primary_country      TEXT,
  filming_states       TEXT,
  location_notes       TEXT,
  source               TEXT,
  source_url           TEXT,
  raw_article          TEXT,
  imdb_id              TEXT,
  tmdb_id              TEXT,
  prodco_id            TEXT REFERENCES production_companies(id),
  prodco_2_id          TEXT REFERENCES production_companies(id),
  production_type      TEXT DEFAULT 'independent',
  data_source          TEXT NOT NULL DEFAULT 'manual',
  ip_catalog_id        TEXT REFERENCES ip_catalog(id),
  air_status           TEXT DEFAULT 'on_air',
  is_our_show          INTEGER DEFAULT 0,
  total_seasons        INTEGER,
  schedule             TEXT,
  off_air_date         INTEGER,
  tvmaze_id            INTEGER,
  notes                TEXT,
  search_vector        tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(genre, '') || ' ' ||
      COALESCE(production_company, '') || ' ' ||
      COALESCE(network, '') || ' ' ||
      COALESCE(host, '') || ' ' ||
      COALESCE(showrunner, '') || ' ' ||
      COALESCE(location_notes, '')
    )
  ) STORED,
  created_at           INTEGER,
  updated_at           INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_dedup     ON shows(title_normalized, network);
CREATE INDEX        IF NOT EXISTS idx_shows_search    ON shows USING GIN(search_vector);
CREATE INDEX        IF NOT EXISTS idx_shows_air_status  ON shows(air_status);
CREATE INDEX        IF NOT EXISTS idx_shows_is_our_show ON shows(is_our_show);

-- ── Trade articles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trade_articles (
  id            TEXT PRIMARY KEY,
  source        TEXT,
  url           TEXT UNIQUE,
  headline      TEXT,
  body          TEXT,
  item_type     TEXT,
  scraped_at    INTEGER,
  embedded      INTEGER DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(headline, '') || ' ' || COALESCE(body, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_articles_search ON trade_articles USING GIN(search_vector);

-- ── Market orders ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_orders (
  id               TEXT PRIMARY KEY,
  show_id          TEXT REFERENCES shows(id),
  show_title       TEXT,
  network          TEXT,
  buyer_company_id TEXT REFERENCES buyer_companies(id),
  buyer_contact_id TEXT REFERENCES buyer_contacts(id),
  format           TEXT,
  genre            TEXT,
  episode_count    INTEGER,
  order_type       TEXT,
  order_date       INTEGER,
  source           TEXT,
  source_url       TEXT,
  created_at       INTEGER
);

-- ── Supporting tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mandate_updates (
  id          TEXT PRIMARY KEY,
  contact_id  TEXT REFERENCES buyer_contacts(id),
  statement   TEXT NOT NULL,
  source      TEXT,
  source_url  TEXT,
  stated_date INTEGER,
  scraped_at  INTEGER
);

CREATE TABLE IF NOT EXISTS talent (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  primary_role      TEXT,
  mye_relationship  TEXT,
  last_contact      INTEGER,
  notes             TEXT,
  talent_tier       TEXT DEFAULT 'relationship',
  genre_fit         TEXT,
  digital_platforms TEXT
);

CREATE TABLE IF NOT EXISTS ip_talent (
  ip_id     TEXT REFERENCES ip_catalog(id),
  talent_id TEXT REFERENCES talent(id),
  role      TEXT,
  PRIMARY KEY (ip_id, talent_id)
);

CREATE TABLE IF NOT EXISTS content_partners (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  type               TEXT,
  access_description TEXT,
  genres_unlocked    TEXT,
  deal_expiry        INTEGER,
  contact_name       TEXT,
  contact_email      TEXT,
  notes              TEXT,
  agency             TEXT
);

CREATE TABLE IF NOT EXISTS ip_content_partners (
  ip_id      TEXT REFERENCES ip_catalog(id),
  partner_id TEXT REFERENCES content_partners(id),
  notes      TEXT,
  PRIMARY KEY (ip_id, partner_id)
);

CREATE TABLE IF NOT EXISTS package_talent (
  package_id TEXT REFERENCES packages(id),
  talent_id  TEXT REFERENCES talent(id),
  PRIMARY KEY (package_id, talent_id)
);

CREATE TABLE IF NOT EXISTS package_content_partners (
  package_id TEXT REFERENCES packages(id),
  partner_id TEXT REFERENCES content_partners(id),
  PRIMARY KEY (package_id, partner_id)
);

CREATE TABLE IF NOT EXISTS package_emails (
  id              TEXT PRIMARY KEY,
  package_id      TEXT REFERENCES packages(id),
  gmail_thread_id TEXT,
  subject         TEXT,
  sender          TEXT,
  received_at     INTEGER,
  grok_signal     TEXT,
  grok_raw        TEXT,
  stage_moved_to  TEXT,
  processed_at    INTEGER
);

CREATE TABLE IF NOT EXISTS deals (
  id           TEXT PRIMARY KEY,
  show_id      TEXT REFERENCES shows(id),
  show_title   TEXT,
  network_id   TEXT REFERENCES buyer_companies(id),
  network_name TEXT,
  buyer_id     TEXT REFERENCES buyer_contacts(id),
  buyer_name   TEXT,
  prodco_id    TEXT REFERENCES production_companies(id),
  prodco_name  TEXT,
  deal_type    TEXT DEFAULT 'commission',
  genre        TEXT,
  format       TEXT,
  deal_date    INTEGER,
  source       TEXT,
  source_url   TEXT,
  notes        TEXT,
  created_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_deals_buyer   ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_prodco  ON deals(prodco_id);
CREATE INDEX IF NOT EXISTS idx_deals_network ON deals(network_id);
CREATE INDEX IF NOT EXISTS idx_deals_show    ON deals(show_id);
CREATE INDEX IF NOT EXISTS idx_deals_date    ON deals(deal_date);

CREATE TABLE IF NOT EXISTS buyer_employer_history (
  id            TEXT PRIMARY KEY,
  contact_id    TEXT NOT NULL REFERENCES buyer_contacts(id),
  company_name  TEXT NOT NULL,
  company_type  TEXT,
  title         TEXT,
  is_buyer_seat INTEGER DEFAULT 0,
  start_date    INTEGER,
  end_date      INTEGER,
  created_at    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_emp_history_contact ON buyer_employer_history(contact_id);

CREATE TABLE IF NOT EXISTS ip_production_companies (
  ip_id        TEXT REFERENCES ip_catalog(id),
  prodco_id    TEXT REFERENCES production_companies(id),
  relationship TEXT DEFAULT 'co_pro',
  notes        TEXT,
  PRIMARY KEY (ip_id, prodco_id)
);

CREATE TABLE IF NOT EXISTS scraper_runs (
  id           TEXT PRIMARY KEY,
  source       TEXT NOT NULL,
  started_at   INTEGER,
  completed_at INTEGER,
  status       TEXT,
  items_found  INTEGER DEFAULT 0,
  error_msg    TEXT
);

CREATE TABLE IF NOT EXISTS scraper_source_status (
  source               TEXT PRIMARY KEY,
  display_name         TEXT,
  enabled              INTEGER DEFAULT 1,
  last_run_at          INTEGER,
  last_success_at      INTEGER,
  last_items           INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingestion_log (
  id          TEXT PRIMARY KEY,
  source_type TEXT,
  source_id   TEXT,
  ingested_at INTEGER,
  chunk_count INTEGER,
  status      TEXT
);

CREATE TABLE IF NOT EXISTS story_scout (
  id             TEXT PRIMARY KEY,
  headline       TEXT NOT NULL,
  summary        TEXT,
  link           TEXT,
  project_banner TEXT,
  article_rights TEXT,
  action_notes   TEXT,
  ip_catalog_id  TEXT REFERENCES ip_catalog(id),
  created_at     TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_email_threads (
  id                 TEXT PRIMARY KEY,
  ip_catalog_id      TEXT NOT NULL REFERENCES ip_catalog(id),
  thread_id          TEXT NOT NULL,
  subject            TEXT,
  participants       TEXT,
  first_message_date TEXT,
  last_message_date  TEXT,
  message_count      INTEGER DEFAULT 1,
  snippet            TEXT,
  direction          TEXT,
  source             TEXT DEFAULT 'gmail-live',
  match_confidence   TEXT DEFAULT 'exact',
  created_at         TEXT DEFAULT NOW(),
  UNIQUE(ip_catalog_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_ip   ON project_email_threads(ip_catalog_id);
CREATE INDEX IF NOT EXISTS idx_pet_date ON project_email_threads(first_message_date);

CREATE TABLE IF NOT EXISTS sizzle_reels (
  id             TEXT PRIMARY KEY,
  ip_catalog_id  TEXT NOT NULL REFERENCES ip_catalog(id),
  title          TEXT,
  vimeo_url      TEXT,
  vimeo_password TEXT,
  platform       TEXT DEFAULT 'vimeo',
  raw_value      TEXT,
  sheet_source   TEXT,
  notes          TEXT,
  created_at     TEXT DEFAULT NOW()
);

CREATE INDEX        IF NOT EXISTS idx_sizzle_ip     ON sizzle_reels(ip_catalog_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sizzle_unique ON sizzle_reels(ip_catalog_id, raw_value);

CREATE TABLE IF NOT EXISTS pitch_decks (
  id            TEXT PRIMARY KEY,
  ip_catalog_id TEXT NOT NULL REFERENCES ip_catalog(id),
  material_type TEXT DEFAULT 'deck',
  deck_url      TEXT,
  raw_value     TEXT,
  sheet_source  TEXT,
  notes         TEXT,
  created_at    TEXT DEFAULT NOW()
);

CREATE INDEX        IF NOT EXISTS idx_deck_ip     ON pitch_decks(ip_catalog_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_unique ON pitch_decks(ip_catalog_id, raw_value);

CREATE TABLE IF NOT EXISTS dev_tasks (
  id               TEXT PRIMARY KEY,
  ip_catalog_id    TEXT REFERENCES ip_catalog(id),
  task_description TEXT NOT NULL,
  assigned_to      TEXT,
  deadline         TEXT,
  section          TEXT,
  status           TEXT DEFAULT 'open',
  created_at       TEXT DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pitch_portals (
  id         TEXT PRIMARY KEY,
  package_id TEXT REFERENCES packages(id),
  slug       TEXT UNIQUE,
  pdf_path   TEXT,
  sent_at    INTEGER,
  sent_to    TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS team_users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT,
  created_at INTEGER
);
