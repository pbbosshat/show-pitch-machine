// TVDB v4 enrichment script — fills episode_count, total_seasons, and tvdb_id
// for shows that have gaps, using The TVDB's authenticated v4 REST API.
//
// WHY TVDB:
//   TVDB v4 is the most comprehensive episode/season database available.
//   It covers international shows, anime, and classic series with accurate
//   per-season episode counts that TVMaze and TMDB sometimes miss.
//   Also provides production company data via the companies array.
//
// AUTH: two-step. POST /login with API key → bearer token (cached for run).
//   Set TVDB_API_KEY in .env.
//
// MIGRATION: automatically adds tvdb_id INTEGER column + unique index to shows
//   table if not already present (idempotent via PRAGMA table_info).
//
// COALESCE RULE: never overwrites existing data — all UPDATEs use COALESCE.
// CONFIDENCE: only upgrades pending → confirmed, never downgrades.
//
// Run: npx tsx scripts/import-tvdb.ts [--dry-run] [--limit=N] [--all]
//
// Flags:
//   --dry-run    Fetch + validate, no DB writes
//   --limit=N    Max shows to process (default 200)
//   --all        Process all shows, not just those with missing episode/season data

// Suppress node:sqlite experimental warning on startup — must be first
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import fs from 'node:fs';
import path from 'node:path';
import { initDb, run, query, getDb } from '../lib/db';

// Load .env variables as a fallback when --env-file is not passed
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // best-effort; proceed with whatever is in process.env
}

// ─── TVDB API types ───────────────────────────────────────────────────────────

interface TVDBAuthResponse {
  status: string;
  data: { token: string };
}

interface TVDBSearchResult {
  tvdb_id: string;
  name: string;
  network?: string;
  year?: string;
  imdb_id?: string;
  overview?: string;
  type: string;
}

interface TVDBSearchResponse {
  status: string;
  data: TVDBSearchResult[];
}

interface TVDBCompany {
  id: number;
  name: string;
  companyType?: { companyTypeId: number; companyTypeName: string };
}

interface TVDBSeason {
  id: number;
  number: number;           // official season number
  type: { id: number; name: string; type: string };
  episodes?: TVDBEpisode[];
}

interface TVDBEpisode {
  id: number;
  seasonNumber: number;
  number: number;
  name: string;
  aired: string | null;
}

interface TVDBSeriesExtended {
  id: number;
  name: string;
  network?: { id: number; name: string; abbreviation: string };
  originalNetwork?: { id: number; name: string };
  status?: { id: number; name: string; recordType: string; keepUpdated: boolean };
  firstAired?: string;
  lastAired?: string;
  nextAired?: string;
  averageRuntime?: number;
  year?: string;
  companies?: TVDBCompany[];
  remoteIds?: Array<{ id: string; type: number; sourceName: string }>;
  // Seasons are embedded in the extended response — type.type is 'official'|'dvd'|'absolute' etc.
  seasons?: Array<{ id: number; number: number; type: { id: number; type: string; name: string } }>;
}

interface TVDBExtendedResponse {
  status: string;
  data: TVDBSeriesExtended;
}

interface TVDBSeasonsResponse {
  status: string;
  data: TVDBSeason[];
}

interface TVDBEpisodesPage {
  status: string;
  data: {
    episodes: TVDBEpisode[];
  };
  links: {
    next: string | null;
    prev: string | null;
    total_items: number;
    page_size: number;
  };
}

// ─── DB row type ──────────────────────────────────────────────────────────────

interface ShowRow {
  id: string;
  title: string;
  network: string | null;
  imdb_id: string | null;
  episode_count: number | null;
  total_seasons: number | null;
  confidence: string | null;
}

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

function parseArgs(): { dryRun: boolean; limit: number; all: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all    = args.includes('--all');

  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 200;

  return { dryRun, limit, all };
}

// ─── Migration: add tvdb_id column if absent ──────────────────────────────────

/**
 * Ensures tvdb_id and tvdb_searched_at columns exist on shows table.
 * tvdb_searched_at records when a show was last searched — prevents re-searching
 * non-matching titles every batch run (30-day cooldown in the query below).
 */
