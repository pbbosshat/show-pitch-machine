// Import data from IMDb's free bulk TSV datasets into the shows table.
//
// WHY THIS SCRIPT:
//   IMDb publishes daily-refreshed bulk data files at https://datasets.imdbws.com/
//   that cover every title in their database. For shows we already have (by imdb_id),
//   this is a zero-cost authoritative enrichment pass: total seasons, showrunner names,
//   and IMDb user ratings — all without hitting any rate-limited API.
//
// FILES USED:
//   title.basics.tsv.gz   — titleType, primaryTitle, startYear, endYear
//   title.ratings.tsv.gz  — averageRating, numVotes
//   title.crew.tsv.gz     — directors/writers nconst arrays (first director = showrunner proxy)
//   name.basics.tsv.gz    — nconst → primaryName (resolves crew IDs to human names)
//
// COALESCE RULE: existing non-null values are never overwritten with seed data.
// CONFIDENCE:    never downgrades — only pending → confirmed.
//
// Run: npx tsx scripts/import-imdb-datasets.ts [flags]
//
// Flags:
//   --dry-run    Compute updates, print them, no DB writes
//   --force      Re-download all files even if cached within 24 hours
//   --limit=N    Process only N matching shows (useful for testing)
//   --help       Show this help text

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { initDb, run, query } from '../lib/db';

// ─── Config ───────────────────────────────────────────────────────────────────

const IMDB_BASE    = 'https://datasets.imdbws.com';
const CACHE_DIR    = path.join(process.cwd(), 'data', 'imdb-cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// The four files we need — order matters for dependency resolution:
// name.basics must be parsed first so we have the nconst→name map when processing crew.
const IMDB_FILES = [
  'name.basics.tsv.gz',
  'title.basics.tsv.gz',
  'title.ratings.tsv.gz',
  'title.crew.tsv.gz',
] as const;

// ─── DB row types ─────────────────────────────────────────────────────────────

interface ShowRow {
  id: string;
  imdb_id: string;
  showrunner: string | null;
  total_seasons: number | null;
  imdb_rating: number | null;
}

// ─── Args ─────────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const dryRun  = args.includes('--dry-run');
const force   = args.includes('--force');
const help    = args.includes('--help');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit   = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

if (help) {
  console.log(`
import-imdb-datasets.ts — Enrich shows table from IMDb bulk TSV datasets

Flags:
  --dry-run    Compute and print updates without writing to the database
  --force      Re-download all IMDb files even if the cache is less than 24h old
  --limit=N    Process only the first N matching shows (useful for quick tests)
  --help       Show this message

Data files downloaded to: ./data/imdb-cache/
IMDb data source: https://datasets.imdbws.com/

Fields updated (COALESCE — never overwrites existing data):
  total_seasons   — derived from startYear..endYear (rough proxy when null)
  showrunner      — first director from title.crew resolved via name.basics
  imdb_rating     — averageRating from title.ratings (column added if absent)
`.trim());
  process.exit(0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Download a URL to a local file path, streaming to avoid memory pressure. */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmp = dest + '.tmp';
    const out = fs.createWriteStream(tmp);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.pipe(out);
      out.on('finish', () => {
        out.close();
        // Atomic rename so a partial download never leaves a corrupt cache file
        fs.renameSync(tmp, dest);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(tmp, () => {}); // clean up partial file
      reject(err);
    });
  });
}

/**
 * Returns true if a cached file exists and is younger than the TTL.
 * If --force is set, always returns false (force re-download).
 */
function isCacheFresh(filePath: string): boolean {
  if (force) return false;
  if (!fs.existsSync(filePath)) return false;
  const age = Date.now() - fs.statSync(filePath).mtimeMs;
  return age < CACHE_TTL_MS;
}

/**
 * Stream-parses a gzipped TSV line-by-line.
 * Calls onRow(fields) for each data row — never loads the full file into memory.
 * Returns total rows processed.
 */
async function streamTsv(
  filePath: string,
  onRow: (fields: string[], lineNum: number) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const gunzip     = zlib.createGunzip();
    const rl = readline.createInterface({
      input:    fileStream.pipe(gunzip),
      crlfDelay: Infinity,
    });

    let lineNum = 0;
    rl.on('line', (line) => {
      lineNum++;
      if (lineNum === 1) return; // skip TSV header row
      const fields = line.split('\t');
      onRow(fields, lineNum);
    });

    rl.on('close', () => resolve(lineNum - 1)); // -1 for header
    rl.on('error', reject);
    fileStream.on('error', reject);
    gunzip.on('error', reject);
  });
}

