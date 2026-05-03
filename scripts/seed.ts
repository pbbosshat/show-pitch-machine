// Seed script — parses the real MYE pitch CSV and populates all foundation tables.
// Run via: npx tsx scripts/seed.ts
// Safe to re-run — all inserts use INSERT OR IGNORE.

// Suppress node:sqlite experimental warning on startup
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import fs from 'node:fs';
import path from 'node:path';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { initDb, run, query, getDb } from '../lib/db';

function createPasswordHash(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// ── Run migrations first ─────────────────────────────────────────────────────
initDb();

// ── CSV parsing ──────────────────────────────────────────────────────────────

const CSV_PATH =
  process.env.PITCH_CSV_PATH ||
  'C:/Users/pb/Documents/Claude Code Local/My Entertainment/mye_pitch_database.csv';

interface CsvRow {
  show_name: string;
  date: string;
  network: string;
  buyer_name: string;
  buyer_email: string;
  outcome: string;
  genre: string;
  msg_count: string;
  thread_id: string;
  notes: string;
}

const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRow[];

// ── Helpers ──────────────────────────────────────────────────────────────────

const now = Date.now();

// Normalize a network name to a buyer type classification
function networkType(name: string): string {
  const n = name.toLowerCase();
  if (/netflix|prime|hulu|disney\+|apple\s*tv|peacock|max\b|paramount\+/.test(n)) return 'streamer';
  if (/nbc|cbs|abc|fox|cnn|msnbc/.test(n)) return 'network';
  if (/hbo|wbd|discovery|a\+e|aenetwork|paramount(?!\+)|lifetime|history/.test(n)) return 'major';
  return 'mid';
}

function networkTier(type: string): string {
  if (type === 'streamer') return 'A';
  if (type === 'major') return 'A';
  if (type === 'network') return 'A';
  return 'B';
}

// Parse "Last, First (Company)" → "First Last" or return as-is
function parseBuyerName(raw: string): string {
  if (!raw || raw.trim() === '') return raw;
  // Match "Last, First (Company)" or "Last, First"
  const match = raw.match(/^([^,]+),\s*([^(]+)(?:\s*\([^)]*\))?$/);
  if (match) {
    const last = match[1].trim();
    const first = match[2].trim();
    return `${first} ${last}`;
  }
  return raw.trim();
}

// Parse date strings like "Wed, 4 Mar" — no year in CSV, infer from context.
// Most rows appear to span 2023-2025; we use 2025 as default and 2024 for rows
// that seem older based on their thread IDs (older IDs = older emails).
function parsePitchDate(dateStr: string, threadId: string): number {
  if (!dateStr || dateStr.trim() === '') return now;
  // Older thread IDs (shorter hex values) tend to be 2023-2024
  const threadNum = parseInt(threadId.slice(0, 4), 16);
  // Rough heuristic: thread IDs below 0x194 are likely 2023-2024
  const year = threadNum < 0x194 ? 2024 : 2025;
  const cleaned = dateStr.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*/i, '').trim();
  const parsed = new Date(`${cleaned} ${year}`);
  return isNaN(parsed.getTime()) ? now : parsed.getTime();
}

// Map CSV outcome string to normalized outcome value
function mapOutcome(raw: string): string {
  const map: Record<string, string> = {
    'Pass': 'pass',
    'Greenlit/Deal': 'greenlit',
    'In Production': 'in-production',
    'Meeting Scheduled': 'meeting',
    'Acknowledged': 'acknowledged',
    'Under Review': 'in-review',
    'Unknown': 'unknown',
  };
  return map[raw?.trim()] ?? 'unknown';
}

// Admin/non-pitch rows to skip — these are internal emails, not actual pitch records
const SKIP_NAMES = new Set([
  'joe townley', 'shawn moffatt', 'connectuing.', 'ga weekly check-in',
  'development paperwork', 'my entertainment & assignment desk and a+e office space',
  'lease invoice for january 2025', 'discovery - revised clock',
  'my entertainment guest wed. jan. 15 (tomorrow)',
  '14 days in gainesville', 'ai slop',
  'welcome to upfront 2025 - here is your viewing link',
  'please confirm your email address',
]);

