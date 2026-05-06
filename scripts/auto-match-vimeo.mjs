/**
 * auto-match-vimeo.mjs
 * Runs fuzzy title matching between vimeo_library and ip_catalog.
 * Automatically applies matches with score >= 90 (clear title containment).
 * Prints a review table for lower-confidence matches.
 *
 * Usage:  node scripts/auto-match-vimeo.mjs
 *         node scripts/auto-match-vimeo.mjs --dry-run     (preview only, no writes)
 *         node scripts/auto-match-vimeo.mjs --threshold 75 (lower auto-apply bar)
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'data', 'db.sqlite');
const DRY_RUN   = process.argv.includes('--dry-run');
const threshIdx = process.argv.indexOf('--threshold');
const THRESHOLD = threshIdx !== -1 ? Number(process.argv[threshIdx + 1]) : 90;

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ── Fetch data ──────────────────────────────────────────────────────────────

const videos = db.prepare(`
  SELECT vl.id, vl.title, vl.url, vl.duration_sec, vl.privacy
  FROM vimeo_library vl
  LEFT JOIN show_videos sv ON sv.vimeo_library_id = vl.id
  WHERE sv.id IS NULL
  ORDER BY vl.title
`).all();

const shows = db.prepare(`SELECT id, title FROM ip_catalog ORDER BY title`).all();

console.log(`\n📹  ${videos.length} unlinked Vimeo videos`);
console.log(`🎬  ${shows.length} shows in ip_catalog\n`);

if (!videos.length) { console.log('Nothing to match — all videos are already linked.'); process.exit(0); }

// ── Matching logic (mirrors page.tsx) ───────────────────────────────────────

function normalizeForMatch(title) {
  return title
    .toLowerCase()
    .replace(/\b(sizzle|reel|trailer|teaser|pilot|rough[\s-]?cut|casting[\s-]?tape|interview|character[\s-]?reel|mye|my\s+entertainment|pitch[\s-]?tape|promo|preview|documentary|series|special)\b/g, '')
    .replace(/[-–—:|\/\\]/g, ' ')
    .replace(/[''"""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferVideoType(title) {
  const t = title.toLowerCase();
  if (t.includes('cast'))                       return 'casting_tape';
  if (t.includes('interview'))                  return 'interview';
  if (t.includes('character'))                  return 'character_reel';
  if (t.includes('rough') || t.includes('pilot')) return 'rough_cut';
  return 'sizzle';
}

function computeMatchScore(normVideo, normShow) {
  if (!normShow || normShow.length < 2) return 0;
  if (normVideo === normShow)            return 100;
  // Guard: require normShow >= 5 chars to prevent short names ("from", "the") from matching broadly
  if (normShow.length >= 5 && normVideo.includes(normShow)) return 90;
  if (normShow.length >= 5 && normShow.includes(normVideo) && normVideo.length >= 5) return 85;
  const videoWords = new Set(normVideo.split(/\s+/).filter(w => w.length > 2));
  const showWords  = normShow.split(/\s+/).filter(w => w.length > 2);
  if (!showWords.length) return 0;
  const hits  = showWords.filter(w => videoWords.has(w)).length;
  const ratio = hits / showWords.length;
  if (ratio >= 0.8) return 75;
  if (ratio >= 0.6) return 60;
  if (ratio >= 0.5) return 50;
  return 0;
}

// ── Build suggestions ────────────────────────────────────────────────────────

const normShows = shows.map(s => ({ show: s, norm: normalizeForMatch(s.title) }));

const suggestions = [];
for (const video of videos) {
  const normVideo = normalizeForMatch(video.title);
  let best = null;
  for (const { show, norm } of normShows) {
    const score = computeMatchScore(normVideo, norm);
    if (score > 0 && (!best || score > best.score)) best = { show, score };
  }
  if (best && best.score >= 50) {
    suggestions.push({ video, show: best.show, score: best.score, videoType: inferVideoType(video.title), normVideo });
  }
}

suggestions.sort((a, b) => b.score - a.score || a.video.title.localeCompare(b.video.title));

const toApply  = suggestions.filter(s => s.score >= THRESHOLD);
const toReview = suggestions.filter(s => s.score < THRESHOLD);
const noMatch  = videos.length - suggestions.length;

// ── Apply high-confidence matches ────────────────────────────────────────────

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO show_videos (id, ip_catalog_id, vimeo_library_id, video_type, sort_order, notes)
  VALUES (?, ?, ?, ?, 0, NULL)
`);

let applied = 0;
let skipped = 0;
const errors = [];

console.log(`━━━ AUTO-APPLY (score ≥ ${THRESHOLD}) — ${toApply.length} matches ━━━\n`);

for (const s of toApply) {
  const label = `[${s.score}%] "${s.video.title}"  →  "${s.show.title}"  (${s.videoType})`;
  if (DRY_RUN) {
    console.log(`  DRY  ${label}`);
    applied++;
    continue;
  }
  try {
    const result = insertStmt.run(crypto.randomUUID(), s.show.id, s.video.id, s.videoType);
    if (result.changes > 0) {
      console.log(`  ✓    ${label}`);
      applied++;
    } else {
      console.log(`  skip ${label}  (already linked)`);
      skipped++;
    }
  } catch (e) {
    console.log(`  ERR  ${label}  — ${e.message}`);
    errors.push({ label, err: e.message });
  }
}

// ── Print review table for lower-confidence matches ──────────────────────────

if (toReview.length) {
  console.log(`\n━━━ NEEDS MANUAL REVIEW (50–${THRESHOLD - 1}%) — ${toReview.length} suggestions ━━━\n`);
  for (const s of toReview) {
    const norm = `"${s.normVideo}" → "${normalizeForMatch(s.show.title)}"`;
    console.log(`  [${s.score}%] "${s.video.title}"  →  "${s.show.title}"`);
    console.log(`        (normalized: ${norm})`);
  }
}

if (noMatch > 0) {
  console.log(`\n━━━ NO MATCH FOUND — ${noMatch} videos ━━━`);
  const unmatched = videos.filter(v => !suggestions.find(s => s.video.id === v.id));
  for (const v of unmatched) console.log(`  • "${v.title}"`);
}

console.log(`\n━━━ SUMMARY ━━━`);
console.log(`  Applied : ${applied}${DRY_RUN ? ' (dry run)' : ''}`);
console.log(`  Skipped : ${skipped} (already linked)`);
console.log(`  Review  : ${toReview.length}`);
console.log(`  No match: ${noMatch}`);
if (errors.length) console.log(`  Errors  : ${errors.length}`);
console.log();
