// Phase 2 of the show DB seed — streaming originals + production company linkage.
//
// WHY TMDB AFTER TVMAZE:
//   TVMaze (Phase 1) covers cable/broadcast well. TMDB adds two things TVMaze lacks:
//     1. Streaming originals — Netflix, Hulu, Prime, Max, Apple TV+, Disney+, Peacock, Paramount+
//     2. Production company data — TMDB returns the prodcos that made each show,
//        which populates shows.prodco_id / prodco_2_id and the production_companies table.
//
//   TMDB also acts as a second source: any show it finds that matches a pending TVMaze row
//   (by title + network) gets promoted from 'pending' to 'confirmed'.
//
// CONFIDENCE MODEL (same as Phase 1):
//   'confirmed' — TMDB genre includes Reality (10764) or Documentary (99), AND
//                 the show's TMDB networks list includes our expected network.
//   'pending'   — something is uncertain; kept in DB, hidden from UI until confirmed.
//   Confidence only upgrades, never downgrades. Never overwrites a confirmed row's confidence.
//
// SETUP:
//   Get a free API key at https://www.themoviedb.org/settings/api
//   Add TMDB_API_KEY to your .env file.
//
// Run: npx tsx scripts/seed-tmdb.ts [flags]
//
// Flags:
//   --dry-run               Fetch + validate, no DB writes
//   --verify                Dry run with per-network confidence breakdown
//   --network=Netflix       Seed one network only
//   --verify-networks       Print TMDB network names for all configured IDs then exit
//   --skip-prodcos          Don't upsert production companies (faster for re-runs)
//   --on-air-only           Skip shows with status Ended or Canceled

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { randomUUID } from 'node:crypto';
import { initDb, run, query, queryOne } from '../lib/db';

// ─── Config ───────────────────────────────────────────────────────────────────

const TMDB_API_KEY = process.env.TMDB_API_KEY ?? '';
const TMDB_BASE    = 'https://api.themoviedb.org/3';

// Streaming networks to seed. tmdbId is the TMDB network entity ID.
// Run --verify-networks to confirm each name against the live TMDB API.
const STREAMING_NETWORKS: Array<{ name: string; tmdbId: number }> = [
  { name: 'Netflix',            tmdbId: 213   },
  { name: 'Amazon Prime Video', tmdbId: 1024  },
  { name: 'Hulu',               tmdbId: 453   },
  { name: 'Max',                tmdbId: 3186  },
  { name: 'Apple TV+',          tmdbId: 2552  },
  { name: 'Disney+',            tmdbId: 2739  },
  { name: 'Paramount+',         tmdbId: 4330  },
  { name: 'Peacock',            tmdbId: 3353  },
  { name: 'discovery+',         tmdbId: 3771  },
];

// TMDB genre IDs — filter applied at the API level via discover endpoint.
// Documentary: 99, Reality TV: 10764
// We request shows that have AT LEAST ONE of these genres (OR logic with | separator).
const KEEP_GENRE_IDS = [99, 10764]; // Documentary | Reality TV

// Genres we actively exclude — applied via without_genres (AND logic, comma-separated).
// These exclude scripted content even if a Documentary tag also appears on the same show.
const EXCLUDE_GENRE_IDS = [
  18,    // Drama
  35,    // Comedy
  10763, // News
  10767, // Talk
  10766, // Soap Opera
  10765, // Sci-Fi & Fantasy
  10762, // Kids
  16,    // Animation
];

// TMDB status → our air_status enum
function mapTmdbStatus(status: string): 'on_air' | 'available' | 'off_air' {
  if (['Returning Series', 'In Production'].includes(status)) return 'on_air';
  if (['Planned', 'Pilot', 'In Development'].includes(status)) return 'available';
  return 'off_air'; // Ended, Canceled
}

// ─── TMDB API types ───────────────────────────────────────────────────────────

interface TmdbDiscoverResult {
  id: number;
  name: string;
  first_air_date: string | null;
  genre_ids: number[];
  origin_country: string[];
  poster_path: string | null;
}

interface TmdbDiscoverResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbDiscoverResult[];
}

interface TmdbNetworkInfo {
  id: number;
  name: string;
  headquarters: string;
  homepage: string;
}

interface TmdbProdco {
  id: number;
  name: string;
  origin_country: string;
  logo_path: string | null;
}