function ensureTvdbColumns(): void {
  const db = getDb();

  const columns = db
    .prepare('PRAGMA table_info(shows)')
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('tvdb_id')) {
    console.log('Migration: adding tvdb_id column...');
    db.exec('ALTER TABLE shows ADD COLUMN tvdb_id INTEGER');
  }

  if (!names.has('tvdb_searched_at')) {
    console.log('Migration: adding tvdb_searched_at column...');
    db.exec('ALTER TABLE shows ADD COLUMN tvdb_searched_at INTEGER');
  }

  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_shows_tvdb_id
       ON shows(tvdb_id) WHERE tvdb_id IS NOT NULL`
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 250ms pause — TVDB allows ~5 req/sec on free tier; 250ms is conservative
const delay = (): Promise<void> => new Promise((r) => setTimeout(r, 250));

// Normalize for case-insensitive comparison
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Map TVDB status name to our air_status enum
function mapTvdbStatus(statusName: string | undefined): 'on_air' | 'available' | 'off_air' {
  if (!statusName) return 'on_air'; // unknown = assume active
  const s = statusName.toLowerCase();
  if (s.includes('continuing') || s.includes('upcoming') || s.includes('returning')) return 'on_air';
  if (s.includes('development') || s.includes('pilot')) return 'available';
  if (s.includes('ended') || s.includes('cancel')) return 'off_air';
  return 'on_air'; // default to on_air for unrecognized status strings
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Authenticates with TVDB v4 and returns a bearer token.
 * Token is valid for ~1 month but we cache it in-memory for the duration of this run.
 * Throws with a clear message if TVDB_API_KEY is missing or auth fails.
 */
async function authenticate(apiKey: string): Promise<string> {
  const res = await fetch('https://api4.thetvdb.com/v4/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TVDB auth failed (HTTP ${res.status}): ${body}`);
  }

  const data = await res.json() as TVDBAuthResponse;

  if (!data?.data?.token) {
    throw new Error('TVDB auth response missing token — check API key');
  }

  return data.data.token;
}

// ─── API fetch helpers ────────────────────────────────────────────────────────

/**
 * Search TVDB for a series by title.
 * type=series filters to TV shows only, avoiding movies and other entity types.
 */
async function searchTVDB(token: string, title: string): Promise<TVDBSearchResult[]> {
  const url = `https://api4.thetvdb.com/v4/search?query=${encodeURIComponent(title)}&type=series`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`TVDB search HTTP ${res.status} for "${title}"`);
  }

  const data = await res.json() as TVDBSearchResponse;
  return data.data ?? [];
}

/**
 * Fetch extended series detail from TVDB.
 * Includes companies array (production companies), status, firstAired, nextAired, etc.
 */
async function fetchSeriesExtended(token: string, tvdbId: number): Promise<TVDBSeriesExtended> {
  const url = `https://api4.thetvdb.com/v4/series/${tvdbId}/extended`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`TVDB series detail HTTP ${res.status} for ID ${tvdbId}`);
  }

  const data = await res.json() as TVDBExtendedResponse;
  return data.data;
}

/**
 * Fetch the official season list for a series.
 * Uses /v4/series/{id}/seasons/official — no /extended suffix (that endpoint doesn't exist).
 * Returns seasons sorted ascending by number (season 0 = specials is excluded).
 */
async function fetchSeasons(token: string, tvdbId: number): Promise<TVDBSeason[]> {
  const url = `https://api4.thetvdb.com/v4/series/${tvdbId}/seasons/official`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`TVDB seasons HTTP ${res.status} for ID ${tvdbId}`);
  }

  const data = await res.json() as TVDBSeasonsResponse;
  return (data.data ?? [])
    .filter((s) => s.number > 0)
    .sort((a, b) => a.number - b.number);
}

/**
 * Fetch total episode count for a series via the episodes endpoint.
 * Uses page 0 and reads links.total_items — much cheaper than fetching all pages.
 * Returns null if the endpoint fails (non-fatal).
 */
async function fetchEpisodeCount(token: string, tvdbId: number): Promise<number | null> {
  const url = `https://api4.thetvdb.com/v4/series/${tvdbId}/episodes/official?page=0`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // Non-fatal — season count is more important than episode count
    return null;
  }

  const data = await res.json() as TVDBEpisodesPage;
  // links.total_items is the authoritative episode count across all pages
  return data.links?.total_items ?? null;
}

// ─── Match logic ──────────────────────────────────────────────────────────────

/**
 * Given TVDB search results and local show data, return the best match.
 *
 * Match priority:
 *   1. imdb_id match — strongest signal (unambiguous)
 *   2. Title match + network match
 *   3. Title match alone (only if no network data on either side)
 *
 * Title similarity is case-insensitive normalized exact match to avoid
 * false positives like "Survivor" vs "Survivor: Winners at War".
 */
