// Runs on Bang: applies migration 027 columns if missing, then dumps
// deck_sites + unlinked package_emails as one JSON object to stdout.
// Called by match-emails-to-decks.ts via SSH.

const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/db.sqlite');

// Apply migration 027 columns to package_emails if not already present.
// Using PRAGMA table_info avoids the "duplicate column" error on repeated runs.
const emailCols = db.prepare('PRAGMA table_info(package_emails)').all().map(c => c.name);
if (!emailCols.includes('deck_id'))           db.exec('ALTER TABLE package_emails ADD COLUMN deck_id TEXT');
if (!emailCols.includes('buyer_contact_id'))  db.exec('ALTER TABLE package_emails ADD COLUMN buyer_contact_id TEXT');
if (!emailCols.includes('attachment_source')) db.exec("ALTER TABLE package_emails ADD COLUMN attachment_source TEXT DEFAULT 'auto'");

// Ensure deck_buyers and deck_meetings tables exist (migration 027).
// Idempotent — IF NOT EXISTS guards.
db.exec(`CREATE TABLE IF NOT EXISTS deck_buyers (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  buyer_contact_id TEXT,
  sent_at INTEGER,
  pipeline_stage TEXT DEFAULT 'sent',
  notes TEXT,
  created_at INTEGER
);`);
db.exec(`CREATE TABLE IF NOT EXISTS deck_meetings (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  buyer_contact_id TEXT,
  meeting_date INTEGER,
  meeting_type TEXT DEFAULT 'call',
  notes TEXT,
  outcome TEXT,
  created_at INTEGER
);`);

// Apply migration 028 columns to deck_sites if not already present.
const deckCols = db.prepare('PRAGMA table_info(deck_sites)').all().map(c => c.name);
if (!deckCols.includes('theme_color')) db.exec('ALTER TABLE deck_sites ADD COLUMN theme_color TEXT');

// Ensure deck_sizzles table exists (migration 028).
db.exec(`CREATE TABLE IF NOT EXISTS deck_sizzles (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  vimeo_url TEXT NOT NULL,
  title TEXT,
  password TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER
);`);

const decks  = db.prepare('SELECT id, title, subtitle, genre, format FROM deck_sites ORDER BY title').all();
const emails = db.prepare(
  'SELECT id, gmail_thread_id, subject, sender, received_at FROM package_emails WHERE deck_id IS NULL ORDER BY received_at DESC'
).all();

process.stdout.write(JSON.stringify({ decks, emails }));
db.close();
