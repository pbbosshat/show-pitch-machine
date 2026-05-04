// Seed the marketing CMS tables with MYE's full catalog from the Webflow scrape.
// Uses INSERT ... ON CONFLICT(slug) DO UPDATE so re-runs safely update image_url and other fields.
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
  { name: 'ABC',                    type: 'broadcast' },
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
  title: string;
  genre: string;
  network: string;
  description?: string;
  seasons?: number;
  status?: string;
  is_featured?: boolean;
  image_url?: string;
  imdb_url?: string; // used for external links (YouTube, Max, etc.)
}

// image_url values are Webflow CDN URLs from the live myentertainment.tv/shows page.
const shows: ShowSeed[] = [
  // Paranormal
  {
    title: 'Ghost Adventures',
    genre: 'Paranormal',
    network: 'Discovery',
    seasons: 28,
    description: 'The #1 paranormal franchise. Zak Bagans and crew investigate haunted locations around the world.',
    status: 'active',
    is_featured: true,
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/673388c81a9ea2c6f167a992_Untitled%20design%20%282%29.png',
  },
  {
    title: 'Destinations of the Damned with Zak Bagans',
    genre: 'Paranormal',
    network: 'Max',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6733877d8707275f3cbc8261_Untitled%20design%20%281%29.png',
    imdb_url: 'https://www.max.com/shows/destinations-of-the-damned-with-zak-bagans/fbbff164-87f5-43e1-bf4d-cded5e1b4cca',
  },
  {
    title: 'Destination Fear',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80fc230d2c47867c3658_DESTINATION%20FEAR.png',
  },
  {
    title: 'Ghost Adventures: Screaming Room',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81f594d7efdad72a01e2_GHOST%20ADVENTURES%20SCREAMING%20ROOM.png',
  },
  {
    title: 'Ghost Adventures Live',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81e63bcb9cb0b932dd52_GHOST%20ADVENTURES%20LIVE.png',
  },
  {
    title: 'Ghost Adventures: Serial Killer Spirits',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e820734ed9e6f37c88ae7_GHOST%20ADVENTURES%20SERIAL%20KILLER%20SPIRITS.png',
  },
  {
    title: 'Ghost Adventures: Aftershocks',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81c385a9c000b09b2967_GHOST%20ADVENTURES%20AFTERSHOCKS.png',
  },
  {
    title: 'Ghost Adventures: Graveyard of the Pacific',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81d760e21461e14b27f5_GHOST%20ADVENTURES%20GRAVEYARD%20OF%20THE%20PACIFIC.png',
  },
  {
    title: 'Haunted Museum Live',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8227fddd9214e551b423_HAUNTED%20MUSEUM%20LIVE.png',
  },
  {
    title: 'Paranormal Challenge',
    genre: 'Paranormal',
    network: 'Travel Channel',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e828992aded2cae4360ee_PARANORMAL%20CHALLENGE.png',
  },
  {
    title: 'Deadly Possessions',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80eaa6a75c3d09ebd083_DEADLY%20POSSESSIONS.png',
  },
  {
    title: "Help! My House is Haunted",
    genre: 'Paranormal',
    network: 'Really',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e823df265cf538dd668e2_HELP!%20MY%20HOUSE%20IS%20HAUNTED.png',
  },
  {
    title: 'Wreck Chasers',
    genre: 'Paranormal',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e868492adedaed7439f57_WRECK%20CHASERS.png',
  },

  // Sports + Competition
  {
    title: 'Uninterrupted: The Real Stories of Basketball',
    genre: 'Sports + Competition',
    network: 'Vice',
    description: 'Co-produced with LeBron James / SpringHill Company.',
    status: 'active',
    is_featured: true,
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6733858038041d899a10227b_Real%20Stories%20of%20Basketball.png',
    imdb_url: 'https://www.youtube.com/watch?v=g7LHsI0g7NA',
  },
  {
    title: 'Pros vs Joes',
    genre: 'Sports + Competition',
    network: 'Spike/Paramount Network',
    status: 'active',
    is_featured: true,
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e844f230d2c84e97c6095_PROS%20VS%20JOES.png',
  },
  {
    title: 'You Only Live Once',
    genre: 'Sports + Competition',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e869b60e214985f4b707e_YOU%20ONLY%20LIVE%20ONCE.png',
  },
  {
    title: 'Game On America',
    genre: 'Sports + Competition',
    network: 'NBC Sports',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e815e9e7350807a27ef5b_GAME%20ON%20AMERICA.png',
  },
  {
    title: "Sherman's Warriors",
    genre: 'Sports + Competition',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8478ad7a0642eec56986_SHERMAN%27S%20WARRIORS.png',
  },
  {
    title: 'King of Vegas',
    genre: 'Sports + Competition',
    network: 'Spike/Paramount Network',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e825d34ed9e6cb7c89039_KING%20OF%20VEGAS.png',
  },

  // Home + Lifestyle
  {
    title: 'Legacy List',
    genre: 'Home + Lifestyle',
    network: 'PBS',
    description: 'Two-time Emmy nominated series following families as they sort through a lifetime of belongings.',
    status: 'active',
    is_featured: true,
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e826b2c6bbe4482950448_LEGACY%20LIST.png',
  },
  {
    title: 'Billy Buys Brooklyn',
    genre: 'Home + Lifestyle',
    network: 'TruTV',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a111b873829a9d008c_billy%20buys%20brooklyn%20show%20page%20header.png',
  },
  {
    title: 'Baggage Battles',
    genre: 'Home + Lifestyle',
    network: 'Travel Channel',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e807f230d2c0e667c2f14_BAGGAGE%20BATTLES.png',
  },
  {
    title: 'Hidden Assets',
    genre: 'Home + Lifestyle',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e824a43d13c65a4cbc8a0_HIDDEN%20ASSETS.png',
  },
  {
    title: 'Pools with a View',
    genre: 'Home + Lifestyle',
    network: 'Animal Planet',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371458101967322adc62b64_pools%20with%20a%20view.png',
  },

  // Crime
  {
    title: 'Sin City Justice',
    genre: 'Crime',
    network: 'Investigation Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e84f875a7c10d6b330adc_SIN%20CITY%20JUSTICE.png',
  },
  {
    title: 'The Jane Doe Murders',
    genre: 'Crime',
    network: 'Investigation Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a46f6edd2f885ef826_the%20jane%20doe%20murders%20show%20page%20header.png',
  },
  {
    title: "Manson's Bloodline",
    genre: 'Crime',
    network: 'Investigation Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e827975a7c10b5f32db73_MANSON%27S%20BLOODLINE.png',
  },
  {
    title: 'Charles Manson: The Funeral',
    genre: 'Crime',
    network: 'Reelz',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80ad60e214405f4b1f2d_CHARLES%20MANSON%20THE%20FUNERAL.png',
  },
  {
    title: 'Framed',
    genre: 'Crime',
    network: 'Investigation Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e814bad7a0659a6c5363c_FRAMED.png',
  },
  {
    title: 'Sandy/Show and Tell Killer',
    genre: 'Crime',
    network: 'Investigation Discovery',
    status: 'active',
  },
  {
    title: 'Biker Battles',
    genre: 'Crime',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8090728e64bda17163d8_BIKER%20BATTLES.png',
  },
  {
    title: 'Red Alaska',
    genre: 'Crime',
    network: 'Discovery',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e846a92aded3ed4437969_RED%20ALASKA.png',
  },

  // Comedy
  {
    title: "Comedy Central's Bar Mitzvah Bash",
    genre: 'Comedy',
    network: 'Comedy Central',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80d4b54efc31843cf931_COMEDY%20CENTRAL%20BAR%20MITZVAH%20BASH.png',
  },
  {
    title: 'Wild & Crazy Kids',
    genre: 'Comedy',
    network: 'Nickelodeon',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8624ed580571aec541f0_WILD%20%26%20CRAZY%20KIDS.png',
  },
  {
    title: 'Hall Pass',
    genre: 'Comedy',
    network: 'MTV',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e821a6e474eb83d1b93bb_HALL%20PASS.png',
  },
  {
    title: 'Student Bodies',
    genre: 'Comedy',
    network: 'MTV',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e851e53eb681725dc4f51_STUDENT%20BODIES.png',
  },
  {
    title: 'Pregnant and Platonic',
    genre: 'Comedy',
    network: 'Lifetime',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8440bc22fc95383840fa_PREGNANT%20AND%20PLATONIC.png',
  },
  {
    title: 'What Would You Do?',
    genre: 'Comedy',
    network: 'ABC',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e85abc664e83d2e6eb67b_WHAT%20WOULD%20YOU%20DO%3F.png',
  },

  // Food + Travel
  {
    title: 'Breaking Borders',
    genre: 'Food + Travel',
    network: 'Travel Channel',
    description: 'Critically acclaimed travel and culinary series.',
    status: 'active',
    is_featured: true,
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e809ea0b43203f02ad371_BREAKING%20BORDERS.png',
  },
  {
    title: 'Food Boats',
    genre: 'Food + Travel',
    network: 'Food Network',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e813bad7a0602bec53558_FOOD%20BOATS.png',
  },
  {
    title: 'Top of the World',
    genre: 'Food + Travel',
    network: 'Travel Channel',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e859943d13c47d0cbe4c6_TOP%20OF%20THE%20WORLD.png',
  },
  {
    title: "Stolichnaya Presents Be Real",
    genre: 'Food + Travel',
    network: 'IFC',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e850db54efceb63424f2f_STOLICHNAYA%20PRESENTS%20BE%20REAL.png',
  },
  {
    title: "World's Edge",
    genre: 'Food + Travel',
    network: 'Travel Channel',
    status: 'active',
    image_url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a41693d1267df1314d_world%27s%20edge%20show%20page%20header.png',
  },
];

// Upsert: on slug conflict, update all fields including image_url so re-runs are idempotent.
const showStmt = db.prepare(
  `INSERT INTO site_shows (id, title, slug, description, genre, network, seasons, status, image_url, imdb_url, is_featured, sort_order, created_at, updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
   ON CONFLICT(slug) DO UPDATE SET
     title       = excluded.title,
     description = excluded.description,
     genre       = excluded.genre,
     network     = excluded.network,
     seasons     = excluded.seasons,
     status      = excluded.status,
     image_url   = excluded.image_url,
     imdb_url    = excluded.imdb_url,
     is_featured = excluded.is_featured,
     sort_order  = excluded.sort_order,
     updated_at  = excluded.updated_at`
);

for (let i = 0; i < shows.length; i++) {
  const s = shows[i];
  showStmt.run(
    randomUUID(), s.title, slug(s.title), s.description ?? null,
    s.genre, s.network, s.seasons ?? null, s.status ?? 'active',
    s.image_url ?? null, s.imdb_url ?? null,
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

console.log('\n✅ Marketing seed complete. Run the app and visit /marketing/shows to manage content.');
