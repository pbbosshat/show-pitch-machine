// Seed the marketing CMS tables with MYE's full catalog from the Webflow scrape.
// Safe to re-run: all inserts use INSERT OR IGNORE.
// Usage: npx tsx scripts/seed-marketing.ts

import { getDb, initDb } from '../lib/db';
import { randomUUID } from 'node:crypto';

initDb();
const db = getDb();

const now = Math.floor(Date.now() / 1000);

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Networks ──────────────────────────────────────────────────────────────────
const networks = [
  { name: 'Discovery',              type: 'cable' },
  { name: 'Discovery+',             type: 'streaming' },
  { name: 'Max',                    type: 'streaming' },
  { name: 'A&E',                    type: 'cable' },
  { name: 'PBS',                    type: 'broadcast' },
  { name: 'BBC',                    type: 'international' },
  { name: 'Lifetime',               type: 'cable' },
  { name: 'MTV',                    type: 'cable' },
  { name: 'Comedy Central',         type: 'cable' },
  { name: 'Travel Channel',         type: 'cable' },
  { name: 'Investigation Discovery',type: 'cable' },
  { name: 'Oxygen',                 type: 'cable' },
  { name: 'Nickelodeon',            type: 'cable' },
  { name: 'Food Network',           type: 'cable' },
  { name: 'Animal Planet',          type: 'cable' },
  { name: 'TruTV',                  type: 'cable' },
  { name: 'Reelz',                  type: 'cable' },
  { name: 'CMT',                    type: 'cable' },
  { name: 'IFC',                    type: 'cable' },
  { name: 'Logo',                   type: 'cable' },
  { name: 'NBC Sports',             type: 'broadcast' },
  { name: 'National Geographic',    type: 'cable' },
  { name: 'Vice',                   type: 'streaming' },
  { name: 'Spike/Paramount Network',type: 'cable' },
  { name: 'Really',                 type: 'international' },
  { name: 'The Story Lab',          type: 'international' },
  { name: 'Factual Studios',        type: 'international' },
];

const netStmt = db.prepare(
  'INSERT OR IGNORE INTO site_networks (id, name, slug, type) VALUES (?,?,?,?)'
);
for (const n of networks) {
  netStmt.run(randomUUID(), n.name, slug(n.name), n.type);
}
console.log(`✓ Seeded ${networks.length} networks`);

// ── Shows ─────────────────────────────────────────────────────────────────────
interface ShowSeed {
  title: string; genre: string; network: string;
  description?: string; seasons?: number; status?: string; is_featured?: boolean;
}