// Calendar invite / zoom link patterns that pollute the IP catalog
const ZOOM_PATTERN = /(\d+:\d+\s*(am|pm)\s*\|)|zoom|invitation:|declined:|accepted:|moving\s+\d|weekly check-in/i;

function isRealPitch(row: CsvRow): boolean {
  const name = row.show_name?.trim().toLowerCase() ?? '';
  // Skip rows with no network (can't attribute to a buyer)
  if (!row.network?.trim()) return false;
  // Skip internal/admin emails
  if (SKIP_NAMES.has(name)) return false;
  // Skip calendar invites and Zoom links masquerading as show names
  if (ZOOM_PATTERN.test(row.show_name?.trim() ?? '')) return false;
  // Skip rows where buyer name looks like an internal person or is a team member
  const buyer = row.buyer_name?.trim().toLowerCase() ?? '';
  if (['shawn moffatt', 'joe townley', 'michael yudin'].includes(buyer)) return false;
  // Skip empty show names or very short strings
  if (name.length < 3) return false;
  // Skip rows where show_name is just a person's name (no spaces = likely a contact row)
  if (name.match(/^[a-z]+\s*$/) && name.length < 12) return false;
  return true;
}

// ── Step 1: Team Users ────────────────────────────────────────────────────────

// Ensure auth columns exist before we try to write password_hash
const _db = getDb();
for (const col of ['password_hash TEXT', 'updated_at INTEGER', 'password_reset_token TEXT', 'password_reset_expires INTEGER']) {
  try { _db.exec(`ALTER TABLE team_users ADD COLUMN ${col}`); } catch { /* already exists */ }
}

const teamUsers = [
  { name: 'Shawn Moffatt', email: 'sm@gototeam.com',              role: 'owner' },
  { name: 'CC',             email: 'cc@gototeam.com',              role: 'admin' },
  { name: 'Admin',          email: '1@gototeam.com',               role: 'owner' },
  { name: 'Michael Yudin',  email: 'myudin@myentprod.com',         role: 'exec'  },
  { name: 'Joe Townley',    email: 'jtownley@myentprod.com',       role: 'exec'  },
  { name: 'Kerry Miles',    email: 'kmiles@myentprod.com',         role: 'exec'  },
  { name: 'Logan Gagliardi',email: 'lgagliardi@myentprod.com',     role: 'exec'  },
  { name: 'Patrick Bryant', email: 'patrickbryant@gototeam.com',   role: 'admin' },
];

let seededUsers = 0;
for (const u of teamUsers) {
  const result = run(
    'INSERT OR IGNORE INTO team_users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), u.name, u.email, u.role, now]
  );
  seededUsers += result.changes;
}

// Ensure sm@gototeam.com has owner role (may already exist in DB with old 'admin' role)
run("UPDATE team_users SET role = 'owner' WHERE email = 'sm@gototeam.com'");