function findBestMatch(
  results: TVDBSearchResult[],
  localTitle: string,
  localNetwork: string | null,
  localImdbId: string | null
): TVDBSearchResult | null {
  const normLocal = norm(localTitle);
  const normNetwork = localNetwork ? norm(localNetwork) : null;

  // First pass: imdb_id exact match — highest confidence
  if (localImdbId) {
    for (const r of results) {
      if (r.imdb_id && r.imdb_id === localImdbId) return r;
    }
  }

  // Second pass: title + network match
  for (const r of results) {
    if (norm(r.name) !== normLocal) continue;

    const remoteNetwork = r.network ? norm(r.network) : null;
    const networkOk =
      (normNetwork !== null && remoteNetwork !== null &&
        (remoteNetwork.includes(normNetwork) || normNetwork.includes(remoteNetwork))) ||
      // Both have no network — still a valid title match
      (normNetwork === null && (remoteNetwork === null || r.network === ''));

    if (networkOk) return r;
  }

  // Third pass: title-only match when neither side has network data
  if (!normNetwork) {
    for (const r of results) {
      if (norm(r.name) === normLocal) return r;
    }
  }

  return null;
}

// ─── Core enrichment ─────────────────────────────────────────────────────────

/**
 * Main TVDB enrichment loop.
 *
 * For each show:
 *   1. Search TVDB by title
 *   2. Match using imdb_id preference then title+network
 *   3. Fetch extended series detail (status, dates, companies)
 *   4. Fetch official season list (season count + total episodes)
 *   5. UPDATE shows with COALESCE guards — existing data is never overwritten
 *
 * Per-show errors are caught — a single 404 or network hiccup never kills the run.
 * Rate-limited to 250ms between all API calls.
 */
