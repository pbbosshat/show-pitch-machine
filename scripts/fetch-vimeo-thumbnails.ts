// scripts/fetch-vimeo-thumbnails.ts
// Backfills image_url on deck_sites that are missing a thumbnail.
//
// Sources tried in order for each deck:
//   1. deck_sites.vimeo_url — already set on the deck row
//   2. vimeo_library match  — fuzzy title match against all scraped Vimeo clips
//
// Thumbnail fetch strategy (same as build-sizzle-thumbnails.ts):
//   1. Vimeo player config API  — works for private/hash-protected videos
//   2. oEmbed API fallback      — works for public videos
//
// Run: npx tsx scripts/fetch-vimeo-thumbnails.ts
// Dry-run (no DB writes): npx tsx scripts/fetch-vimeo-thumbnails.ts --dry

process.removeAllListeners('warning');
process.on('warning', () => {});

import { initDb, query, run } from '../lib/db';

const DRY_RUN = process.argv.includes('--dry');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeckRow {
  id: string;
  title: string;
  vimeo_url: string | null;
  image_url: string | null;
}

interface VimeoLibraryRow {
  id: string;
  clip_id: string;
  url: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Vimeo URL utilities (mirrors build-sizzle-thumbnails.ts)
// ---------------------------------------------------------------------------

function parseVimeoUrl(url: string): { id: string; hash: string | null } | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/i);
  if (!m) return null;
  return { id: m[1], hash: m[2] ?? null };
}

async function fetchViaPlayerConfig(id: string, hash: string | null): Promise<string | null> {
  const url = hash
    ? `https://player.vimeo.com/video/${id}/config?h=${hash}&app_id=58479`
    : `https://player.vimeo.com/video/${id}/config?app_id=58479`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ShowPitchMachine/1.0' } });
    if (!res.ok) return null;
    const data = await res.json() as { video?: { thumbs?: { base?: string; '960'?: string } } };
    return data.video?.thumbs?.['960'] ?? data.video?.thumbs?.base ?? null;
  } catch {
    return null;
  }
}

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

async function getThumbnail(vimeoUrl: string): Promise<string | null> {
  const parsed = parseVimeoUrl(vimeoUrl);
  if (!parsed) return null;
  const thumb = await fetchViaPlayerConfig(parsed.id, parsed.hash);
  return thumb ?? await fetchViaOEmbed(vimeoUrl);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Title matching — find best vimeo_library candidate for a deck
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Extract words longer than 3 chars as "significant" words
function sigWords(s: string): string[] {
  // Only words 5+ chars to avoid false positives on common short words like "just", "with", "broke"
  return normalise(s).split(' ').filter(w => w.length > 4);
}

function bestMatch(deckTitle: string, library: VimeoLibraryRow[]): VimeoLibraryRow | null {
  const deckNorm  = normalise(deckTitle);
  const deckWords = sigWords(deckTitle);

  let best: { row: VimeoLibraryRow; score: number } | null = null;

  for (const row of library) {
    const libNorm  = normalise(row.title);
    const libWords = sigWords(row.title);

    // Score: count how many significant deck words appear in the lib title
    const matches = deckWords.filter(w => libNorm.includes(w)).length;
    if (matches === 0) continue;

    // Require the lib title to also share words back to avoid false positives
    const reverseMatches = libWords.filter(w => deckNorm.includes(w)).length;
    if (reverseMatches === 0) continue;

    const score = matches + reverseMatches;
    if (!best || score > best.score) {
      best = { row, score };
    }
  }

  // Minimum threshold: at least 3 matched words total to reduce false positives
  return best && best.score >= 3 ? best.row : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  initDb();

  const decks = query<DeckRow>(
    `SELECT id, title, vimeo_url, image_url
     FROM deck_sites
     WHERE (image_url IS NULL OR image_url = '')
     ORDER BY title`
  );

  const library = query<VimeoLibraryRow>(
    `SELECT id, clip_id, url, title FROM vimeo_library WHERE url IS NOT NULL AND url != ''`
  );

  console.log(`\n=== Deck Thumbnail Backfill ===`);
  console.log(`Decks missing image_url: ${decks.length}`);
  console.log(`Vimeo library entries:   ${library.length}`);
  if (DRY_RUN) console.log(`DRY RUN — no DB writes\n`);
  else console.log('');

  let success = 0;
  let manual  = 0;

  for (const deck of decks) {
    // Determine the best Vimeo URL to try
    let vimeoUrl: string | null = deck.vimeo_url ?? null;
    let source = 'deck.vimeo_url';

    if (!vimeoUrl) {
      const match = bestMatch(deck.title, library);
      if (match) {
        vimeoUrl = match.url;
        source   = `vimeo_library: "${match.title}"`;
      }
    }

    if (!vimeoUrl) {
      console.log(`  [MANUAL] ${deck.title}`);
      manual++;
      continue;
    }

    const thumb = await getThumbnail(vimeoUrl);

    if (thumb) {
      if (!DRY_RUN) {
        run(`UPDATE deck_sites SET image_url = ?, updated_at = ? WHERE id = ?`, [
          thumb,
          Math.floor(Date.now() / 1000),
          deck.id,
        ]);
      }
      console.log(`  [OK]     ${deck.title}`);
      console.log(`           src: ${source}`);
      console.log(`           img: ${thumb.substring(0, 80)}...`);
      success++;
    } else {
      console.log(`  [MISS]   ${deck.title} — Vimeo returned no thumbnail (private/deleted?)`);
      console.log(`           url: ${vimeoUrl}`);
      manual++;
    }

    await sleep(200);
  }

  console.log(`\nDone. ${success} thumbnails set, ${manual} need manual images.`);
  if (manual > 0) {
    console.log(`\nManual decks — open /decks/<id> in the admin to paste a thumbnail URL.`);
  }
}

main().catch(console.error);
