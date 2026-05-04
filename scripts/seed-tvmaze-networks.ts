// Seed the shows table from TVMaze for US cable, broadcast, and streaming networks.
//
// APPROACH:
//   TVMaze does not have per-network show list endpoints anymore. Instead, we do a
//   single paginated scan of all ~92k shows (367 pages × 250 shows, ~40 seconds at
//   100ms/page), then filter client-side for our 32 target networks. This is faster
//   and more reliable than any deprecated endpoint.
//
// DATA MODEL:
//   'confirmed' — type is explicitly unscripted + show's network/webChannel ID matches
//                 the network we're indexing.
//   'pending'   — passes the scripted-skip filter but something is uncertain.
//   Upgrade path: pending → confirmed only. Never overwrite confirmed data with seed data.
//
// Run: npx tsx scripts/seed-tvmaze-networks.ts [flags]
//
// Flags:
//   --dry-run       Fetch + validate, no DB writes
//   --verify        Dry run with per-network confidence breakdown
//   --network=NAME  Seed one network only (e.g. --network=Bravo)
//   --on-air-only   Skip Ended / Canceled shows
//   --no-detail     Skip per-show detail fetch (loses season counts; much faster)
//   --streaming     Seed streaming web channels only
//   --all           Seed both cable/broadcast AND streaming (default: cable only)

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { randomUUID } from 'node:crypto';
import { initDb, run, query, queryOne } from '../lib/db';

// ─── TVMaze API types ─────────────────────────────────────────────────────────

interface TVMazeNetworkRecord {
  id: number;
  name: string;
  country: { name: string; code: string } | null;
}

// Shape returned by the /shows?page=N index scan — includes schedule + network + webChannel
interface TVMazeShowFull {
  id: number;
  name: string;
  type: string;
  genres: string[];
  status: string;
  premiered: string | null;
  ended: string | null;
  schedule: { time: string; days: string[] } | null;
  externals: { imdb: string | null; thetvdb: number | null } | null;
  network: TVMazeNetworkRecord | null;
  webChannel: TVMazeNetworkRecord | null;
  // Only present after fetchShowDetail — carries season list
  _embedded?: {
    seasons: Array<{ id: number; number: number; episodeOrder: number | null }>;
  };
}

interface BuyerCompanyRow { id: string; name: string }
interface ShowIdRow { id: string; confidence: string }

// ─── Target network definitions ───────────────────────────────────────────────
// tvmazeId: the numeric ID used in show.network.id or show.webChannel.id
// aliases: used for buyer_companies FK lookup (exact case-insensitive match)

const CABLE_NETWORKS: Record<string, { tvmazeId: number; aliases: string[] }> = {
  'Discovery':               { tvmazeId: 66,  aliases: ['Discovery', 'Discovery Channel'] },
  'A&E':                     { tvmazeId: 29,  aliases: ['A&E'] },
  'History':                 { tvmazeId: 53,  aliases: ['History', 'HISTORY', 'History Channel'] },
  'TLC':                     { tvmazeId: 80,  aliases: ['TLC'] },
  'National Geographic':     { tvmazeId: 42,  aliases: ['National Geographic', 'Nat Geo'] },
  'HGTV':                    { tvmazeId: 192, aliases: ['HGTV', 'Home & Garden Television'] },
  'Food Network':            { tvmazeId: 81,  aliases: ['Food Network'] },
  'Travel Channel':          { tvmazeId: 82,  aliases: ['Travel Channel'] },
  'Lifetime':                { tvmazeId: 18,  aliases: ['Lifetime'] },
  'Bravo':                   { tvmazeId: 52,  aliases: ['Bravo'] },
  'Animal Planet':           { tvmazeId: 92,  aliases: ['Animal Planet'] },
  'Investigation Discovery': { tvmazeId: 89,  aliases: ['Investigation Discovery', 'ID'] },
  'OWN':                     { tvmazeId: 236, aliases: ['OWN', 'OWN: Oprah Winfrey Network', 'Oprah Winfrey Network'] },
  'truTV':                   { tvmazeId: 84,  aliases: ['truTV', 'tru TV'] },
  'Oxygen':                  { tvmazeId: 79,  aliases: ['Oxygen', 'Oxygen True Crime'] },
  'VH1':                     { tvmazeId: 55,  aliases: ['VH1'] },
  'Paramount Network':       { tvmazeId: 34,  aliases: ['Paramount Network'] },
  'AMC':                     { tvmazeId: 20,  aliases: ['AMC'] },
  'USA Network':             { tvmazeId: 30,  aliases: ['USA Network'] },
  'Freeform':                { tvmazeId: 26,  aliases: ['Freeform', 'ABC Family'] },
  'E!':                      { tvmazeId: 43,  aliases: ['E!'] },
  'Syfy':                    { tvmazeId: 16,  aliases: ['Syfy'] },
  'MTV':                     { tvmazeId: 22,  aliases: ['MTV'] },
  'BET':                     { tvmazeId: 56,  aliases: ['BET'] },
  'WE tv':                   { tvmazeId: 122, aliases: ['WE tv', 'WE TV'] },
  'Hallmark Channel':        { tvmazeId: 50,  aliases: ['Hallmark Channel'] },
};