async function runEnrichment(
  token: string,
  dryRun: boolean,
  limit: number,
  all: boolean
): Promise<void> {
  const prefix = dryRun ? 'DRY RUN: ' : '';

  // 30-day cooldown for already-searched but unmatched shows.
  // Without this, every batch re-searches the same no-match titles, wasting API quota.
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const whereClause = all
    ? '1=1'
    : `(total_seasons IS NULL OR episode_count IS NULL)
       AND (tvdb_id IS NOT NULL OR tvdb_searched_at IS NULL OR tvdb_searched_at < ${thirtyDaysAgo})`;

  const shows = query<ShowRow>(
    `SELECT id, title, network, imdb_id, episode_count, total_seasons, confidence
     FROM shows
     WHERE ${whereClause}
     ORDER BY title ASC
     LIMIT ?`,
    [limit]
  );

  console.log(
    `${prefix}TVDB enrichment: processing ${shows.length} show(s) (limit=${limit}, all=${all})...`
  );

  // Summary counters
  let matched  = 0;
  let updated  = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const show of shows) {
    try {
      // ── Search ────────────────────────────────────────────────────────────
      const results = await searchTVDB(token, show.title);
      await delay();

      if (results.length === 0) {
        console.log(`  ~ ${show.title}: no TVDB results`);
        if (!dryRun) run('UPDATE shows SET tvdb_searched_at = ? WHERE id = ?', [Date.now(), show.id]);
        skipped++;
        continue;
      }

      // ── Match ─────────────────────────────────────────────────────────────
      const best = findBestMatch(results, show.title, show.network, show.imdb_id);

      if (!best) {
        console.log(`  ~ ${show.title}: no confident TVDB match (${results.length} candidates)`);
        if (!dryRun) run('UPDATE shows SET tvdb_searched_at = ? WHERE id = ?', [Date.now(), show.id]);
        skipped++;
        continue;
      }

      matched++;
      const tvdbId = parseInt(best.tvdb_id, 10);

      // ── Fetch series extended detail ───────────────────────────────────────
      const detail = await fetchSeriesExtended(token, tvdbId);
      await delay();

      // ── Fetch episode count via episodes endpoint ─────────────────────────
      // /v4/series/{id}/seasons/official returns HTTP 400 on free tier — use extended seasons instead.
      // /v4/series/{id}/episodes/official?page=0 gives total_items for episode count.
      const totalEpisodes = await fetchEpisodeCount(token, tvdbId);
      await delay();

      // ── Compute enrichment values ──────────────────────────────────────────

      // Season count from extended response: filter to official type, exclude season 0 (specials)
      const officialSeasons = (detail.seasons ?? [])
        .filter((s) => s.type?.type === 'official' && s.number > 0);
      const totalSeasons = officialSeasons.length > 0 ? officialSeasons.length : null;

      // Air status from status record name
      const airStatus = mapTvdbStatus(detail.status?.name);

      // premiere_date: TVDB uses YYYY-MM-DD strings
      const premiereDate =
        detail.firstAired && detail.firstAired !== '0000-00-00'
          ? Date.parse(detail.firstAired) || null
          : null;

      // off_air_date: use lastAired only if the show has ended
      const isEnded = detail.status?.name?.toLowerCase().includes('ended') ||
                      detail.status?.name?.toLowerCase().includes('cancel');
      const offAirDate =
        isEnded && detail.lastAired && detail.lastAired !== '0000-00-00'
          ? Date.parse(detail.lastAired) || null
          : null;

      // imdb_id: TVDB remoteIds may carry the IMDB ID if we don't already have it
      const tvdbImdbId =
        detail.remoteIds?.find((r) => r.sourceName === 'IMDB' || r.type === 2)?.id ?? null;

      // Confidence upgrade: second source match promotes pending → confirmed
      const newConfidence =
        show.confidence === 'pending' ? 'confirmed' : (show.confidence ?? 'confirmed');

      console.log(
        `${prefix}✓ ${show.title} → TVDB #${tvdbId} [${detail.status?.name ?? '?'}]  seasons=${totalSeasons ?? '?'} eps=${totalEpisodes ?? '?'}`
      );

      // ── UPDATE with COALESCE guards — never overwrite existing data ────────
      if (!dryRun) {
        run(
          `UPDATE shows SET
             tvdb_id          = COALESCE(tvdb_id,        ?),
             episode_count    = COALESCE(episode_count,  ?),
             total_seasons    = COALESCE(total_seasons,  ?),
             air_status       = COALESCE(air_status,     ?),
             premiere_date    = COALESCE(premiere_date,  ?),
             off_air_date     = COALESCE(off_air_date,   ?),
             imdb_id          = COALESCE(imdb_id,        ?),
             confidence       = ?,
             tvdb_searched_at = ?,
             updated_at       = ?
           WHERE id = ?`,
          [
            tvdbId,
            totalEpisodes,
            totalSeasons,
            airStatus,
            premiereDate,
            offAirDate,
            tvdbImdbId,
            newConfidence,
            Date.now(),
            Date.now(),
            show.id,
          ]
        );
        updated++;
      } else {
        updated++;
      }
    } catch (err) {
      // Per-show error: log and continue — one bad show must not abort the run
      console.error(`  ✗ ${show.title}: ${(err as Error).message}`);
      errors++;

      // Still wait so we don't slam the API after an error response
      await delay();
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log(`${prefix}TVDB enrichment complete`);
  console.log(`  authenticated : yes (token obtained)`);
  console.log(`  matched       : ${matched}`);
  console.log(`  updated       : ${updated}`);
  console.log(`  skipped       : ${skipped} (no match found)`);
  console.log(`  errors        : ${errors}`);
  console.log('─────────────────────────────────────────────');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Check for API key before touching the DB ────────────────────────────────
  const apiKey = process.env.TVDB_API_KEY ?? '';
  if (!apiKey) {
    console.error(
      'Error: TVDB_API_KEY is not set.\n' +
      '  Get a free API key at https://thetvdb.com/api-information\n' +
      '  Then add  TVDB_API_KEY=your_key  to your .env file.'
    );
    process.exit(1);
  }

  // ── Initialize DB and run migration before any queries ─────────────────────
  initDb();
  ensureTvdbColumns();

  const { dryRun, limit, all } = parseArgs();

  if (dryRun) {
    console.log('DRY RUN MODE — no DB writes will be made\n');
  }

  // ── Authenticate ────────────────────────────────────────────────────────────
  console.log('Authenticating with TVDB v4...');
  let token: string;
  try {
    token = await authenticate(apiKey);
    console.log('Authentication successful.\n');
  } catch (err) {
    console.error(`Authentication failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── Run enrichment loop ─────────────────────────────────────────────────────
  await runEnrichment(token, dryRun, limit, all);
}

main().catch((err) => {
  console.error('Fatal error:', (err as Error).message);
  process.exit(1);
});