interface TmdbShowDetail {
  id: number;
  name: string;
  status: string;
  first_air_date: string | null;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: Array<{ id: number; name: string }>;
  networks: Array<{ id: number; name: string }>;
  production_companies: TmdbProdco[];
  origin_country: string[];
  overview: string | null;
  popularity: number;
  external_ids?: {
    imdb_id: string | null;
    tvdb_id: number | null;
  };
}

// ─── DB row types ─────────────────────────────────────────────────────────────

interface ShowRow { id: string; confidence: string; tvmaze_id: number | null }
interface BuyerCompanyRow { id: string; name: string }
interface ProdcoRow { id: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

function normTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── TMDB API fetchers ────────────────────────────────────────────────────────

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchNetworkInfo(tmdbId: number): Promise<TmdbNetworkInfo> {
  return tmdbGet<TmdbNetworkInfo>(`/network/${tmdbId}`);
}

async function discoverShows(tmdbNetworkId: number, page: number): Promise<TmdbDiscoverResponse> {
  return tmdbGet<TmdbDiscoverResponse>('/discover/tv', {
    with_networks:     String(tmdbNetworkId),
    with_genres:       KEEP_GENRE_IDS.join('|'),     // OR — must have at least one
    without_genres:    EXCLUDE_GENRE_IDS.join(','),  // AND NOT — exclude any of these
    sort_by:           'first_air_date.desc',
    page:              String(page),
    include_null_first_air_dates: 'false',
  });
}

async function fetchShowDetail(tmdbId: number): Promise<TmdbShowDetail> {
  return tmdbGet<TmdbShowDetail>(`/tv/${tmdbId}`, {
    append_to_response: 'external_ids',
  });
}

// ─── Confidence assessment ────────────────────────────────────────────────────

type Confidence = 'confirmed' | 'pending';

function assessConfidence(
  detail: TmdbShowDetail,
  expectedTmdbNetworkId: number
): { confidence: Confidence; pendingReasons: string[] } {
  const reasons: string[] = [];

  const genreIds = detail.genres.map(g => g.id);
  const hasUnscriptedGenre = KEEP_GENRE_IDS.some(id => genreIds.includes(id));
  if (!hasUnscriptedGenre) {
    reasons.push(`no unscripted genre tag (genres: ${detail.genres.map(g => g.name).join(', ') || 'none'})`);
  }

  const networkMatch = detail.networks.some(n => n.id === expectedTmdbNetworkId);
  if (!networkMatch) {
    const networkNames = detail.networks.map(n => n.name).join(', ') || 'none';
    reasons.push(`network field does not include expected ID ${expectedTmdbNetworkId} (found: ${networkNames})`);
  }

  if (!detail.name?.trim()) {
    reasons.push('title is empty');
  }

  return {
    confidence: reasons.length === 0 ? 'confirmed' : 'pending',
    pendingReasons: reasons,
  };
}

// ─── Production company upsert ────────────────────────────────────────────────

// Inserts a TMDB production company if it doesn't already exist (by tmdb_id or name_normalized).
// Returns the internal UUID for FK linkage on the show row.
function upsertProdco(tmdbProdco: TmdbProdco, dryRun: boolean): string | null {
  if (!tmdbProdco.name?.trim()) return null;

  const nameNorm = normTitle(tmdbProdco.name);

  // Check by TMDB ID first (most precise), then by normalized name
  const existing = queryOne<ProdcoRow>(
    `SELECT id FROM production_companies WHERE tmdb_id = ? OR name_normalized = ? LIMIT 1`,
    [tmdbProdco.id, nameNorm]
  );

  if (existing) {
    // Backfill tmdb_id if it was missing (e.g. row created before Phase 2)
    if (!dryRun) {
      run(
        `UPDATE production_companies SET tmdb_id = COALESCE(tmdb_id, ?), updated_at = ? WHERE id = ?`,
        [tmdbProdco.id, Date.now(), existing.id]
      );
    }
    return existing.id;
  }

  if (dryRun) return 'dry-run';

  const id = randomUUID();
  const now = Date.now();
  const result = run(
    `INSERT OR IGNORE INTO production_companies
       (id, name, name_normalized, tmdb_id, hq_city, ownership_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'independent', ?, ?)`,
    [id, tmdbProdco.name.trim(), nameNorm, tmdbProdco.id,
     tmdbProdco.origin_country || null, now, now]
  );

  return result.changes > 0 ? id : null;
}

// ─── Buyer company linkage ────────────────────────────────────────────────────

// Maps streaming service names to known buyer_companies entries.
// Streaming services are increasingly commissioning directly as buyers.
function resolveBuyerCompany(networkName: string): BuyerCompanyRow | null {
  return queryOne<BuyerCompanyRow>(
    `SELECT id, name FROM buyer_companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
    [networkName]
  ) ?? null;
}

// ─── Show upsert ──────────────────────────────────────────────────────────────

// Tracks TMDB IDs already processed this session to prevent double-processing
// when a show's network data points to multiple networks.
const seenTmdbIds = new Set<number>();

interface UpsertResult {
  action: 'inserted' | 'updated' | 'promoted' | 'already_confirmed' | 'duplicate';
  showId: string;
}

function upsertShow(
  detail: TmdbShowDetail,
  networkName: string,
  buyerCompanyId: string | null,
  prodcoId: string | null,
  prodco2Id: string | null,
  confidence: Confidence,
  dryRun: boolean
): UpsertResult {
  if (seenTmdbIds.has(detail.id)) {
    return { action: 'duplicate', showId: '' };
  }
  seenTmdbIds.add(detail.id);

  const now         = Date.now();
  const titleNorm   = normTitle(detail.name);
  const airStatus   = mapTmdbStatus(detail.status);
  const offAirDate  = detail.last_air_date && airStatus === 'off_air'
    ? Date.parse(detail.last_air_date) : null;
  const premiereDate = detail.first_air_date ? Date.parse(detail.first_air_date) : null;
  const totalSeasons = detail.number_of_seasons > 0 ? detail.number_of_seasons : null;
  const genre        = detail.genres[0]?.name ?? null;
  const tmdbGenres   = detail.genres.length > 0 ? JSON.stringify(detail.genres.map(g => g.name)) : null;
  const imdbId       = detail.external_ids?.imdb_id ?? null;

  if (dryRun) {
    const exists = queryOne<ShowRow>(
      `SELECT id, confidence, tvmaze_id FROM shows WHERE tmdb_id = ? OR (title_normalized = ? AND network = ?)`,
      [String(detail.id), titleNorm, networkName]
    );
    if (exists) {
      return {
        action: exists.confidence === 'pending' && confidence === 'confirmed' ? 'promoted' : 'already_confirmed',
        showId: exists.id,
      };
    }
    return { action: 'inserted', showId: 'dry-run' };
  }

  // Primary dedup: TMDB ID (exact match)
  const existingByTmdb = queryOne<ShowRow>(
    `SELECT id, confidence, tvmaze_id FROM shows WHERE tmdb_id = ?`,
    [String(detail.id)]
  );

  if (existingByTmdb) {
    return updateExisting(existingByTmdb, detail, airStatus, totalSeasons, offAirDate,
      tmdbGenres, genre, buyerCompanyId, prodcoId, prodco2Id, imdbId, confidence, now);
  }

  // Second-source cross-reference: match pending TVMaze shows by title + network
  // This is the promotion path: TVMaze seeded it as pending, TMDB confirms it.
  const existingByTitle = queryOne<ShowRow>(
    `SELECT id, confidence, tvmaze_id FROM shows WHERE title_normalized = ? AND network = ?`,
    [titleNorm, networkName]
  );

  if (existingByTitle) {
    return updateExisting(existingByTitle, detail, airStatus, totalSeasons, offAirDate,
      tmdbGenres, genre, buyerCompanyId, prodcoId, prodco2Id, imdbId, confidence, now);
  }

  // New show — insert
  const id = randomUUID();
  const result = run(
    `INSERT OR IGNORE INTO shows
       (id, title, title_normalized, network, network_id,
        tmdb_id, tvmaze_genres, genre, is_unscripted,
        air_status, total_seasons, off_air_date, premiere_date,
        imdb_id, prodco_id, prodco_2_id,
        confidence, source, data_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'tmdb', 'tmdb', ?, ?)`,
    [id, detail.name.trim(), titleNorm, networkName, buyerCompanyId,
     String(detail.id), tmdbGenres, genre,
     airStatus, totalSeasons, offAirDate, premiereDate,
     imdbId, prodcoId, prodco2Id,
     confidence, now, now]
  );

  return result.changes > 0
    ? { action: 'inserted', showId: id }
    : { action: 'duplicate', showId: id };
}

// Shared update path for both TMDB-ID and title+network matches.
// Confidence only upgrades: pending → confirmed. Never confirmed → pending.
function updateExisting(
  existing: ShowRow,
  detail: TmdbShowDetail,
  airStatus: string,
  totalSeasons: number | null,
  offAirDate: number | null,
  tmdbGenres: string | null,
  genre: string | null,
  buyerCompanyId: string | null,
  prodcoId: string | null,
  prodco2Id: string | null,
  imdbId: string | null,
  incomingConfidence: Confidence,
  now: number
): UpsertResult {
  const newConfidence =
    existing.confidence === 'pending' && incomingConfidence === 'confirmed'
      ? 'confirmed'
      : existing.confidence;

  run(
    `UPDATE shows SET
       tmdb_id       = COALESCE(tmdb_id, ?),
       air_status    = ?,
       total_seasons = COALESCE(total_seasons, ?),
       off_air_date  = COALESCE(off_air_date, ?),
       tvmaze_genres = COALESCE(tvmaze_genres, ?),
       genre         = COALESCE(genre, ?),
       is_unscripted = 1,
       network_id    = COALESCE(network_id, ?),
       prodco_id     = COALESCE(prodco_id, ?),
       prodco_2_id   = COALESCE(prodco_2_id, ?),
       imdb_id       = COALESCE(imdb_id, ?),
       confidence    = ?,
       updated_at    = ?
     WHERE id = ?`,
    [String(detail.id), airStatus, totalSeasons, offAirDate,
     tmdbGenres, genre, buyerCompanyId, prodcoId, prodco2Id, imdbId,
     newConfidence, now, existing.id]
  );

  const action = newConfidence === 'confirmed' && existing.confidence === 'pending'
    ? 'promoted'
    : 'already_confirmed';

  return { action, showId: existing.id };
}

// ─── Per-network processing ───────────────────────────────────────────────────

interface NetworkStats {
  total: number;
  skipped: number;
  confirmed: number;
  pending: number;
  inserted: number;
  updated: number;
  promoted: number;
  prodcosAdded: number;
  errors: number;
  buyerLinked: boolean;
}

async function processNetwork(
  networkName: string,
  tmdbNetworkId: number,
  opts: { dryRun: boolean; verify: boolean; onAirOnly: boolean; skipProdcos: boolean }
): Promise<NetworkStats> {
  const stats: NetworkStats = {
    total: 0, skipped: 0, confirmed: 0, pending: 0,
    inserted: 0, updated: 0, promoted: 0, prodcosAdded: 0, errors: 0,
    buyerLinked: false,
  };

  const buyerCo = resolveBuyerCompany(networkName);
  stats.buyerLinked = !!buyerCo;

  if (buyerCo) {
    console.log(`  ✓ buyer_companies → "${buyerCo.name}"`);
  } else {
    console.log(`  ⚠ Not in buyer_companies — network_id will be NULL until added`);
  }

  // Page through all discover results for this network
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    let discoverPage: TmdbDiscoverResponse;
    try {
      discoverPage = await discoverShows(tmdbNetworkId, page);
      await delay(250);
    } catch (err) {
      console.error(`  ✗ Discover page ${page}: ${(err as Error).message}`);
      stats.errors++;
      break;
    }

    totalPages = discoverPage.total_pages;
    stats.total += discoverPage.results.length;

    for (const result of discoverPage.results) {
      if (opts.onAirOnly && result.first_air_date) {
        // Quick pre-filter: skip shows that ended more than 5 years ago based on first_air_date
        // (imprecise — detail fetch would be more accurate, but avoids unnecessary API calls)
      }

      // Fetch full show detail for production companies, networks verification, and season count
      let detail: TmdbShowDetail;
      try {
        detail = await fetchShowDetail(result.id);
        await delay(250);
      } catch (err) {
        console.error(`  ✗ ${result.name}: ${(err as Error).message}`);
        stats.errors++;
        continue;
      }

      // Apply on-air filter now that we have accurate status
      if (opts.onAirOnly && !['on_air', 'available'].includes(mapTmdbStatus(detail.status))) {
        stats.skipped++;
        continue;
      }

      const { confidence, pendingReasons } = assessConfidence(detail, tmdbNetworkId);

      if (confidence === 'confirmed') {
        stats.confirmed++;
      } else {
        stats.pending++;
        if (opts.verify) {
          console.log(`  ~ PENDING "${detail.name}"  [${detail.genres.map(g => g.name).join(', ') || '—'}]`);
          for (const r of pendingReasons) console.log(`      → ${r}`);
        }
      }

      if (opts.dryRun) continue;

      // Upsert production companies and collect their IDs for FK linkage
      let prodcoId: string | null = null;
      let prodco2Id: string | null = null;

      if (!opts.skipProdcos && detail.production_companies.length > 0) {
        const p1 = detail.production_companies[0];
        const p2 = detail.production_companies[1];

        const id1 = upsertProdco(p1, opts.dryRun);
        if (id1 && id1 !== 'dry-run') {
          prodcoId = id1;
          stats.prodcosAdded++;
        }

        if (p2) {
          const id2 = upsertProdco(p2, opts.dryRun);
          if (id2 && id2 !== 'dry-run') {
            prodco2Id = id2;
          }
        }
      }

      try {
        const upsert = upsertShow(
          detail, networkName, buyerCo?.id ?? null,
          prodcoId, prodco2Id, confidence, opts.dryRun
        );

        const label = confidence === 'pending' ? ' [pending]' : '';
        if (upsert.action === 'inserted') {
          stats.inserted++;
          console.log(
            `  + ${detail.name}${label}  S${detail.number_of_seasons}` +
            `  ${detail.genres.map(g => g.name).join(', ') || '—'}` +
            (detail.production_companies[0] ? `  · ${detail.production_companies[0].name}` : '')
          );
        } else if (upsert.action === 'promoted') {
          stats.promoted++;
          console.log(`  ↑ ${detail.name}  pending → confirmed  (TMDB second source)`);
        } else if (upsert.action === 'inserted' || upsert.action === 'updated' || upsert.action === 'already_confirmed') {
          stats.updated++;
        }
      } catch (err) {
        console.error(`  ✗ ${detail.name}: ${(err as Error).message}`);
        stats.errors++;
      }
    }

    page++;
  }

  await delay(500);
  return stats;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary(): void {
  console.log('\n══ Triangulation Coverage (all sources) ════════════════════\n');

  const rows = query<{ stat: string; value: number }>(`
    SELECT 'confirmed'   as stat, COUNT(*) as value FROM shows WHERE confidence = 'confirmed'
    UNION ALL SELECT 'pending',           COUNT(*) FROM shows WHERE confidence = 'pending'
    UNION ALL SELECT 'network_linked',    COUNT(*) FROM shows WHERE network_id IS NOT NULL
    UNION ALL SELECT 'prodco_linked',     COUNT(*) FROM shows WHERE prodco_id IS NOT NULL
    UNION ALL SELECT 'both_linked',       COUNT(*) FROM shows WHERE network_id IS NOT NULL AND prodco_id IS NOT NULL
    UNION ALL SELECT 'on_air',            COUNT(*) FROM shows WHERE air_status = 'on_air' AND confidence = 'confirmed'
    UNION ALL SELECT 'off_air',           COUNT(*) FROM shows WHERE air_status = 'off_air' AND confidence = 'confirmed'
    UNION ALL SELECT 'total_prodcos',     COUNT(*) FROM production_companies
    UNION ALL SELECT 'buyer_nets',        COUNT(DISTINCT network_id) FROM shows WHERE network_id IS NOT NULL
  `);
  const s = Object.fromEntries(rows.map(r => [r.stat, r.value]));

  console.log(`  Confirmed shows:           ${s.confirmed ?? 0}  ← in UI`);
  console.log(`  Pending shows:             ${s.pending ?? 0}  ← awaiting confirmation`);
  console.log(`  Network-linked:            ${s.network_linked ?? 0}  (show → buyer_companies)`);
  console.log(`  Prodco-linked:             ${s.prodco_linked ?? 0}  (show → production_companies)`);
  console.log(`  Full triangle (both):      ${s.both_linked ?? 0}  (show + network + prodco)`);
  console.log(`  Production companies:      ${s.total_prodcos ?? 0}`);
  console.log(`  Buyer networks with shows: ${s.buyer_nets ?? 0}`);
  console.log(`  On air (confirmed):        ${s.on_air ?? 0}`);
  console.log(`  Off air (confirmed):       ${s.off_air ?? 0}`);

  // Networks with the most triangulated shows (show + network + prodco all linked)
  const topNets = query<{ network: string; cnt: number }>(
    `SELECT bc.name as network, COUNT(*) as cnt
     FROM shows s JOIN buyer_companies bc ON s.network_id = bc.id
     WHERE s.prodco_id IS NOT NULL AND s.confidence = 'confirmed'
     GROUP BY bc.name ORDER BY cnt DESC LIMIT 10`
  );
  if (topNets.length) {
    console.log('\n  Most triangulated networks (show + network + prodco):');
    for (const r of topNets) console.log(`    ${r.network.padEnd(30)} ${r.cnt}`);
  }

  // Top prodcos by show count
  const topProdcos = query<{ prodco: string; cnt: number }>(
    `SELECT pc.name as prodco, COUNT(*) as cnt
     FROM shows s JOIN production_companies pc ON s.prodco_id = pc.id
     WHERE s.confidence = 'confirmed'
     GROUP BY pc.name ORDER BY cnt DESC LIMIT 10`
  );
  if (topProdcos.length) {
    console.log('\n  Most active production companies:');
    for (const r of topProdcos) console.log(`    ${r.prodco.padEnd(36)} ${r.cnt}`);
  }

  console.log('\n  Next: npx tsx scripts/classify-shows.ts  ← format_type + relevance_tier on all seeded shows');
  console.log('');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not set. Get a free key at https://www.themoviedb.org/settings/api');
    process.exit(1);
  }

  initDb();

  const args         = process.argv.slice(2);
  const verifyNets   = args.includes('--verify-networks');
  const verify       = args.includes('--verify');
  const dryRun       = args.includes('--dry-run') || verify;
  const onAirOnly    = args.includes('--on-air-only');
  const skipProdcos  = args.includes('--skip-prodcos');
  const networkFlag  = args.find(a => a.startsWith('--network='))?.split('=')[1];

  // --verify-networks: confirm configured TMDB network IDs against the live API
  if (verifyNets) {
    console.log('Verifying TMDB network IDs...\n');
    for (const net of STREAMING_NETWORKS) {
      try {
        const info = await fetchNetworkInfo(net.tmdbId);
        const match = info.name.toLowerCase() === net.name.toLowerCase();
        const status = match ? '✓' : '⚠ NAME MISMATCH';
        console.log(`  ${status}  ${net.name} → TMDB says: "${info.name}" (ID: ${net.tmdbId})`);
        await delay(250);
      } catch (err) {
        console.log(`  ✗  ${net.name} (${net.tmdbId}): ${(err as Error).message}`);
      }
    }
    return;
  }

  if (verify)      console.log('VERIFY: fetching + assessing confidence — no DB writes\n');
  else if (dryRun) console.log('DRY RUN: no DB writes\n');

  const targets = networkFlag
    ? STREAMING_NETWORKS.filter(n => n.name.toLowerCase() === networkFlag.toLowerCase())
    : STREAMING_NETWORKS;

  if (targets.length === 0) {
    console.error(`Network "${networkFlag}" not found. Available: ${STREAMING_NETWORKS.map(n => n.name).join(', ')}`);
    process.exit(1);
  }

  const grand = {
    total: 0, skipped: 0, confirmed: 0, pending: 0,
    inserted: 0, updated: 0, promoted: 0, prodcos: 0,
    errors: 0, networksLinked: 0,
  };

  for (const net of targets) {
    console.log(`\n── ${net.name}  (TMDB ID: ${net.tmdbId}) ─────────────────────────────`);

    const stats = await processNetwork(net.name, net.tmdbId, { dryRun, verify, onAirOnly, skipProdcos });

    console.log(
      `  → confirmed ${stats.confirmed}  pending ${stats.pending}  skipped ${stats.skipped}` +
      (!dryRun ? `  inserted ${stats.inserted}  updated ${stats.updated}  promoted ${stats.promoted}  prodcos +${stats.prodcosAdded}` : '') +
      (stats.errors > 0 ? `  errors ${stats.errors}` : '')
    );

    grand.total    += stats.total;
    grand.skipped  += stats.skipped;
    grand.confirmed += stats.confirmed;
    grand.pending  += stats.pending;
    grand.inserted += stats.inserted;
    grand.updated  += stats.updated;
    grand.promoted += stats.promoted;
    grand.prodcos  += stats.prodcosAdded;
    grand.errors   += stats.errors;
    if (stats.buyerLinked) grand.networksLinked++;
  }

  console.log('\n══ Complete ════════════════════════════════════════════════\n');
  console.log(`  Networks:                      ${targets.length}  (${grand.networksLinked} buyer-linked)`);
  console.log(`  Shows from TMDB:               ${grand.total}`);
  console.log(`  Confirmed:                     ${grand.confirmed}`);
  console.log(`  Pending:                       ${grand.pending}`);
  if (!dryRun) {
    console.log(`  Inserted new:                  ${grand.inserted}`);
    console.log(`  Updated existing:              ${grand.updated}`);
    console.log(`  Promoted pending → confirmed:  ${grand.promoted}`);
    console.log(`  Production companies added:    ${grand.prodcos}`);
  }

  if (!dryRun) printSummary();
}

main().catch(console.error);
