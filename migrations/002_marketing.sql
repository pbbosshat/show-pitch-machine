-- 002_marketing.sql
-- Marketing CMS tables for the public-facing myentertainment.tv site.
-- Separate from the internal pitch machine tables — these power the rebuilt Webflow site.

CREATE TABLE IF NOT EXISTS site_shows (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  tagline        TEXT,
  description    TEXT,
  genre          TEXT,
  network        TEXT,
  seasons        INTEGER,
  episode_count  INTEGER,
  -- active = on air | available = for sale/licensing | archived = off market
  status         TEXT DEFAULT 'active',
  image_url      TEXT,
  hero_image_url TEXT,
  is_featured    INTEGER DEFAULT 0,
  sort_order     INTEGER DEFAULT 0,
  imdb_url       TEXT,
  created_at     INTEGER,
  updated_at     INTEGER
);

CREATE TABLE IF NOT EXISTS site_genres (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0
);

-- Many-to-many: a show can span multiple genres
CREATE TABLE IF NOT EXISTS site_show_genres (
  show_id  TEXT REFERENCES site_shows(id) ON DELETE CASCADE,
  genre_id TEXT REFERENCES site_genres(id) ON DELETE CASCADE,
  PRIMARY KEY (show_id, genre_id)
);

CREATE TABLE IF NOT EXISTS site_networks (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  slug     TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  -- broadcast | cable | streaming | international
  type     TEXT
);

CREATE TABLE IF NOT EXISTS press_releases (
  id           TEXT PRIMARY KEY,
  headline     TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  excerpt      TEXT,
  body         TEXT,
  source       TEXT,
  source_url   TEXT,
  published_at INTEGER,
  is_featured  INTEGER DEFAULT 0,
  created_at   INTEGER,
  updated_at   INTEGER
);

CREATE TABLE IF NOT EXISTS available_titles (
  id            TEXT PRIMARY KEY,
  site_show_id  TEXT REFERENCES site_shows(id),
  title         TEXT NOT NULL,
  -- international | domestic | format | coproduction
  rights_type   TEXT,
  markets       TEXT,          -- JSON array of available markets e.g. ["Europe","Asia"]
  seasons       INTEGER,
  episode_count INTEGER,
  runtime_mins  INTEGER,
  genre         TEXT,
  description   TEXT,
  contact_email TEXT DEFAULT 'info@myentertainment.tv',
  is_active     INTEGER DEFAULT 1,
  sort_order    INTEGER DEFAULT 0,
  created_at    INTEGER,
  updated_at    INTEGER
);

-- Key-value store for editable site copy (homepage, about, contact sections).
-- Key convention: 'section.field' e.g. 'homepage.tagline', 'about.body'
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  -- text | html | json | image_url
  type       TEXT DEFAULT 'text',
  updated_at INTEGER
);

-- Seed default content keys so the CMS admin always has something to edit
INSERT OR IGNORE INTO site_content (key, value, type, updated_at) VALUES
  ('homepage.tagline',     'Compelling characters. Great storytelling. Innovative deals. High production value.', 'text', unixepoch()),
  ('homepage.description', 'Independent, New York based production company known for its best-in-class non-fiction and documentary series. Over the past two decades, MyE has produced thousands of hours of content spanning a variety of genres for Discovery, A&E, National Geographic, BBC, Lifetime, MTV, Comedy Central, Travel Channel, Investigation Discovery, Oxygen, Nickelodeon, Food Network, Animal Planet, TruTV, PBS, Reelz and CMT.', 'text', unixepoch()),
  ('about.founded',        '2000', 'text', unixepoch()),
  ('about.acquired',       'Acquired by Media Content Services in 2022', 'text', unixepoch()),
  ('about.offices',        'Manhattan, Toronto, London', 'text', unixepoch()),
  ('contact.email',        'info@myentertainment.tv', 'text', unixepoch()),
  ('contact.address',      '235 E 45th St., Floor 14 West, New York, NY 10017', 'text', unixepoch()),
  ('site.ga4_id',          '', 'text', unixepoch());

-- Seed the 6 genres from the Webflow site
INSERT OR IGNORE INTO site_genres (id, name, slug, sort_order) VALUES
  ('genre-paranormal',    'Paranormal',         'paranormal',    1),
  ('genre-sports',        'Sports + Competition','sports',        2),
  ('genre-home',          'Home + Lifestyle',   'home-lifestyle', 3),
  ('genre-crime',         'Crime',              'crime',         4),
  ('genre-comedy',        'Comedy',             'comedy',        5),
  ('genre-food-travel',   'Food + Travel',      'food-travel',   6);
