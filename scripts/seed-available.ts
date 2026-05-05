// Seed script: populate deck_sites with available catalog titles (formerly available_titles).
// Titles identified via Vimeo oEmbed API for the 4 unnamed screenshot-image shows.
// Run: npx tsx scripts/seed-available.ts

import { initDb, query, run } from '../lib/db';
import { randomUUID } from 'node:crypto';

initDb();

const CDN = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e';

function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SHOWS = [
  {
    title: 'The Art of Murder',
    image_url: `${CDN}/69135d967002171d5a647bad_The%20Art%20of%20Murder%20.png`,
    vimeo_url: 'https://vimeo.com/1116791591/20323057f9',
    sort_order: 1,
  },
  {
    title: 'Botched by A TikTok Doc',
    image_url: `${CDN}/69135d954ceff19e50189482_Botched%20by%20A%20TikTok%20Doc.png`,
    vimeo_url: 'https://vimeo.com/1085697854/293bac573a',
    sort_order: 2,
  },
  {
    title: 'Michelle Renee',
    image_url: `${CDN}/67c9e60a3d655f35fff44d19_Michelle%20Renee.png`,
    vimeo_url: 'https://vimeo.com/1020264275/55db128984',
    sort_order: 3,
  },
  {
    title: 'Up for Parole',
    image_url: `${CDN}/67ca10121d2919ac535085cc_Screenshot%202025-03-06%20at%204.13.45%20PM.png`,
    vimeo_url: 'https://vimeo.com/993640958/2e9d74f1da',
    sort_order: 4,
  },
  {
    title: 'The Bouchards',
    image_url: `${CDN}/67c9ec19ddb6a5c59357144c_Screenshot%202025-03-06%20at%201.40.21%20PM.png`,
    vimeo_url: 'https://vimeo.com/1014504642/460bb75ad2',
    sort_order: 5,
  },
  {
    title: "Don't F with My Kids",
    image_url: `${CDN}/67c9eb45e42d97eecedf274f_Screenshot%202025-03-06%20at%201.36.50%20PM.png`,
    vimeo_url: 'https://vimeo.com/1010691070/4d09f2144a',
    sort_order: 6,
  },
  {
    title: 'Storm Warriors',
    image_url: `${CDN}/69135d95e837871818cf12c5_Storm%20Warriors.png`,
    vimeo_url: 'https://vimeo.com/1058661997/d23befd589',
    sort_order: 7,
  },
  {
    title: 'Project Skywatch',
    image_url: `${CDN}/67c9fd7bd89ef81a97ad9cdc_Screenshot%202025-03-06%20at%202.54.32%20PM.png`,
    vimeo_url: 'https://vimeo.com/958547025/93220f9860',
    sort_order: 8,
  },
  {
    title: 'Give Me Shelter',
    image_url: `${CDN}/67c9eaf2adc0918387bf9935_Give%20Me%20Shelter%20.png`,
    vimeo_url: 'https://vimeo.com/1052365375/913e7080e5',
    sort_order: 9,
  },
];

const existing = query<{ title: string }>('SELECT title FROM deck_sites');
const existingTitles = new Set(existing.map(r => r.title.toLowerCase()));

let inserted = 0;
let skipped = 0;
const now = Math.floor(Date.now() / 1000);

for (const show of SHOWS) {
  if (existingTitles.has(show.title.toLowerCase())) {
    console.log(`  SKIP  ${show.title} (already exists)`);
    skipped++;
    continue;
  }

  const id = randomUUID();
  const slug = slugify(show.title);

  run(
    `INSERT INTO deck_sites
       (id, title, slug, image_url, vimeo_url, is_active, sort_order, contact_email,
        status, visibility, slide_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, 'info@myentertainment.tv', 'published', 'public', 0, ?, ?)`,
    [id, show.title, slug, show.image_url, show.vimeo_url, show.sort_order, now, now]
  );

  console.log(`  INSERT ${show.title} → /available/${slug}`);
  inserted++;
}

console.log(`\nDone: ${inserted} inserted, ${skipped} skipped.`);
