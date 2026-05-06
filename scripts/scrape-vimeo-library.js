#!/usr/bin/env node
// Scrapes all videos from the MYE Vimeo account via the Vimeo API.
// Requires a fresh JWT token (captured from browser network tab).
// Usage: JWT="jwt eyJ..." node scripts/scrape-vimeo-library.js
//
// The JWT expires ~30 minutes after capture. Re-capture from Chrome DevTools
// or by running: node scripts/get-vimeo-jwt.js (opens Chrome CDP session)

const https = require('https');
const path  = require('path');
const { DatabaseSync } = require('node:sqlite');

const JWT     = process.env.JWT;
const USER_ID = '63261623';
const PER_PAGE = 100;
const FIELDS  = [
  'video.name',
  'video.link',
  'video.duration',
  'video.uri',
  'video.privacy.view',
  'video.password',
  'video.last_user_action_event_date',
  'type',
  'folder.name',
  'folder.uri',
].join(',');

if (!JWT) {
  console.error('ERROR: Set JWT env var. Capture from browser:\n  node scripts/get-vimeo-jwt.js');
  process.exit(1);
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.vimeo.com' + path;
    const req = https.get(url, { headers: { Authorization: JWT, Accept: 'application/vnd.vimeo.*+json;version=3.4' } }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout: ' + url)); });
  });
}

async function fetchAllPages(basePath) {
  const all = [];
  let page = 1;
  while (true) {
    const { status, body } = await apiGet(`${basePath}&page=${page}&per_page=${PER_PAGE}&fields=${FIELDS}`);
    if (status !== 200 || !body?.data) {
      console.error(`  API error ${status} on page ${page}`);
      break;
    }
    all.push(...body.data);
    process.stderr.write(`  page ${page}: ${body.data.length} items (total so far: ${all.length}/${body.total})\n`);
    if (all.length >= body.total || body.data.length < PER_PAGE || !body.paging?.next) break;
    page++;
  }
  return all;
}

// Extract clip_id and optional hash from a Vimeo URL
// e.g. https://vimeo.com/807745998/fc4c72d276  → { clipId: '807745998', hash: 'fc4c72d276' }
// e.g. https://vimeo.com/807745998             → { clipId: '807745998', hash: null }
function parseVimeoUrl(url) {
  const m = url?.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/);
  if (!m) return { clipId: null, hash: null };
  return { clipId: m[1], hash: m[2] || null };
}

(async function main() {
  const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 10000;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Run the migration in case it hasn't been applied yet
  const migrationSql = require('fs').readFileSync(
    path.join(process.cwd(), 'migrations', '026_vimeo_library.sql'), 'utf-8'
  );
  db.exec(migrationSql);
  db.prepare("INSERT OR IGNORE INTO schema_migrations(filename) VALUES ('026_vimeo_library.sql')").run();

  console.log('Fetching all videos from Vimeo library...');
  const rootPath = `/users/${USER_ID}/folders/root?direction=desc&exclude_personal_team_folder=true&exclude_shared_videos=false&include_cold_storage_clips=false&no_padding=true&sort=last_user_action_event_date`;
  const items = await fetchAllPages(rootPath);

  const videos = items.filter(i => i.type === 'video' && i.video?.uri);
  console.log(`\nFound ${videos.length} videos (${items.length - videos.length} non-video items skipped)`);

  const upsert = db.prepare(`
    INSERT INTO vimeo_library (clip_id, hash, url, title, duration_sec, privacy, has_password, last_modified, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(clip_id) DO UPDATE SET
      hash          = excluded.hash,
      url           = excluded.url,
      title         = excluded.title,
      duration_sec  = excluded.duration_sec,
      privacy       = excluded.privacy,
      has_password  = excluded.has_password,
      last_modified = excluded.last_modified,
      scraped_at    = excluded.scraped_at
  `);

  let inserted = 0;
  let updated  = 0;

  const existCheck = db.prepare('SELECT id FROM vimeo_library WHERE clip_id = ?');

  db.exec('BEGIN');
  try {
    for (const item of videos) {
      const v = item.video;
      const { clipId, hash } = parseVimeoUrl(v.link);
      if (!clipId) continue;

      const existing = existCheck.get(clipId);

      upsert.run(
        clipId,
        hash,
        v.link,
        v.name,
        v.duration ?? null,
        v.privacy?.view ?? null,
        v.password ? 1 : 0,
        v.last_user_action_event_date ?? null,
      );

      if (existing) updated++; else inserted++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const total = db.prepare('SELECT COUNT(*) as n FROM vimeo_library').get();
  console.log(`\nDone. Inserted: ${inserted} | Updated: ${updated} | Total in DB: ${total.n}`);
})().catch(err => { console.error(err); process.exit(1); });