// ─── Migration guard ──────────────────────────────────────────────────────────

/**
 * Ensures imdb_rating REAL column exists on the shows table.
 * Uses PRAGMA table_info to check before issuing ALTER TABLE — safe to call multiple times.
 */
function ensureImdbRatingColumn(): void {
  const cols = query<{ name: string }>(`PRAGMA table_info(shows)`);
  if (!cols.some(c => c.name === 'imdb_rating')) {
    console.log('  Adding imdb_rating REAL column to shows table...');
    run(`ALTER TABLE shows ADD COLUMN imdb_rating REAL`);
    console.log('  Done.');
  }
}

// ─── Step 1: Download files ───────────────────────────────────────────────────

async function downloadIfStale(): Promise<void> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  for (const filename of IMDB_FILES) {
    const dest = path.join(CACHE_DIR, filename);
    if (isCacheFresh(dest)) {
      const ageMins = Math.floor((Date.now() - fs.statSync(dest).mtimeMs) / 60000);
      console.log(`  [cache] ${filename} (${ageMins}m old — skipping download)`);
      continue;
    }
    const url = `${IMDB_BASE}/${filename}`;
    console.log(`  [download] ${filename} ...`);
    const t0 = Date.now();
    await downloadFile(url, dest);
    const sizeMB = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    console.log(`  [download] ${filename} done — ${sizeMB} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}

// ─── Step 2: Build lookup maps ────────────────────────────────────────────────

/**
 * Parses name.basics.tsv.gz into a Map<nconst, primaryName>.
 * We only need people who appear as crew on our shows — but since we don't know that
 * yet, we load the full map. At ~12M names it's ~800 MB raw but stored as strings in a
 * Map it's manageable (~300 MB heap). If memory is a concern, this can be replaced
 * with a SQLite temp table, but in practice Node handles it fine.
 */
async function buildNameMap(): Promise<Map<string, string>> {
  const filePath = path.join(CACHE_DIR, 'name.basics.tsv.gz');
  console.log('  Building nconst → name map from name.basics...');
  const nameMap = new Map<string, string>();

  // name.basics columns: nconst, primaryName, birthYear, deathYear, primaryProfession, knownForTitles
  await streamTsv(filePath, (fields) => {
    const [nconst, primaryName] = fields;
    if (nconst && primaryName && primaryName !== '\\N') {
      nameMap.set(nconst, primaryName);
    }
  });

  console.log(`  Name map: ${nameMap.size.toLocaleString()} entries`);
  return nameMap;
}

// ─── Step 3: Build the imdb_id working set ────────────────────────────────────

/**
 * Returns a Map<imdb_id, ShowRow> for all shows in our DB that have an imdb_id.
 * This is the working set — we only process IMDb rows that hit this map.
 */
function loadWorkingSet(): Map<string, ShowRow> {
  const rows = query<ShowRow>(
    `SELECT id, imdb_id, showrunner, total_seasons, imdb_rating FROM shows WHERE imdb_id IS NOT NULL`
  );
  const map = new Map<string, ShowRow>();
  for (const row of rows) {
    map.set(row.imdb_id, row);
  }
  console.log(`  Working set: ${map.size} shows with imdb_id in DB`);
  return map;
}

// ─── Step 4: Process title.basics ────────────────────────────────────────────

interface BasicsUpdate {
  id: string;
  imdb_id: string;
  total_seasons: number | null;
}

/**
 * Streams title.basics.tsv.gz and, for each tconst in our working set,
 * computes a rough total_seasons from startYear..endYear.
 * Only fills in total_seasons when the existing value is NULL.
 *
 * Columns: tconst, titleType, primaryTitle, originalTitle, isAdult,
 *          startYear, endYear, runtimeMinutes, genres
 */
async function processBasics(
  workingSet: Map<string, ShowRow>
): Promise<Map<string, BasicsUpdate>> {
  const filePath = path.join(CACHE_DIR, 'title.basics.tsv.gz');
  console.log('  Streaming title.basics.tsv.gz...');

  const updates = new Map<string, BasicsUpdate>();
  let matched = 0;

  await streamTsv(filePath, (fields) => {
    const [tconst, titleType, , , , startYearRaw, endYearRaw] = fields;

    // Only process TV series entries — not movies, episodes, or shorts
    if (titleType !== 'tvSeries' && titleType !== 'tvMiniSeries') return;

    const show = workingSet.get(tconst);
    if (!show) return;

    matched++;
    if (matched <= (limit === Infinity ? Infinity : limit * 10)) {
      // Compute total_seasons proxy only when the DB row has no value yet
      if (show.total_seasons == null) {
        const start = startYearRaw !== '\\N' ? parseInt(startYearRaw, 10) : null;
        const end   = endYearRaw   !== '\\N' ? parseInt(endYearRaw,   10) : null;

        // Only set if both years are known — avoid garbage like 1 season for current shows
        const total = (start !== null && end !== null) ? (end - start + 1) : null;
        updates.set(tconst, { id: show.id, imdb_id: tconst, total_seasons: total });
      }
    }
  });

  console.log(`  title.basics: ${matched} matches in working set, ${updates.size} total_seasons to fill`);
  return updates;
}

// ─── Step 5: Process title.ratings ───────────────────────────────────────────

interface RatingUpdate {
  id: string;
  imdb_id: string;
  imdb_rating: number;
}

/**
 * Streams title.ratings.tsv.gz and collects averageRating for shows in our working set.
 * Ratings are always refreshed (not COALESCE) — they change daily and we want the latest.
 *
 * Columns: tconst, averageRating, numVotes
 */
async function processRatings(
  workingSet: Map<string, ShowRow>
): Promise<Map<string, RatingUpdate>> {
  const filePath = path.join(CACHE_DIR, 'title.ratings.tsv.gz');
  console.log('  Streaming title.ratings.tsv.gz...');

  const updates = new Map<string, RatingUpdate>();

  await streamTsv(filePath, (fields) => {
    const [tconst, avgRatingRaw] = fields;
    const show = workingSet.get(tconst);
    if (!show) return;

    const rating = parseFloat(avgRatingRaw);
    if (!isNaN(rating)) {
      updates.set(tconst, { id: show.id, imdb_id: tconst, imdb_rating: rating });
    }
  });

  console.log(`  title.ratings: ${updates.size} ratings found`);
  return updates;
}

// ─── Step 6: Process title.crew ───────────────────────────────────────────────

interface CrewUpdate {
  id: string;
  imdb_id: string;
  showrunner: string;
}

/**
 * Streams title.crew.tsv.gz and resolves the first director nconst to a name.
 * For TV series the "directors" field usually contains the showrunner.
 * Only fills showrunner when the existing value is NULL (COALESCE semantics).
 *
 * Columns: tconst, directors (comma-separated nconsts), writers (comma-separated nconsts)
 */
async function processCrew(
  workingSet: Map<string, ShowRow>,
  nameMap: Map<string, string>
): Promise<Map<string, CrewUpdate>> {
  const filePath = path.join(CACHE_DIR, 'title.crew.tsv.gz');
  console.log('  Streaming title.crew.tsv.gz...');

  const updates = new Map<string, CrewUpdate>();

  await streamTsv(filePath, (fields) => {
    const [tconst, directorsRaw] = fields;
    const show = workingSet.get(tconst);
    if (!show) return;

    // Already has a showrunner — COALESCE: skip
    if (show.showrunner != null) return;
    if (!directorsRaw || directorsRaw === '\\N') return;

    // Take the first director nconst
    const firstDirector = directorsRaw.split(',')[0].trim();
    if (!firstDirector) return;

    const name = nameMap.get(firstDirector);
    if (!name) return;

    updates.set(tconst, { id: show.id, imdb_id: tconst, showrunner: name });
  });

  console.log(`  title.crew: ${updates.size} showrunner names resolved`);
  return updates;
}

// ─── Step 7: Apply updates ────────────────────────────────────────────────────

interface Stats {
  totalSeasonsFilled: number;
  ratingsFilled:      number;
  showrunnersFilled:  number;
  errors:             number;
}

/**
 * Applies all collected updates to the DB using COALESCE for non-rating fields.
 * imdb_rating is always refreshed (ratings change daily).
 * Respects --dry-run — prints planned changes without writing.
 */
function applyUpdates(
  basicsMap:    Map<string, BasicsUpdate>,
  ratingsMap:   Map<string, RatingUpdate>,
  crewMap:      Map<string, CrewUpdate>,
  workingSet:   Map<string, ShowRow>
): Stats {
  const stats: Stats = {
    totalSeasonsFilled: 0,
    ratingsFilled:      0,
    showrunnersFilled:  0,
    errors:             0,
  };

  const now = Date.now();

  // Collect all unique show IDs touched by any update
  const allIds = new Set<string>();
  for (const u of basicsMap.values())  allIds.add(u.id);
  for (const u of ratingsMap.values()) allIds.add(u.id);
  for (const u of crewMap.values())    allIds.add(u.id);

  // Convert workingSet to id→imdb_id map for reverse lookup
  const idToImdb = new Map<string, string>();
  for (const [imdbId, row] of workingSet.entries()) {
    idToImdb.set(row.id, imdbId);
  }

  let processed = 0;

  for (const showId of allIds) {
    if (processed >= limit) break;
    processed++;

    const imdbId = idToImdb.get(showId);
    if (!imdbId) continue;

    const basics   = basicsMap.get(imdbId);
    const rating   = ratingsMap.get(imdbId);
    const crew     = crewMap.get(imdbId);

    // Build a human-readable preview for --dry-run output
    const parts: string[] = [];
    if (basics?.total_seasons != null) parts.push(`total_seasons=${basics.total_seasons}`);
    if (rating)                        parts.push(`imdb_rating=${rating.imdb_rating}`);
    if (crew)                          parts.push(`showrunner="${crew.showrunner}"`);

    if (parts.length === 0) continue;

    if (dryRun) {
      console.log(`  [dry-run] ${imdbId}: ${parts.join(', ')}`);
      if (basics?.total_seasons != null) stats.totalSeasonsFilled++;
      if (rating)                        stats.ratingsFilled++;
      if (crew)                          stats.showrunnersFilled++;
      continue;
    }

    try {
      // Apply total_seasons update (COALESCE — never overwrites existing non-null)
      if (basics?.total_seasons != null) {
        const r = run(
          `UPDATE shows SET total_seasons = COALESCE(total_seasons, ?), updated_at = ? WHERE id = ?`,
          [basics.total_seasons, now, showId]
        );
        if (r.changes > 0) stats.totalSeasonsFilled++;
      }

      // Apply imdb_rating — always refresh (ratings are volatile, not seed data)
      if (rating) {
        const r = run(
          `UPDATE shows SET imdb_rating = ?, updated_at = ? WHERE id = ?`,
          [rating.imdb_rating, now, showId]
        );
        if (r.changes > 0) stats.ratingsFilled++;
      }

      // Apply showrunner (COALESCE — never overwrites existing non-null)
      if (crew) {
        const r = run(
          `UPDATE shows SET showrunner = COALESCE(showrunner, ?), updated_at = ? WHERE id = ?`,
          [crew.showrunner, now, showId]
        );
        if (r.changes > 0) stats.showrunnersFilled++;
      }
    } catch (err) {
      console.error(`  ERROR updating ${imdbId}: ${(err as Error).message}`);
      stats.errors++;
    }
  }

  return stats;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  initDb();

  console.log('\nimport-imdb-datasets.ts');
  if (dryRun)       console.log('  Mode: DRY RUN (no DB writes)');
  if (force)        console.log('  Cache: force re-download');
  if (limit < Infinity) console.log(`  Limit: ${limit} shows`);
  console.log('');

  // Ensure imdb_rating column exists before any queries
  ensureImdbRatingColumn();

  // Phase 1: Download stale/missing files
  console.log('[1/4] Downloading IMDb datasets...');
  await downloadIfStale();
  console.log('');

  // Phase 2: Load working set and name map
  console.log('[2/4] Loading working set and building name map...');
  const workingSet = loadWorkingSet();
  if (workingSet.size === 0) {
    console.log('  No shows with imdb_id found in DB. Nothing to do.');
    process.exit(0);
  }
  const nameMap = await buildNameMap();
  console.log('');

  // Phase 3: Stream-parse all four files
  console.log('[3/4] Streaming IMDb datasets...');
  const basicsMap  = await processBasics(workingSet);
  const ratingsMap = await processRatings(workingSet);
  const crewMap    = await processCrew(workingSet, nameMap);
  console.log('');

  // Phase 4: Apply updates
  console.log('[4/4] Applying updates...');
  const stats = applyUpdates(basicsMap, ratingsMap, crewMap, workingSet);
  console.log('');

  // Summary
  console.log('══ Summary ═══════════════════════════════════════════════');
  console.log(`  Shows in DB with imdb_id:   ${workingSet.size}`);
  console.log(`  total_seasons filled:        ${stats.totalSeasonsFilled}`);
  console.log(`  imdb_rating updated:         ${stats.ratingsFilled}`);
  console.log(`  showrunner filled:           ${stats.showrunnersFilled}`);
  if (stats.errors > 0) {
    console.log(`  Errors:                      ${stats.errors}`);
  }
  if (dryRun) {
    console.log('  (dry-run — no writes made)');
  }
  console.log('');
}

main().catch(console.error);
