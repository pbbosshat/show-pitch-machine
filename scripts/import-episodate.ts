// Episodate enrichment script — fills episode_count and total_seasons gaps using
// the free Episodate REST API (no API key required).
//
// WHY EPISODATE:
//   Episodate covers streaming originals and international titles that TVMaze
//   sometimes misses. It's especially strong on Netflix/Amazon/international
//   reality and documentary content.
//
// COALESCE RULE: never overwrites existing data. Every UPDATE uses COALESCE so
//   already-populated fields are untouched regardless of what Episodate returns.
//
// CONFIDENCE: only upgrades pending → confirmed, never downgrades.
//
// Run: npx tsx scripts/import-episodate.ts [--dry-run] [--limit=N] [--force]
//
// Flags:
//   --dry-run    Fetch + validate, no DB writes
//   --limit=N    Max shows to process (default 500, to stay polite to Episodate)
//   --force      Process shows even if episode_count is already set

// Suppress node:sqlite experimental warning on startup — must be first
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { initDb, run, query } from '../lib/db';

// ─── Episodate API types ──────────────────────────────────────────────────────

interface EpisodateSearchShow {
  id: number;
  name: string;
  network: string;
  country: string;
  start_date: string;
  end_date: string;
  status: string;
  image_thumbnail_path: string;
  rating: string;
  rating_count: string;
  permalink: string;
}

interface EpisodateSearchResponse {
  total: string;
  page: number;
  pages: number;
  tv_shows: EpisodateSearchShow[];
}

interface EpisodateEpisode {
  season: number;
  episode: number;
  name: string;
  air_date: string;
}

interface EpisodateDetailShow extends EpisodateSearchShow {
  episodes: EpisodateEpisode[];
  countdown: null | { episode: number; name: string; air_date: string };
  description: string;
  youtube_link: string;
  url: string;
  image_path: string;
  runtime: number;
  genres: string[];
  pictures: string[];
}

interface EpisodateDetailResponse {
  tvShow: EpisodateDetailShow;
}

// ─── DB row type ──────────────────────────────────────────────────────────────

interface ShowRow {
  id: string;
  title: string;
  network: string | null;
  episode_count: number | null;
  total_seasons: number | null;
  confidence: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Delay between Episodate API calls — start at 1.5s; back off on 429
const BASE_DELAY_MS = 1500;
let currentDelay = BASE_DELAY_MS;
const delay = (): Promise<void> => new Promise((r) => setTimeout(r, currentDelay));

// Normalize a string for case-insensitive comparison
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Parse CLI flags: --flag=value or --flag (boolean)
function parseArgs(): { dryRun: boolean; limit: number; force: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force  = args.includes('--force');

  // Extract --limit=N, defaulting to 500
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500;

  return { dryRun, limit, force };
}

// Map Episodate status string to our air_status enum
function mapStatus(status: string): 'on_air' | 'available' | 'off_air' {
  switch (status) {
    case 'Running':
    case 'To Be Determined':
      return 'on_air';
    case 'In Development':
      return 'available';
    case 'Ended':
    default:
      return 'off_air';
  }
}

// ─── API fetch helpers ────────────────────────────────────────────────────────

/**
 * Search Episodate for a show by title.
 * Returns the first page of results (max 20 items).
 * Throws on HTTP error; returns empty array on no results.
 */
async function searchEpisodate(title: string): Promise<EpisodateSearchShow[]> {
  const url = `https://www.episodate.com/api/search?q=${encodeURIComponent(title)}&page=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ShowPitchMachine/1.0 (data enrichment; contact: patrickbryant@gototeam.com)' },
    });
    if (res.status === 429) {
      // Back off and retry once
      currentDelay = Math.min(currentDelay * 2, 10000);
      await new Promise(r => setTimeout(r, 5000));
      throw new Error(`Episodate search HTTP 429 for "${title}"`);
    }
    if (!res.ok) throw new Error(`Episodate search HTTP ${res.status} for "${title}"`);
    // Successful call — ease back toward base delay
    currentDelay = Math.max(BASE_DELAY_MS, currentDelay * 0.9);
    const data = await res.json() as EpisodateSearchResponse;
    return data.tv_shows ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch full show detail from Episodate by their integer show ID.
 * The detail endpoint accepts the show's permalink slug or numeric ID.
 * Throws on HTTP error.
 */
async function fetchEpisodateDetail(episodateId: number): Promise<EpisodateDetailShow> {
  const url = `https://www.episodate.com/api/show-details?q=${episodateId}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ShowPitchMachine/1.0 (data enrichment; contact: patrickbryant@gototeam.com)' },
    });
    if (res.status === 429) {
      currentDelay = Math.min(currentDelay * 2, 10000);
      await new Promise(r => setTimeout(r, 5000));
      throw new Error(`Episodate detail HTTP 429 for ID ${episodateId}`);
    }
    if (!res.ok) throw new Error(`Episodate detail HTTP ${res.status} for ID ${episodateId}`);
    currentDelay = Math.max(BASE_DELAY_MS, currentDelay * 0.9);
    const data = await res.json() as EpisodateDetailResponse;
    return data.tvShow;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Match logic ──────────────────────────────────────────────────────────────

