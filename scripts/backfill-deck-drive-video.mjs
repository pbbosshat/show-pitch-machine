// scripts/backfill-deck-drive-video.mjs
// One-off backfill: populate deck_sites.drive_file_id from vimeo_library.
//
// Three sources are consulted in order of preference:
//   1. deck_sites.vimeo_url — clip_id parsed out of the URL
//   2. deck_sites.sizzle_history JSON — `url` field on each active entry
//   3. HARDCODED_BY_SLUG below — clip IDs that live only in the one-sheet TSX
//      components (the original sizzle fallback URLs). This map is the
//      authoritative cleanup of the hardcoded paths and is consulted last so
//      DB-stored URLs win when present.
//
// Idempotent: only writes when the row doesn't already have drive_file_id set.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
const db = new DatabaseSync(DB_PATH);

// Slugs whose only video reference was a hardcoded player.vimeo.com URL in the
// matching one-sheet TSX file. Pulled from a grep over app/(public)/available/[slug]/.
const HARDCODED_BY_SLUG = {
  'storm-warriors-deck':           '1058661997',
  'storm-warriors-us':             '1058661997',
  'art-of-murder-walshe':          '1116791591',
  'fright-before-christmas':        '905374739',
  'botched-by-a-tiktok-doc':       '1085697854',
  'dont-f-with-my-kids':           '1009030222',
  'happy-hour-hustlers':           '1077316521',
  'magic-showdown':                '1152709330',
  'open-secrets':                  '1097039487',
  'project-skywatch':               '958547025',
  'susan-smith':                    '949340808',
  'up-for-parole':                  '993640958',
  'welcome-to-crunkville':         '1059770793',
  'we-hunt-serial-killers':        '1045104876',
  'what-happened-to-michelle-renee':'1020264275',
};

function clipIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function activeSizzleClipId(jsonStr) {
  if (!jsonStr) return null;
  try {
    const entries = JSON.parse(jsonStr);
    if (!Array.isArray(entries)) return null;
    // Prefer the entry flagged active=true; if none flagged, take the last
    // entry (history is append-only — newest at the end).
    const active = entries.find((e) => e && e.active === true) ?? entries[entries.length - 1];
    return clipIdFromUrl(active?.url);
  } catch {
    return null;
  }
}

const decks = db.prepare(
  `SELECT id, slug, vimeo_url, sizzle_history, drive_file_id FROM deck_sites`
).all();

const driveByClip = db.prepare(
  `SELECT drive_file_id FROM vimeo_library WHERE clip_id = ? AND drive_file_id IS NOT NULL`
);

const updateStmt = db.prepare(`UPDATE deck_sites SET drive_file_id = ? WHERE id = ?`);

let updated = 0, skipped = 0, missing = 0;
const missingList = [];

for (const deck of decks) {
  if (deck.drive_file_id) { skipped++; continue; }

  const candidates = [
    clipIdFromUrl(deck.vimeo_url),
    activeSizzleClipId(deck.sizzle_history),
    HARDCODED_BY_SLUG[deck.slug] ?? null,
  ].filter(Boolean);

  let driveId = null;
  for (const cid of candidates) {
    const row = driveByClip.get(cid);
    if (row?.drive_file_id) { driveId = row.drive_file_id; break; }
  }

  if (driveId) {
    updateStmt.run(driveId, deck.id);
    updated++;
  } else {
    missing++;
    missingList.push({ slug: deck.slug, candidates });
  }
}

console.log(`Updated:  ${updated}`);
console.log(`Skipped:  ${skipped} (already had drive_file_id)`);
console.log(`No Drive: ${missing}`);
if (missingList.length) {
  console.log('\nDecks without a Drive-backed video:');
  for (const m of missingList) {
    console.log(`  ${m.slug.padEnd(40)} candidates=[${m.candidates.join(', ') || '—'}]`);
  }
}