// Set password for 1@gototeam.com — INSERT OR IGNORE won't overwrite existing hash
const adminUser = query<{ id: string; password_hash: string | null }>(
  "SELECT id, password_hash FROM team_users WHERE email = '1@gototeam.com'"
)[0];
if (adminUser && !adminUser.password_hash) {
  run('UPDATE team_users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [createPasswordHash('Mye5t6y7u*I'), now, adminUser.id]);
  console.log('Set password for 1@gototeam.com');
}

console.log(`Team users: ${seededUsers} inserted`);

// ── Step 2: Content Partners ──────────────────────────────────────────────────

const contentPartners = [
  {
    name: 'Daily Mail',
    type: 'news-archive',
    access_description: 'Unbelievable archive + reporters as talent',
    genres_unlocked: 'Documentary,Reality/Unscripted,True Crime',
  },
  {
    name: 'Al Roker Entertainment',
    type: 'co-production',
    access_description: 'Weather, sports, family content',
    genres_unlocked: 'Nature/Weather,Sports,Documentary',
  },
  {
    name: 'Getty Images',
    type: 'licensing',
    access_description: 'Premium visual archive',
    genres_unlocked: 'Documentary,True Crime,Sports',
  },
  {
    name: 'Billboard',
    type: 'music/entertainment',
    access_description: 'Music industry data + access',
    genres_unlocked: 'Documentary,Reality/Unscripted',
  },
];

let seededPartners = 0;
for (const p of contentPartners) {
  const result = run(
    `INSERT OR IGNORE INTO content_partners
       (id, name, type, access_description, genres_unlocked)
     VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), p.name, p.type, p.access_description, p.genres_unlocked]
  );
  seededPartners += result.changes;
}
console.log(`Content partners: ${seededPartners} inserted`);

// ── Step 3: Buyer Companies ───────────────────────────────────────────────────

// Collect unique networks, filtering out non-buyer entries (personal emails, etc.)
const NON_BUYER_DOMAINS = ['gmail.com', 'hotmail.com', 'stevehelling.com', 'ducksoupmedia.com',
  'alroker.com', 'blueantmedia.com', 'pelmorex.com', 'omalleyproductions.com',
  'highnoontv.com', 'thebrandview.com', 'channel4.com', 'om.cynopsis.com'];

function isRealNetwork(network: string): boolean {
  if (!network?.trim()) return false;
  const lower = network.toLowerCase();
  // Skip personal email domains masquerading as companies
  return !NON_BUYER_DOMAINS.some((d) => lower.includes(d));
}

const companyMap = new Map<string, string>(); // network name → company ID

// Also manually add HBO/WBD since some rows use "HBO/WBD" as the network
const allNetworks = new Set(
  rows
    .filter((r) => isRealNetwork(r.network))
    .map((r) => r.network.trim())
);

let seededCompanies = 0;
for (const name of allNetworks) {
  const type = networkType(name);
  const tier = networkTier(type);
  const id = uuidv4();
  const result = run(
    `INSERT OR IGNORE INTO buyer_companies (id, name, type, tier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, type, tier, now, now]
  );
  if (result.changes > 0) {
    companyMap.set(name, id);
    seededCompanies++;
  } else {
    // Already existed — look up the ID so we can use it for contacts
    const existing = query<{ id: string }>('SELECT id FROM buyer_companies WHERE name = ?', [name])[0];
    if (existing) companyMap.set(name, existing.id);
  }
}
console.log(`Buyer companies: ${seededCompanies} inserted`);

// ── Step 4: Buyer Contacts ────────────────────────────────────────────────────

// Greenlit contacts in the last year → activity_status = 'active'
const greenlitEmails = new Set(
  rows
    .filter((r) => r.outcome === 'Greenlit/Deal' && r.buyer_email?.trim())
    .map((r) => r.buyer_email.trim().toLowerCase())
);

const contactMap = new Map<string, string>(); // email → contact ID

// Deduplicate by email (primary) or name+company combo
const seenContactEmails = new Map<string, string>(); // email → contact ID
const seenContactNames = new Map<string, string>(); // "name|company" → contact ID

let seededContacts = 0;

for (const row of rows) {
  if (!row.buyer_name?.trim() && !row.buyer_email?.trim()) continue;
  if (!isRealNetwork(row.network)) continue;

  const email = row.buyer_email?.trim().toLowerCase() ?? '';
  const rawName = row.buyer_name?.trim() ?? '';
  const parsedName = parseBuyerName(rawName);
  const companyId = companyMap.get(row.network.trim()) ?? null;
  const dedupeKey = `${parsedName.toLowerCase()}|${row.network.toLowerCase()}`;

  // Skip if we already have this contact by email or name+company
  if (email && seenContactEmails.has(email)) {
    contactMap.set(email, seenContactEmails.get(email)!);
    continue;
  }
  if (!email && seenContactNames.has(dedupeKey)) {
    continue;
  }

  const activityStatus = email && greenlitEmails.has(email) ? 'active' : 'unknown';
  const id = uuidv4();

  const result = run(
    `INSERT OR IGNORE INTO buyer_contacts
       (id, company_id, name, email, activity_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, companyId, parsedName || rawName, email || null, activityStatus, now, now]
  );

  if (result.changes > 0) {
    seededContacts++;
    if (email) {
      seenContactEmails.set(email, id);
      contactMap.set(email, id);
    }
    seenContactNames.set(dedupeKey, id);
  } else if (email) {
    // Lookup existing ID for FK use
    const existing = query<{ id: string }>(
      'SELECT id FROM buyer_contacts WHERE email = ?',
      [email]
    )[0];
    if (existing) contactMap.set(email, existing.id);
  }
}
console.log(`Buyer contacts: ${seededContacts} inserted`);

// ── Step 5: IP Catalog (from CSV) ────────────────────────────────────────────

// Real MYE IP titles extracted from CSV — normalized to deduplicate variants
const ipTitleMap = new Map<string, string>(); // normalized title → ip ID

// Normalize title for dedup: lowercase, strip punctuation, collapse whitespace
function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Real show titles found in CSV (manually curated list from data review)
const csvIpTitles = new Set([
  'Ghost Adventures',
  'Storm Warriors',
  'Murder on Music Row',
  'Gotta Catch \'Em All: Inside the Pokemon Crime Wave',
  'Inside the Pokémon Crime Wave',
  'The Art of Murder: The Trial of Brian Walshe',
  'PITCH | Trial of Brian Walshe (My Entertainment x See It Now)',
  'Susan Smith',
  'Reza Farahan!',
  'Heirloom Hunters',
  'Gone Viral: What Went Wrong,',
  'Pros Vs Joes Skydance Sports Deck',
  'PvJ',
  'Twisted Alibis',
  'Buried Secrets',
  'New Series - Stolen Babies',
  'I Hate with Melissa Gorga.',
  'Daily Mail',
  'Development projects',
  'Sports Doc',
  'Sports doc/film',
  'Mets Documentary',
  'Summer of \'69 Mets',
  'B-roll question',
  'Texas Justice.',
  'Pros Vs Joes and Dick\'s Sporting goods',
]);

// Gather unique show names from CSV rows that look like real pitches
const pitchRows = rows.filter(isRealPitch);
const uniqueShowNames = new Set(pitchRows.map((r) => r.show_name.trim()));

let seededIps = 0;
for (const rawTitle of uniqueShowNames) {
  const norm = normalizeTitle(rawTitle);
  if (ipTitleMap.has(norm)) continue;

  // Clean up title — strip trailing punctuation, normalize capitalization
  const cleanTitle = rawTitle
    .replace(/,\s*$/, '')
    .replace(/!\s*$/, '')
    .trim();

  // Infer genre from the most common genre in CSV rows for this show
  const showRows = pitchRows.filter((r) => r.show_name.trim() === rawTitle);
  const genreCounts = new Map<string, number>();
  for (const r of showRows) {
    if (r.genre?.trim()) {
      genreCounts.set(r.genre.trim(), (genreCounts.get(r.genre.trim()) ?? 0) + 1);
    }
  }
  const genre = genreCounts.size > 0
    ? [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  const id = uuidv4();
  const result = run(
    `INSERT OR IGNORE INTO ip_catalog
       (id, title, genre, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
    [id, cleanTitle, genre, now, now]
  );

  if (result.changes > 0) {
    ipTitleMap.set(norm, id);
    seededIps++;
  } else {
    const existing = query<{ id: string }>(
      'SELECT id FROM ip_catalog WHERE title = ?',
      [cleanTitle]
    )[0];
    if (existing) ipTitleMap.set(norm, existing.id);
  }
}

// ── Step 5b: MYE IP Catalog (hardcoded pitchable properties) ─────────────────

const ipCatalog = [
  {
    title: 'Ghost Adventures',
    genre: 'Paranormal',
    format: 'unscripted-series',
    logline: 'Zak Bagans and crew investigate the world\'s most haunted locations.',
    status: 'active',
    is_library: 0,
    seasons_count: 22,
  },
  {
    title: 'Gone Viral: What Went Wrong',
    genre: 'Documentary',
    format: 'limited-series',
    logline:
      'Rebecca Black, Antoine Dodson, Chris Crocker — less nostalgia, more reexamination of what happened to viral sensations.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'Pros vs. Joes Revival',
    genre: 'Sports',
    format: 'competition',
    logline:
      'Celebrity athletes face off against everyday fans in high-stakes competitions. Original Fox format returns.',
    status: 'active',
    is_library: 0,
  },
  {
    title: "Gotta Catch 'Em All: Inside the Pokémon Crime Wave",
    genre: 'True Crime',
    format: 'limited-series',
    logline:
      'A premium limited series exploring the darker side of the beloved global franchise — theft, fraud, and obsession in the Pokémon underground.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'Storm Warriors',
    genre: 'Nature/Weather',
    format: 'unscripted-series',
    logline:
      'Elite storm chasers risk everything to document and predict the world\'s most violent weather events.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'Murder on Music Row',
    genre: 'True Crime',
    format: 'limited-series',
    logline: 'The rights to an 8-episode podcast adaptation exploring Nashville\'s most notorious murder.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'The Art of Murder: Trial of Brian Walshe',
    genre: 'True Crime',
    format: 'limited-series',
    logline: 'A timely, buzzy limited series on the Brian Walshe murder trial — national attention, real access.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'Reza Farahan: Unfiltered',
    genre: 'Documentary',
    format: 'limited-series',
    logline: 'A deeper look at Reza Farahan from Shahs of Sunset, beyond the franchise.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'Heirloom Hunters',
    genre: 'Documentary',
    format: 'unscripted-series',
    logline: 'With Al Roker Entertainment — teams travel America recovering lost family heirlooms.',
    status: 'active',
    is_library: 0,
  },
  {
    title: 'Susan Smith: The Full Story',
    genre: 'True Crime',
    format: 'limited-series',
    logline: 'Exclusive access to David Smith for a definitive examination of the Susan Smith case.',
    status: 'active',
    is_library: 0,
  },
];

for (const ip of ipCatalog) {
  const norm = normalizeTitle(ip.title);
  if (ipTitleMap.has(norm)) continue; // skip if CSV-seeded version already exists

  const id = uuidv4();
  const result = run(
    `INSERT OR IGNORE INTO ip_catalog
       (id, title, logline, format, genre, status, is_library, seasons_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, ip.title, ip.logline ?? null, ip.format ?? null, ip.genre, ip.status,
      ip.is_library, (ip as { seasons_count?: number }).seasons_count ?? null, now, now,
    ]
  );
  if (result.changes > 0) {
    ipTitleMap.set(norm, id);
    seededIps++;
  }
}

console.log(`IP catalog: ${seededIps} inserted`);

// ── Step 6: Pitches ───────────────────────────────────────────────────────────

let seededPitches = 0;
for (const row of pitchRows) {
  const cleanTitle = row.show_name.trim().replace(/,\s*$/, '').replace(/!\s*$/, '').trim();
  const norm = normalizeTitle(row.show_name.trim());
  const ipId = ipTitleMap.get(norm) ?? null;

  const companyId = isRealNetwork(row.network) ? (companyMap.get(row.network.trim()) ?? null) : null;
  const email = row.buyer_email?.trim().toLowerCase() ?? '';
  const contactId = email ? (contactMap.get(email) ?? null) : null;

  const pitchDate = parsePitchDate(row.date, row.thread_id ?? '');
  const outcome = mapOutcome(row.outcome);
  const notes = row.notes?.trim() ? row.notes.slice(0, 500) : null;

  const result = run(
    `INSERT OR IGNORE INTO pitches
       (id, ip_id, buyer_company_id, buyer_contact_id, pitch_date, outcome, thread_id, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(), ipId, companyId, contactId, pitchDate,
      outcome, row.thread_id?.trim() || null, notes, now,
    ]
  );
  seededPitches += result.changes;
}
console.log(`Pitches: ${seededPitches} inserted`);

// ── Step 7: Mock Show Database (comp shows) ───────────────────────────────────

const mockShows = [
  {
    title: 'Ghost Adventures', network: 'Warner Bros. Discovery', genre: 'Paranormal',
    format: 'unscripted-series', episode_count: 13, season_number: 22, status: 'in-production',
    location_type: 'traveling-us', production_company: 'My Entertainment',
    greenlit_date: now - 90 * 86400000,
  },
  {
    title: 'The Hoarder Next Door', network: 'A+E Networks', genre: 'Documentary',
    format: 'unscripted-series', episode_count: 8, status: 'greenlit',
    location_type: 'primary-location', production_company: 'High Noon Entertainment',
  },
  {
    title: 'Deadliest Catch: The Next Generation', network: 'Warner Bros. Discovery',
    genre: 'Reality/Unscripted', format: 'unscripted-series', episode_count: 10, status: 'greenlit',
    location_type: 'traveling-us', production_company: 'Original Productions',
  },
  {
    title: 'Cold Case Files: Revisited', network: 'A+E Networks', genre: 'True Crime',
    format: 'docuseries', episode_count: 6, status: 'greenlit',
    location_type: 'traveling-us', production_company: 'Wheelhouse Entertainment',
  },
  {
    title: 'Storm Season', network: 'NBCUniversal', genre: 'Nature/Weather',
    format: 'unscripted-series', episode_count: 10, status: 'greenlit',
    location_type: 'traveling-us', production_company: 'Leftfield Pictures',
  },
  {
    title: 'The Real Housewives of Dubai', network: 'NBCUniversal', genre: 'Reality/Unscripted',
    format: 'unscripted-series', episode_count: 12, status: 'in-production',
    location_type: 'international', production_company: 'Truly Original',
  },
  {
    title: 'Murder in the Family', network: 'Netflix', genre: 'True Crime',
    format: 'docuseries', episode_count: 4, status: 'greenlit',
    location_type: 'primary-location', production_company: 'Story Films',
  },
  {
    title: 'Greatest Escapes', network: 'Netflix', genre: 'Documentary',
    format: 'docuseries', episode_count: 6, status: 'greenlit',
    location_type: 'traveling-us', production_company: 'Fulwell 73',
  },
  {
    title: 'American Manhunt: The Zodiac Killer', network: 'Netflix', genre: 'True Crime',
    format: 'docuseries', episode_count: 3, status: 'in-production',
    location_type: 'primary-location', production_company: 'Hello Sunshine',
  },
  {
    title: 'Destination Fear', network: 'Warner Bros. Discovery', genre: 'Paranormal',
    format: 'unscripted-series', episode_count: 8, status: 'greenlit',
    location_type: 'traveling-us', production_company: 'Discovery',
  },
  {
    title: '72 Dangerous Animals', network: 'Netflix', genre: 'Nature/Weather',
    format: 'docuseries', episode_count: 12, status: 'in-production',
    location_type: 'international', production_company: 'Terra Mater',
  },
  {
    title: 'Crime Scene Kitchen', network: 'Fox', genre: 'Reality/Unscripted',
    format: 'competition', episode_count: 10, status: 'greenlit',
    location_type: 'studio', production_company: 'Big Fish Entertainment',
  },
  {
    title: 'The NFL 100 Greatest', network: 'Fox', genre: 'Sports',
    format: 'docuseries', episode_count: 5, status: 'in-production',
    location_type: 'studio', production_company: 'NFL Films',
  },
  {
    title: 'On Patrol: Live', network: 'Reelz', genre: 'Reality/Unscripted',
    format: 'live-series', episode_count: 52, status: 'greenlit',
    location_type: 'traveling-us', production_company: 'Big Fish Entertainment',
  },
  {
    title: 'Paranormal Caught on Camera', network: 'Warner Bros. Discovery', genre: 'Paranormal',
    format: 'unscripted-series', episode_count: 13, status: 'greenlit',
    location_type: 'studio', production_company: 'Back Roads Entertainment',
  },
];

let seededShows = 0;
for (const s of mockShows) {
  const titleNorm = normalizeTitle(s.title);
  const networkId = companyMap.get(s.network) ?? null;

  const result = run(
    `INSERT OR IGNORE INTO shows
       (id, title, title_normalized, network, network_id, production_company,
        format, genre, episode_count, season_number, status, greenlit_date,
        location_type, is_unscripted, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'seed', ?, ?)`,
    [
      uuidv4(), s.title, titleNorm, s.network, networkId, s.production_company,
      s.format, s.genre,
      (s as { episode_count?: number }).episode_count ?? null,
      (s as { season_number?: number }).season_number ?? null,
      s.status,
      (s as { greenlit_date?: number }).greenlit_date ?? null,
      s.location_type, now, now,
    ]
  );
  if (result.changes > 0) {
    seededShows++;
    // Keep FTS5 table in sync with the main shows table
    run(
      `INSERT INTO shows_fts (title, genre, production_company, network, host, showrunner, location_notes)
       VALUES (?, ?, ?, ?, '', '', '')`,
      [s.title, s.genre, s.production_company, s.network]
    );
  }
}
console.log(`Shows (comp database): ${seededShows} inserted`);

// ── Step 8: Scraper Source Status ─────────────────────────────────────────────

const scraperSources = [
  { source: 'deadline', display_name: 'Deadline Hollywood' },
  { source: 'variety', display_name: 'Variety' },
  { source: 'thr', display_name: 'The Hollywood Reporter' },
  { source: 'c21', display_name: 'C21 Media' },
  { source: 'realscreen', display_name: 'Realscreen' },
  { source: 'cynopsis', display_name: 'Cynopsis' },
  { source: 'tvline', display_name: 'TVLine' },
  { source: 'indiewire', display_name: 'IndieWire' },
  { source: 'bc', display_name: 'Broadcasting & Cable' },
  { source: 'production-weekly', display_name: 'Production Weekly' },
  { source: 'cynopsis.com', display_name: 'Cynopsis (newsletter)' },
  { source: 'worldscreen.com', display_name: 'World Screen' },
  { source: 'mediapost.com', display_name: 'MediaPost' },
  { source: 'tvnewscheck.com', display_name: 'TV NewsCheck' },
  { source: 'senalnews.com', display_name: 'Señal News' },
  { source: 'broadbandtvnews.com', display_name: 'Broadband TV News' },
  { source: 'nexttv.com', display_name: 'Next TV' },
  { source: 'playbackonline.ca', display_name: 'Playback Online' },
];

let seededSources = 0;
for (const s of scraperSources) {
  const result = run(
    `INSERT OR IGNORE INTO scraper_source_status (source, display_name, enabled) VALUES (?, ?, 1)`,
    [s.source, s.display_name]
  );
  seededSources += result.changes;
}
console.log(`Scraper sources: ${seededSources} inserted`);

// ── Summary ───────────────────────────────────────────────────────────────────

const finalCompanies = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM buyer_companies')[0]?.cnt ?? 0;
const finalContacts = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM buyer_contacts')[0]?.cnt ?? 0;
const finalIps = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM ip_catalog')[0]?.cnt ?? 0;
const finalPitches = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM pitches')[0]?.cnt ?? 0;
const finalShows = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM shows')[0]?.cnt ?? 0;

console.log(`\nSeeded: ${finalCompanies} companies, ${finalContacts} contacts, ${finalIps} IPs, ${finalPitches} pitches, ${finalShows} shows`);
