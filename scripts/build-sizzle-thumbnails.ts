// scripts/build-sizzle-thumbnails.ts
// Pre-fetches Vimeo thumbnails for all sizzle reels and stores them in the DB.
// Run: npx tsx scripts/build-sizzle-thumbnails.ts
//
// Strategy per video:
//   1. Try Vimeo player config API — works for hash-protected private videos.
//      GET https://player.vimeo.com/video/{id}/config?h={hash}&app_id=58479
//      → video.thumbs.base (CDN URL without size suffix)
//   2. Fall back to oEmbed API — works for public videos.
//      GET https://vimeo.com/api/oembed.json?url={vimeo_url}
//      → thumbnail_url
// Skips rows that already have a thumbnail_url to avoid re-fetching.

process.removeAllListeners('warning');
process.on('warning', () => {});

import { initDb, query, run } from '../lib/db';

interface SizzleRow {
  id: string;
  vimeo_url: string;
  thumbnail_url: string | null;
}

// Parses vimeo.com/ID/HASH or vimeo.com/ID into { id, hash }
function parseVimeoUrl(url: string): { id: string; hash: string | null } | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/i);
  if (!m) return null;
  return { id: m[1], hash: m[2] ?? null };
}

// Vimeo player config endpoint — returns thumbnail even for private/hash-protected videos.
// app_id 58479 is Vimeo's own embed player ID (public, no auth required).
async function fetchViaPlayerConfig(id: string, hash: string | null): Promise<string | null> {
  const url = hash
    ? `https://player.vimeo.com/video/${id}/config?h=${hash}&app_id=58479`
    : `https://player.vimeo.com/video/${id}/config?app_id=58479`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ShowPitchMachine/1.0' } });
    if (!res.ok) return null;
    const data = await res.json() as { video?: { thumbs?: { base?: string; 960?: string } } };
    return data.video?.thumbs?.['960'] ?? data.video?.thumbs?.base ?? null;
  } catch {
    return null;
  }
}

// Vimeo oEmbed fallback — works for public videos
async function fetchViaOEmbed(vimeoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoUrl)}`,
      { headers: { 'User-Agent': 'ShowPitchMachine/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

// Small delay to avoid hammering Vimeo's API
function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  initDb(); // runs migrations including 016

  const rows = query<SizzleRow>(
    `SELECT id, vimeo_url, thumbnail_url
     FROM sizzle_reels
     WHERE vimeo_url IS NOT NULL AND vimeo_url != ''
     ORDER BY id`
  );

  const toFetch = rows.filter(r => !r.thumbnail_url);
  const alreadyDone = rows.length - toFetch.length;

  console.log(`\n=== Sizzle Thumbnail Builder ===`);
  console.log(`Total with URL: ${rows.length} | Already cached: ${alreadyDone} | To fetch: ${toFetch.length}\n`);

  let success = 0;
  let failed = 0;

  for (const row of toFetch) {
    const parsed = parseVimeoUrl(row.vimeo_url);
    if (!parsed) {
      console.log(`  [SKIP] Can't parse URL: ${row.vimeo_url}`);
      failed++;
      continue;
    }

    // Try player config first (works for private/hash-protected)
    let thumb = await fetchViaPlayerConfig(parsed.id, parsed.hash);

    // Fall back to oEmbed for public videos
    if (!thumb) {
      thumb = await fetchViaOEmbed(row.vimeo_url);
    }

    if (thumb) {
      run(`UPDATE sizzle_reels SET thumbnail_url = ? WHERE id = ?`, [thumb, row.id]);
      console.log(`  [OK]   ${parsed.id} → ${thumb.substring(0, 60)}...`);
      success++;
    } else {
      console.log(`  [MISS] ${parsed.id} — no thumbnail available (private or deleted)`);
      failed++;
    }

    // 150ms between requests — polite to Vimeo's API
    await sleep(150);
  }

  console.log(`\nDone. ${success} thumbnails cached, ${failed} unavailable.`);
}

main().catch(console.error);