const shows: ShowSeed[] = [
  // Paranormal
  { title: 'Ghost Adventures', genre: 'Paranormal', network: 'Discovery', seasons: 28, description: 'The #1 paranormal franchise. Zak Bagans and crew investigate haunted locations around the world.', status: 'active', is_featured: true },
  { title: 'Destinations of the Damned with Zak Bagans', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Destination Fear', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Ghost Adventures: Screaming Room', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Ghost Adventures Live', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Ghost Adventures: Serial Killer Spirits', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Ghost Adventures: Aftershocks', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Ghost Adventures: Graveyard of the Pacific', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Haunted Museum Live', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Paranormal Challenge', genre: 'Paranormal', network: 'Travel Channel', status: 'active' },
  { title: 'Deadly Possessions', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: "Help! My House is Haunted", genre: 'Paranormal', network: 'Really', status: 'active' },

  // Sports + Competition
  { title: 'Uninterrupted: The Real Stories of Basketball', genre: 'Sports + Competition', network: 'Vice', description: 'Co-produced with LeBron James / SpringHill Company.', status: 'active', is_featured: true },
  { title: 'Pros vs Joes', genre: 'Sports + Competition', network: 'Spike/Paramount Network', status: 'active', is_featured: true },
  { title: 'You Only Live Once', genre: 'Sports + Competition', network: 'Discovery', status: 'active' },
  { title: 'Game On America', genre: 'Sports + Competition', network: 'NBC Sports', status: 'active' },

  // Home + Lifestyle
  { title: 'Legacy List', genre: 'Home + Lifestyle', network: 'PBS', description: 'Two-time Emmy nominated series following families as they sort through a lifetime of belongings.', status: 'active', is_featured: true },
  { title: 'Billy Buys Brooklyn', genre: 'Home + Lifestyle', network: 'TruTV', status: 'active' },
  { title: 'Baggage Battles', genre: 'Home + Lifestyle', network: 'Travel Channel', status: 'active' },
  { title: 'Hidden Assets', genre: 'Home + Lifestyle', network: 'Discovery', status: 'active' },
  { title: 'Pools with a View', genre: 'Home + Lifestyle', network: 'Animal Planet', status: 'active' },

  // Crime
  { title: 'Sin City Justice', genre: 'Crime', network: 'Investigation Discovery', status: 'active' },
  { title: 'The Jane Doe Murders', genre: 'Crime', network: 'Investigation Discovery', status: 'active' },
  { title: "Manson's Bloodline", genre: 'Crime', network: 'Investigation Discovery', status: 'active' },
  { title: 'Charles Manson: The Funeral', genre: 'Crime', network: 'Reelz', status: 'active' },
  { title: 'Framed', genre: 'Crime', network: 'Investigation Discovery', status: 'active' },
  { title: 'Sandy/Show and Tell Killer', genre: 'Crime', network: 'Investigation Discovery', status: 'active' },
  { title: 'Biker Battles', genre: 'Crime', network: 'Discovery', status: 'active' },

  // Comedy
  { title: "Comedy Central's Bar Mitzvah Bash", genre: 'Comedy', network: 'Comedy Central', status: 'active' },
  { title: 'Wild & Crazy Kids', genre: 'Comedy', network: 'Nickelodeon', status: 'active' },
  { title: 'Hall Pass', genre: 'Comedy', network: 'MTV', status: 'active' },
  { title: 'Student Bodies', genre: 'Comedy', network: 'MTV', status: 'active' },
  { title: 'Pregnant and Platonic', genre: 'Comedy', network: 'Lifetime', status: 'active' },

  // Food + Travel
  { title: 'Breaking Borders', genre: 'Food + Travel', network: 'Travel Channel', description: 'Critically acclaimed travel and culinary series.', status: 'active', is_featured: true },
  { title: 'Food Boats', genre: 'Food + Travel', network: 'Food Network', status: 'active' },
  { title: 'Top of the World', genre: 'Food + Travel', network: 'Travel Channel', status: 'active' },
  { title: "Stolichnaya Presents Be Real", genre: 'Food + Travel', network: 'IFC', status: 'active' },

  // Other
  { title: 'Wreck Chasers', genre: 'Paranormal', network: 'Discovery', status: 'active' },
  { title: 'Red Alaska', genre: 'Crime', network: 'Discovery', status: 'active' },
  { title: "Sherman's Warriors", genre: 'Sports + Competition', network: 'Discovery', status: 'active' },
  { title: 'King of Vegas', genre: 'Sports + Competition', network: 'Spike/Paramount Network', status: 'active' },
  { title: 'What Would You Do?', genre: 'Comedy', network: 'ABC', status: 'active' },
  { title: "World's Edge", genre: 'Food + Travel', network: 'Travel Channel', status: 'active' },
];

const showStmt = db.prepare(
  'INSERT OR IGNORE INTO site_shows (id, title, slug, description, genre, network, seasons, status, is_featured, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
);

for (let i = 0; i < shows.length; i++) {
  const s = shows[i];
  showStmt.run(
    randomUUID(), s.title, slug(s.title), s.description ?? null,
    s.genre, s.network, s.seasons ?? null, s.status ?? 'active',
    s.is_featured ? 1 : 0, i, now, now
  );
}
console.log(`✓ Seeded ${shows.length} shows`);

// ── Show → Genre cross-reference ──────────────────────────────────────────────
const genreRows = db.prepare('SELECT id, name FROM site_genres').all() as { id: string; name: string }[];
const showRows = db.prepare('SELECT id, genre FROM site_shows').all() as { id: string; genre: string }[];
const genreMap = new Map(genreRows.map(g => [g.name, g.id]));

const sgStmt = db.prepare('INSERT OR IGNORE INTO site_show_genres (show_id, genre_id) VALUES (?,?)');
let sgCount = 0;
for (const show of showRows) {
  const gid = genreMap.get(show.genre);
  if (gid) { sgStmt.run(show.id, gid); sgCount++; }
}
console.log(`✓ Linked ${sgCount} show-genre relationships`);

console.log('\n✅ Marketing seed complete. Run the app and visit /marketing to manage content.');