// Streaming platforms — show.webChannel.id matches these IDs
const STREAMING_NETWORKS: Record<string, { tvmazeId: number; aliases: string[] }> = {
  'Netflix':            { tvmazeId: 1,   aliases: ['Netflix'] },
  'Amazon Prime Video': { tvmazeId: 3,   aliases: ['Amazon Prime Video', 'Prime Video'] },
  'Hulu':               { tvmazeId: 2,   aliases: ['Hulu'] },
  'discovery+':         { tvmazeId: 173, aliases: ['discovery+', 'Discovery+'] },
  'Peacock':            { tvmazeId: 347, aliases: ['Peacock'] },
  'Apple TV+':          { tvmazeId: 310, aliases: ['Apple TV+', 'Apple TV'] },
};

// ─── Skip / confidence classification ────────────────────────────────────────

const SKIP_TYPES = new Set([
  'Scripted', 'Animation', 'Talk Show', 'News',
  'Panel Show', 'Variety', 'Award Show', 'Miniseries',
]);

const SCRIPTED_GENRES = new Set([
  'Drama', 'Comedy', 'Action', 'Adventure', 'Science-Fiction',
  'Fantasy', 'Horror', 'Romance', 'Thriller', 'Espionage',
  'Medical', 'Legal', 'War', 'Western', 'Anime',
]);

const CONFIRMED_TYPES = new Set(['Reality', 'Documentary', 'Game Show', 'Sports']);

function shouldSkip(show: TVMazeShowFull): boolean {
  if (SKIP_TYPES.has(show.type)) return true;
  if (!CONFIRMED_TYPES.has(show.type) && show.genres.length > 0) {
    if (show.genres.every(g => SCRIPTED_GENRES.has(g))) return true;
  }
  return false;
}

type Confidence = 'confirmed' | 'pending';

