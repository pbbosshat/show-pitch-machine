-- migrations/001_schema.sql

CREATE TABLE IF NOT EXISTS team_users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  role       TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS buyer_companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT,
  tier        TEXT,
  hq_city     TEXT,
  notes       TEXT,
  created_at  INTEGER,
  updated_at  INTEGER
);

CREATE TABLE IF NOT EXISTS buyer_contacts (
  id                    TEXT PRIMARY KEY,
  company_id            TEXT REFERENCES buyer_companies(id),
  name                  TEXT NOT NULL,
  email                 TEXT,
  title                 TEXT,
  mandate_statement     TEXT,
  mandate_source        TEXT,
  mandate_source_url    TEXT,
  mandate_date          INTEGER,
  last_greenlit_date    INTEGER,
  orders_last_90_days   INTEGER DEFAULT 0,
  orders_last_365_days  INTEGER DEFAULT 0,
  activity_status       TEXT DEFAULT 'unknown',
  last_mye_contact_date    INTEGER,
  last_mye_contact_outcome TEXT,
  mye_pitch_count          INTEGER DEFAULT 0,
  company_history       TEXT,
  notes                 TEXT,
  created_at            INTEGER,
  updated_at            INTEGER,
  pitch_exclude         INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mandate_updates (
  id               TEXT PRIMARY KEY,
  contact_id       TEXT REFERENCES buyer_contacts(id),
  statement        TEXT NOT NULL,
  source           TEXT,
  source_url       TEXT,
  stated_date      INTEGER,
  scraped_at       INTEGER
);

CREATE TABLE IF NOT EXISTS ip_catalog (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  logline         TEXT,
  format          TEXT,
  genre           TEXT,
  subgenre        TEXT,
  episode_count   INTEGER,
  status          TEXT,
  rights_status   TEXT,
  rights_expiry   INTEGER,
  seasons_count   INTEGER,
  is_library      INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      INTEGER,
  updated_at      INTEGER
);

CREATE TABLE IF NOT EXISTS talent (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  primary_role     TEXT,
  mye_relationship TEXT,
  last_contact     INTEGER,
  notes            TEXT
);

CREATE TABLE IF NOT EXISTS ip_talent (
  ip_id      TEXT REFERENCES ip_catalog(id),
  talent_id  TEXT REFERENCES talent(id),
  role       TEXT,
  PRIMARY KEY (ip_id, talent_id)
);

CREATE TABLE IF NOT EXISTS content_partners (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  type                TEXT,
  access_description  TEXT,
  genres_unlocked     TEXT,
  deal_expiry         INTEGER,
  contact_name        TEXT,
  contact_email       TEXT,
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS ip_content_partners (
  ip_id       TEXT REFERENCES ip_catalog(id),
  partner_id  TEXT REFERENCES content_partners(id),
  notes       TEXT,
  PRIMARY KEY (ip_id, partner_id)
);

CREATE TABLE IF NOT EXISTS pitches (
  id                 TEXT PRIMARY KEY,
  ip_id              TEXT REFERENCES ip_catalog(id),
  buyer_company_id   TEXT REFERENCES buyer_companies(id),
  buyer_contact_id   TEXT REFERENCES buyer_contacts(id),
  pitch_date         INTEGER,
  format_pitched     TEXT,
  outcome            TEXT,
  pass_reason        TEXT,
  pass_reason_cat    TEXT,
  thread_id          TEXT,
  notes              TEXT,
  created_at         INTEGER
);

CREATE TABLE IF NOT EXISTS packages (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  ip_id                   TEXT REFERENCES ip_catalog(id),
  target_company_id       TEXT REFERENCES buyer_companies(id),
  target_contact_id       TEXT REFERENCES buyer_contacts(id),
  created_by              TEXT,
  pipeline_stage          TEXT DEFAULT 'proposal',
  stage_entered_at        INTEGER,
  days_in_stage           INTEGER DEFAULT 0,
  status                  TEXT DEFAULT 'draft',
  narrative               TEXT,
  comp_show_ids           TEXT,
  ask_format              TEXT,
  ask_episode_count       INTEGER,
  ask_deal_structure      TEXT,
  created_at              INTEGER,
  updated_at              INTEGER
);

CREATE TABLE IF NOT EXISTS package_talent (
  package_id  TEXT REFERENCES packages(id),
  talent_id   TEXT REFERENCES talent(id),
  PRIMARY KEY (package_id, talent_id)
);

CREATE TABLE IF NOT EXISTS package_content_partners (
  package_id  TEXT REFERENCES packages(id),
  partner_id  TEXT REFERENCES content_partners(id),
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

CREATE TABLE IF NOT EXISTS pitch_portals (
  id           TEXT PRIMARY KEY,
  package_id   TEXT REFERENCES packages(id),
  slug         TEXT UNIQUE,
  pdf_path     TEXT,
  sent_at      INTEGER,
  sent_to      TEXT,
  created_at   INTEGER
);

CREATE TABLE IF NOT EXISTS shows (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  title_normalized      TEXT,
  network               TEXT,
  network_id            TEXT REFERENCES buyer_companies(id),
  buyer_contact_name    TEXT,
  buyer_contact_id      TEXT REFERENCES buyer_contacts(id),
  production_company    TEXT,
  production_company_2  TEXT,
  showrunner            TEXT,
  executive_producers   TEXT,
  host                  TEXT,
  talent                TEXT,
  format                TEXT,
  genre                 TEXT,
  subgenre              TEXT,
  is_unscripted         INTEGER DEFAULT 1,
  episode_count         INTEGER,
  season_number         INTEGER,
  runtime_mins          INTEGER,
  order_type            TEXT,
  status                TEXT,
  greenlit_date         INTEGER,
  production_start      INTEGER,
  premiere_date         INTEGER,
  location_type         TEXT,
  primary_state         TEXT,
  primary_city          TEXT,
  primary_country       TEXT,
  filming_states        TEXT,
  location_notes        TEXT,
  source                TEXT,
  source_url            TEXT,
  raw_article           TEXT,
  imdb_id               TEXT,
  tmdb_id               TEXT,
  created_at            INTEGER,
  updated_at            INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_dedup ON shows(title_normalized, network);

CREATE VIRTUAL TABLE IF NOT EXISTS shows_fts USING fts5(
  title, genre, production_company, network, host, showrunner, location_notes
);

CREATE TABLE IF NOT EXISTS trade_articles (
  id           TEXT PRIMARY KEY,
  source       TEXT,
  url          TEXT UNIQUE,
  headline     TEXT,
  body         TEXT,
  item_type    TEXT,
  scraped_at   INTEGER,
  embedded     INTEGER DEFAULT 0
);

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