/**
 * Given a list of Episodate search results and our local show's title + network,
 * return the best match or null.
 *
 * Match criteria:
 *   1. Title must match case-insensitively (after normalization)
 *   2. Network must also match (case-insensitive) OR both sides have no network
 *
 * We prefer an exact title match over a substring match, but the spec requires
 * exact case-insensitive title equality to avoid false positives (e.g. "Survivor"
 * vs "Survivor: Edge of Extinction").
 */
function findBestMatch(
  results: EpisodateSearchShow[],
  localTitle: string,
  localNetwork: string | null
): EpisodateSearchShow | null {
  const normLocal = norm(localTitle);
  const normNetwork = localNetwork ? norm(localNetwork) : null;

  for (const show of results) {
    const normRemote = norm(show.name);

    // Title must match exactly (case-insensitive)
    if (normRemote !== normLocal) continue;

    const remoteNetwork = show.network ? norm(show.network) : null;

    // Network must match, or both must be absent (null/empty)
    const networkOk =
      (normNetwork !== null && remoteNetwork !== null && remoteNetwork.includes(normNetwork)) ||
      (normNetwork !== null && remoteNetwork !== null && normNetwork.includes(remoteNetwork)) ||
      (normNetwork === null && (remoteNetwork === null || show.network === '')) ||
      (remoteNetwork === null && (normNetwork === null || localNetwork === ''));

    if (networkOk) return show;
  }

  return null;
}

// ─── Core enrichment ─────────────────────────────────────────────────────────

/**
 * Main enrichment loop.
 * Processes shows with episode_count IS NULL OR total_seasons IS NULL
 * (unless --force is set, which also processes shows with episode_count populated).
 *
 * Per-show errors are caught so one bad lookup never aborts the run.
 * Rate-limited to 500ms between Episodate API calls.
 */