function assessConfidence(
  show: TVMazeShowFull,
  expectedId: number,
  isWebchannel: boolean
): { confidence: Confidence; pendingReasons: string[] } {
  const reasons: string[] = [];

  if (!CONFIRMED_TYPES.has(show.type)) {
    reasons.push(`type "${show.type}" not in confirmed unscripted set`);
  }

  if (isWebchannel) {
    if (!show.webChannel || show.webChannel.id !== expectedId) {
      reasons.push(`webChannel mismatch — show may be on different platform`);
    }
  } else {
    if (!show.network || show.network.id !== expectedId) {
      reasons.push(`network mismatch — show may be syndicated`);
    }
  }

  if (!show.name?.trim()) {
    reasons.push('title is empty');
  }

  return {
    confidence: reasons.length === 0 ? 'confirmed' : 'pending',
    pendingReasons: reasons,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

function normTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function buildSchedule(s: { time: string; days: string[] } | null): string | null {
  if (!s) return null;
  if (!s.days.length && !s.time) return null;
  return s.days.length ? `${s.days.join('/')}${s.time ? ' ' + s.time : ''}` : s.time;
}

function mapAirStatus(status: string): 'on_air' | 'available' | 'off_air' {
  if (status === 'Running') return 'on_air';
  if (status === 'In Development') return 'available';
  return 'off_air';
}

// ─── TVMaze full-index scan ───────────────────────────────────────────────────
// Paginates through all ~92k shows and groups matching ones by their network/webChannel ID.
// One pass collects all target networks simultaneously.

async function buildNetworkIndex(
  targetCableIds: Set<number>,
  targetWebchannelIds: Set<number>,
  verbose: boolean
): Promise<Map<number, TVMazeShowFull[]>> {
  const index = new Map<number, TVMazeShowFull[]>();
  let page = 0;
  let totalScanned = 0;
  let totalMatched = 0;

  process.stdout.write('Scanning TVMaze show index');

  while (true) {
    let res: Response;
    try {
      res = await fetch(`https://api.tvmaze.com/shows?page=${page}`);
    } catch (err) {
      console.error(`\nFetch error on page ${page}: ${(err as Error).message}`);
      break;
    }

    if (res.status === 404) break; // Past last page
    if (!res.ok) {
      console.error(`\nHTTP ${res.status} on page ${page}, stopping`);
      break;
    }

    const shows = await res.json() as TVMazeShowFull[];
    totalScanned += shows.length;

    for (const show of shows) {
      const netId = show.network?.id;
      const wcId  = show.webChannel?.id;

      if (netId && targetCableIds.has(netId)) {
        if (!index.has(netId)) index.set(netId, []);
        index.get(netId)!.push(show);
        totalMatched++;
      }
      if (wcId && targetWebchannelIds.has(wcId)) {
        if (!index.has(wcId)) index.set(wcId, []);
        index.get(wcId)!.push(show);
        totalMatched++;
      }
    }

    page++;
    if (page % 50 === 0) process.stdout.write(` ${page}`);
    await delay(100);
  }

  console.log(`\nScanned ${totalScanned} shows across ${page} pages — ${totalMatched} matches in target networks\n`);
  return index;
}

// ─── Individual show detail fetch (for season counts) ─────────────────────────

async function fetchShowDetail(showId: number): Promise<TVMazeShowFull> {
  const res = await fetch(`https://api.tvmaze.com/shows/${showId}?embed=seasons`);
  if (!res.ok) throw new Error(`TVMaze /shows/${showId} HTTP ${res.status}`);
  return res.json() as Promise<TVMazeShowFull>;
}

// ─── Buyer company linkage ────────────────────────────────────────────────────

function resolveBuyerCompany(
  canonicalName: string,
  aliases: string[]
): BuyerCompanyRow | null {
  const exact = queryOne<BuyerCompanyRow>(
    `SELECT id, name FROM buyer_companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
    [canonicalName]
  );
  if (exact) return exact;

  for (const alias of aliases) {
    const byAlias = queryOne<BuyerCompanyRow>(
      `SELECT id, name FROM buyer_companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
      [alias]
    );
    if (byAlias) return byAlias;
  }

  return null;
}

// ─── Show upsert ──────────────────────────────────────────────────────────────

const seenTvmazeIds = new Set<number>();

interface UpsertResult {
  action: 'inserted' | 'updated' | 'promoted' | 'already_confirmed' | 'duplicate';
}

function upsertShow(
  show: TVMazeShowFull,
  networkName: string,
  buyerCompanyId: string | null,
  confidence: Confidence
): UpsertResult {
  if (seenTvmazeIds.has(show.id)) return { action: 'duplicate' };
  seenTvmazeIds.add(show.id);

  const now = Date.now();
  const titleNorm    = normTitle(show.name);
  const airStatus    = mapAirStatus(show.status);
  const schedule     = buildSchedule(show.schedule);
  const totalSeasons = show._embedded?.seasons?.length ?? null;
  const offAirDate   = show.ended   ? Date.parse(show.ended)   : null;
  const premiereDate = show.premiered ? Date.parse(show.premiered) : null;
  const genre        = show.genres.length > 0 ? show.genres[0] : null;
  const tvmazeGenres = show.genres.length > 0 ? JSON.stringify(show.genres) : null;
  const tvmazeType   = show.type || null;
  const imdbId       = show.externals?.imdb ?? null;

  // Primary dedup: tvmaze_id
  const existingById = queryOne<ShowIdRow>(
    `SELECT id, confidence FROM shows WHERE tvmaze_id = ?`,
    [show.id]
  );

  if (existingById) {
    const newConf = existingById.confidence === 'pending' && confidence === 'confirmed'
      ? 'confirmed' : existingById.confidence;
    run(
      `UPDATE shows SET
         air_status    = ?,
         total_seasons = COALESCE(total_seasons, ?),
         schedule      = COALESCE(schedule, ?),
         off_air_date  = COALESCE(off_air_date, ?),
         tvmaze_type   = COALESCE(tvmaze_type, ?),
         tvmaze_genres = COALESCE(tvmaze_genres, ?),
         genre         = COALESCE(genre, ?),
         is_unscripted = 1,
         network_id    = COALESCE(network_id, ?),
         imdb_id       = COALESCE(imdb_id, ?),
         confidence    = ?,
         updated_at    = ?
       WHERE id = ?`,
      [airStatus, totalSeasons, schedule, offAirDate,
       tvmazeType, tvmazeGenres, genre, buyerCompanyId, imdbId,
       newConf, now, existingById.id]
    );
    return { action: newConf === 'confirmed' && existingById.confidence === 'pending' ? 'promoted' : 'already_confirmed' };
  }

  // Secondary dedup: title + network (from scraper or manual entry)
  const existingByTitle = queryOne<ShowIdRow>(
    `SELECT id, confidence FROM shows WHERE title_normalized = ? AND network = ?`,
    [titleNorm, networkName]
  );

  if (existingByTitle) {
    const newConf = existingByTitle.confidence === 'pending' && confidence === 'confirmed'
      ? 'confirmed' : existingByTitle.confidence;
    run(
      `UPDATE shows SET
         tvmaze_id     = COALESCE(tvmaze_id, ?),
         air_status    = ?,
         total_seasons = COALESCE(total_seasons, ?),
         schedule      = COALESCE(schedule, ?),
         off_air_date  = COALESCE(off_air_date, ?),
         tvmaze_type   = COALESCE(tvmaze_type, ?),
         tvmaze_genres = COALESCE(tvmaze_genres, ?),
         genre         = COALESCE(genre, ?),
         is_unscripted = 1,
         network_id    = COALESCE(network_id, ?),
         imdb_id       = COALESCE(imdb_id, ?),
         confidence    = ?,
         updated_at    = ?
       WHERE id = ?`,
      [show.id, airStatus, totalSeasons, schedule, offAirDate,
       tvmazeType, tvmazeGenres, genre, buyerCompanyId, imdbId,
       newConf, now, existingByTitle.id]
    );
    return { action: 'updated' };
  }

  // New row
  const id = randomUUID();
  const result = run(
    `INSERT OR IGNORE INTO shows
       (id, title, title_normalized, network, network_id,
        tvmaze_id, tvmaze_type, tvmaze_genres, genre, is_unscripted,
        air_status, total_seasons, schedule, off_air_date, premiere_date,
        imdb_id, confidence, source, data_source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 'tvmaze', 'tvmaze', ?, ?)`,
    [id, show.name, titleNorm, networkName, buyerCompanyId,
     show.id, tvmazeType, tvmazeGenres, genre,
     airStatus, totalSeasons, schedule, offAirDate, premiereDate,
     imdbId, confidence, now, now]
  );

  return { action: result.changes === 0 ? 'duplicate' : 'inserted' };
}

// ─── Per-network processing ───────────────────────────────────────────────────

interface NetworkStats {
  total: number; skipped: number; confirmed: number; pending: number;
  inserted: number; updated: number; promoted: number; duplicates: number;
  errors: number; buyerLinked: boolean;
}

async function processNetwork(
  canonicalName: string,
  tvmazeId: number,
  aliases: string[],
  isWebchannel: boolean,
  shows: TVMazeShowFull[],
  opts: { dryRun: boolean; verify: boolean; onAirOnly: boolean; noDetail: boolean }
): Promise<NetworkStats> {
  const stats: NetworkStats = {
    total: 0, skipped: 0, confirmed: 0, pending: 0,
    inserted: 0, updated: 0, promoted: 0, duplicates: 0, errors: 0,
    buyerLinked: false,
  };

  const buyerCo = resolveBuyerCompany(canonicalName, aliases);
  stats.buyerLinked = !!buyerCo;

  if (buyerCo) console.log(`  ✓ buyer_companies → "${buyerCo.name}"`);
  else         console.log(`  ⚠ Not in buyer_companies — network_id will be NULL`);

  let filtered = opts.onAirOnly ? shows.filter(s => s.status === 'Running') : shows;
  stats.total = filtered.length;

  for (const summary of filtered) {
    if (shouldSkip(summary)) { stats.skipped++; continue; }

    const { confidence, pendingReasons } = assessConfidence(summary, tvmazeId, isWebchannel);
    if (confidence === 'confirmed') stats.confirmed++;
    else {
      stats.pending++;
      if (opts.verify) {
        console.log(`  ~ PENDING "${summary.name}"  [${summary.type}]  ${summary.genres.join(', ') || '—'}`);
        for (const r of pendingReasons) console.log(`      → ${r}`);
      }
    }

    if (opts.dryRun) continue;

    try {
      // Fetch detail only when we need season count and haven't disabled it
      let full = summary;
      if (!opts.noDetail) {
        full = await fetchShowDetail(summary.id);
        await delay(120);
      }

      const result = upsertShow(full, canonicalName, buyerCo?.id ?? null, confidence);
      const label = confidence === 'pending' ? ' [pending]' : '';

      if (result.action === 'inserted') {
        stats.inserted++;
        const s = full._embedded?.seasons?.length;
        console.log(`  + ${full.name}${label}  S${s ?? '?'}  ${full.genres.join(', ') || full.type}`);
      } else if (result.action === 'promoted') {
        stats.promoted++;
        console.log(`  ↑ ${full.name}  pending → confirmed`);
      } else if (result.action === 'updated' || result.action === 'already_confirmed') {
        stats.updated++;
      } else {
        stats.duplicates++;
      }
    } catch (err) {
      console.error(`  ✗ ${summary.name}: ${(err as Error).message}`);
      stats.errors++;
    }
  }

  await delay(300);
  return stats;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function printSummary(): void {
  console.log('\n══ Triangulation Coverage ══════════════════════════════════\n');

  const rows = query<{ stat: string; value: number }>(`
    SELECT 'total_tvmaze'   as stat, COUNT(*) as value FROM shows WHERE data_source = 'tvmaze'
    UNION ALL SELECT 'confirmed',     COUNT(*) FROM shows WHERE data_source = 'tvmaze' AND confidence = 'confirmed'
    UNION ALL SELECT 'pending',       COUNT(*) FROM shows WHERE data_source = 'tvmaze' AND confidence = 'pending'
    UNION ALL SELECT 'network_linked',COUNT(*) FROM shows WHERE data_source = 'tvmaze' AND network_id IS NOT NULL
    UNION ALL SELECT 'prodco_linked', COUNT(*) FROM shows WHERE prodco_id IS NOT NULL
    UNION ALL SELECT 'on_air',        COUNT(*) FROM shows WHERE data_source = 'tvmaze' AND air_status = 'on_air'
    UNION ALL SELECT 'off_air',       COUNT(*) FROM shows WHERE data_source = 'tvmaze' AND air_status = 'off_air'
    UNION ALL SELECT 'buyer_nets',    COUNT(DISTINCT network_id) FROM shows WHERE network_id IS NOT NULL
  `);
  const s = Object.fromEntries(rows.map(r => [r.stat, r.value]));

  console.log(`  Total (TVMaze):             ${s.total_tvmaze ?? 0}`);
  console.log(`  Confirmed (shown in UI):    ${s.confirmed ?? 0}`);
  console.log(`  Pending (hidden):           ${s.pending ?? 0}`);
  console.log(`  Network-linked:             ${s.network_linked ?? 0}`);
  console.log(`  Prodco-linked:              ${s.prodco_linked ?? 0}`);
  console.log(`  Buyer networks with shows:  ${s.buyer_nets ?? 0}`);
  console.log(`  On air / Off air:           ${s.on_air ?? 0} / ${s.off_air ?? 0}`);

  const genres = query<{ genre: string; cnt: number }>(
    `SELECT genre, COUNT(*) as cnt FROM shows
     WHERE data_source = 'tvmaze' AND genre IS NOT NULL AND confidence = 'confirmed'
     GROUP BY genre ORDER BY cnt DESC LIMIT 12`
  );
  if (genres.length) {
    console.log('\n  Top genres (confirmed):');
    for (const r of genres) console.log(`    ${r.genre.padEnd(32)} ${r.cnt}`);
  }
  console.log('');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  initDb();

  const args = process.argv.slice(2);
  const verify       = args.includes('--verify');
  const dryRun       = args.includes('--dry-run') || verify;
  const onAirOnly    = args.includes('--on-air-only');
  const noDetail     = args.includes('--no-detail');
  const streamingMode = args.includes('--streaming');
  const allMode      = args.includes('--all');
  const cableMode    = !streamingMode || allMode;
  const doStreaming  = streamingMode || allMode;
  const networkFlag  = args.find(a => a.startsWith('--network='))?.split('=')[1];

  if (verify)      console.log('VERIFY: no DB writes\n');
  else if (dryRun) console.log('DRY RUN: no DB writes\n');

  // Build the list of entries to process
  type Entry = { name: string; tvmazeId: number; aliases: string[]; isWebchannel: boolean };
  const targetEntries: Entry[] = [];

  if (networkFlag) {
    const cable = CABLE_NETWORKS[networkFlag];
    const stream = STREAMING_NETWORKS[networkFlag];
    if (cable)       targetEntries.push({ name: networkFlag, ...cable, isWebchannel: false });
    else if (stream) targetEntries.push({ name: networkFlag, ...stream, isWebchannel: true });
    else { console.error(`Unknown network: "${networkFlag}"`); process.exit(1); }
  } else {
    if (cableMode)    for (const [n, c] of Object.entries(CABLE_NETWORKS))     targetEntries.push({ name: n, ...c, isWebchannel: false });
    if (doStreaming)  for (const [n, c] of Object.entries(STREAMING_NETWORKS)) targetEntries.push({ name: n, ...c, isWebchannel: true });
  }

  const cableCount     = targetEntries.filter(e => !e.isWebchannel).length;
  const streamingCount = targetEntries.filter(e => e.isWebchannel).length;
  console.log(`Targets: ${cableCount} cable/broadcast + ${streamingCount} streaming = ${targetEntries.length} networks\n`);

  // Build ID sets for the scan
  const cableIds     = new Set(targetEntries.filter(e => !e.isWebchannel).map(e => e.tvmazeId));
  const webchannelIds = new Set(targetEntries.filter(e => e.isWebchannel).map(e => e.tvmazeId));

  // One-pass full scan of TVMaze show index
  const index = await buildNetworkIndex(cableIds, webchannelIds, verify);

  // Process each target network
  const grand = { total: 0, skipped: 0, confirmed: 0, pending: 0, inserted: 0, updated: 0, promoted: 0, errors: 0, linked: 0 };

  for (const entry of targetEntries) {
    const shows = index.get(entry.tvmazeId) ?? [];
    console.log(`\n── ${entry.name}  (${entry.isWebchannel ? 'webchannel' : 'network'} ${entry.tvmazeId})  ${shows.length} shows found`);

    const stats = await processNetwork(
      entry.name, entry.tvmazeId, entry.aliases, entry.isWebchannel, shows,
      { dryRun, verify, onAirOnly, noDetail }
    );

    console.log(
      `  → confirmed ${stats.confirmed}  pending ${stats.pending}  skipped ${stats.skipped}` +
      (!dryRun ? `  inserted ${stats.inserted}  updated ${stats.updated}  promoted ${stats.promoted}` : '') +
      (stats.errors > 0 ? `  errors ${stats.errors}` : '')
    );

    grand.total     += stats.total;
    grand.skipped   += stats.skipped;
    grand.confirmed += stats.confirmed;
    grand.pending   += stats.pending;
    grand.inserted  += stats.inserted;
    grand.updated   += stats.updated;
    grand.promoted  += stats.promoted;
    grand.errors    += stats.errors;
    if (stats.buyerLinked) grand.linked++;
  }

  console.log('\n══ Complete ════════════════════════════════════════════════\n');
  console.log(`  Networks:                   ${targetEntries.length}  (${grand.linked} buyer-linked)`);
  console.log(`  Shows matched in TVMaze:    ${grand.total}`);
  console.log(`  Skipped (scripted):         ${grand.skipped}`);
  console.log(`  Confirmed:                  ${grand.confirmed}`);
  console.log(`  Pending (need 2nd source):  ${grand.pending}`);
  if (!dryRun) {
    console.log(`  Inserted:                   ${grand.inserted}`);
    console.log(`  Updated existing:           ${grand.updated}`);
    console.log(`  Promoted pending→confirmed: ${grand.promoted}`);
    if (grand.errors > 0) console.log(`  Errors:                     ${grand.errors}`);
    printSummary();
  }
}

main().catch(console.error);