async function runEnrichment(dryRun: boolean, limit: number, force: boolean): Promise<void> {
  const prefix = dryRun ? 'DRY RUN: ' : '';

  // Decide which shows to target — prioritize gap rows unless --force
  const whereClause = force
    ? '1=1'
    : '(episode_count IS NULL OR total_seasons IS NULL)';

  const shows = query<ShowRow>(
    `SELECT id, title, network, episode_count, total_seasons, confidence
     FROM shows
     WHERE ${whereClause}
     ORDER BY title ASC
     LIMIT ?`,
    [limit]
  );

  console.log(
    `${prefix}Episodate enrichment: processing ${shows.length} show(s) (limit=${limit}, force=${force})...`
  );

  // Counters for summary report
  let matched  = 0;
  let updated  = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const show of shows) {
    try {
      // ── Step A: Search ────────────────────────────────────────────────────
      const results = await searchEpisodate(show.title);
      await delay(); // respect rate limit between search and detail calls

      if (results.length === 0) {
        console.log(`  ~ ${show.title}: no Episodate results`);
        skipped++;
        continue;
      }

      // ── Step B: Find best match ───────────────────────────────────────────
      const best = findBestMatch(results, show.title, show.network);

      if (!best) {
        console.log(`  ~ ${show.title}: no confident Episodate match (${results.length} candidates)`);
        skipped++;
        continue;
      }

      matched++;

      // ── Step C: Fetch detail ──────────────────────────────────────────────
      const detail = await fetchEpisodateDetail(best.id);
      await delay(); // rate limit before next show's search

      // ── Step D: Compute enrichment values ─────────────────────────────────

      // Total episodes = length of episodes array (each item = one episode)
      const totalEpisodes = detail.episodes.length > 0 ? detail.episodes.length : null;

      // Total seasons = max season number present in the episodes list
      let totalSeasons: number | null = null;
      if (detail.episodes.length > 0) {
        const maxSeason = Math.max(...detail.episodes.map((e) => e.season));
        // Guard against malformed data (season = 0 means "specials" on some shows)
        totalSeasons = maxSeason > 0 ? maxSeason : null;
      }

      const airStatus = mapStatus(detail.status);

      // premiere_date: parse ISO date string (YYYY-MM-DD) → unix ms timestamp
      const premiereDate =
        detail.start_date && detail.start_date !== '0000-00-00'
          ? Date.parse(detail.start_date) || null
          : null;

      // off_air_date: only set for shows that have actually ended
      const offAirDate =
        detail.status === 'Ended' && detail.end_date && detail.end_date !== '0000-00-00'
          ? Date.parse(detail.end_date) || null
          : null;

      // Confidence upgrade: pending → confirmed (never downgrade)
      // A second-source match from Episodate is sufficient to confirm a pending row.
      const newConfidence =
        show.confidence === 'pending' ? 'confirmed' : (show.confidence ?? 'confirmed');

      console.log(
        `${prefix}✓ ${show.title}  [search→detail]  eps=${totalEpisodes ?? '?'} seasons=${totalSeasons ?? '?'}`
      );

      // ── Step E: UPDATE with COALESCE guards ───────────────────────────────
      if (!dryRun) {
        run(
          `UPDATE shows SET
             episode_count  = COALESCE(episode_count,  ?),
             total_seasons  = COALESCE(total_seasons,  ?),
             air_status     = COALESCE(air_status,     ?),
             premiere_date  = COALESCE(premiere_date,  ?),
             off_air_date   = COALESCE(off_air_date,   ?),
             confidence     = ?,
             updated_at     = ?
           WHERE id = ?`,
          [
            totalEpisodes,
            totalSeasons,
            airStatus,
            premiereDate,
            offAirDate,
            newConfidence,
            Date.now(),
            show.id,
          ]
        );
        updated++;
      } else {
        updated++;
      }
    } catch (err) {
      // Per-show error: log and keep going — one bad show must not stop the run
      console.error(`  ✗ ${show.title}: ${(err as Error).message}`);
      errors++;

      // Still wait before next request so we don't hammer Episodate after an error
      await delay();
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log(`${prefix}Episodate enrichment complete`);
  console.log(`  matched : ${matched}`);
  console.log(`  updated : ${updated}`);
  console.log(`  skipped : ${skipped} (no match found)`);
  console.log(`  errors  : ${errors}`);
  console.log('─────────────────────────────────────────────');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Initialize the DB — runs all pending migrations before any queries
  initDb();

  const { dryRun, limit, force } = parseArgs();

  if (dryRun) {
    console.log('DRY RUN MODE — no DB writes will be made\n');
  }

  await runEnrichment(dryRun, limit, force);
}

main().catch((err) => {
  console.error('Fatal error:', (err as Error).message);
  process.exit(1);
});
