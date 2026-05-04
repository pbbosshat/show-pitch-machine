// Enrich shows table from Wikidata's public SPARQL endpoint.
//
// WHY WIKIDATA:
//   Wikidata is the only free, open, structured knowledge graph that cross-references
//   IMDb IDs (P345) with production companies (P272), co-production countries (P495),
//   and showrunners (P1040) in a single query. No API key needed.
//
// STRATEGY:
//   We batch our known imdb_ids into groups of 200 and fire a SPARQL VALUES query
//   for each batch. Wikidata's timeout is 60s; 200 IDs is well under that limit.
//   Rate limit: 1 request/second (Wikidata's bot etiquette policy).
//
// COALESCE RULE: never overwrites existing non-null fields.
// CONFIDENCE:    unchanged — this script only fills empty columns, never changes confidence.
//
// Run: npx tsx scripts/import-wikidata.ts [flags]
//
// Flags:
//   --dry-run    Compute updates, print them, no DB writes
//   --limit=N    Process only the first N shows (useful for testing)
//   --help       Show this help text

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { initDb, run, query } from '../lib/db';

// ─── Config ───────────────────────────────────────────────────────────────────

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const BATCH_SIZE      = 200;     // safe below Wikidata's 60s query timeout
const RATE_LIMIT_MS   = 1000;    // 1 req/sec per Wikidata bot policy

// User-Agent required by Wikidata — identify the bot and a contact email
const USER_AGENT = 'ShowPitchMachine/1.0 (contact: sm@gototeam.com) Node.js';

// ─── DB row types ─────────────────────────────────────────────────────────────

interface ShowRow {
  id:                 string;
  imdb_id:            string;
  production_company: string | null;
  showrunner:         string | null;
  primary_country:    string | null;
}

// ─── SPARQL response types ────────────────────────────────────────────────────

interface SparqlBinding {
  type:  string;
  value: string;
}

interface SparqlResultRow {
  imdbId:           SparqlBinding;
  prodcoLabel?:     SparqlBinding;
  countryLabel?:    SparqlBinding;
  showrunnerLabel?: SparqlBinding;
}

interface SparqlResponse {
  results: {
    bindings: SparqlResultRow[];
  };
}

// ─── Per-show enrichment accumulator ─────────────────────────────────────────

interface WikidataEnrichment {
  production_company: string | null;
  showrunner:         string | null;
  primary_country:    string | null;
}

// ─── Args ─────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const dryRun   = args.includes('--dry-run');
const help     = args.includes('--help');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit    = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

if (help) {
  console.log(`
import-wikidata.ts — Enrich shows table from Wikidata SPARQL

Flags:
  --dry-run    Compute and print updates without writing to the database
  --limit=N    Process only the first N shows (useful for quick tests)
  --help       Show this message

Wikidata endpoint: ${SPARQL_ENDPOINT}
Batch size: ${BATCH_SIZE} IMDb IDs per SPARQL query
Rate limit: ${RATE_LIMIT_MS}ms between batches

Fields updated (COALESCE — never overwrites existing data):
  production_company   — Wikidata P272 (production company label)
  showrunner           — Wikidata P1040 (showrunner label)
  primary_country      — Wikidata P495 (country of origin label)
`.trim());
  process.exit(0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pause execution for ms milliseconds (rate limiting between SPARQL batches). */
const delay = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

/**
 * Chunk an array into sub-arrays of at most `size` elements.
 * Used to split the full imdb_id list into SPARQL-safe batches.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── SPARQL query builder ─────────────────────────────────────────────────────

/**
 * Builds a SPARQL SELECT query that returns production company, country of origin,
 * and showrunner labels for all IMDb IDs in the provided batch.
 *
 * Property references:
 *   P345   — IMDb ID
 *   P272   — production company
 *   P495   — country of origin
 *   P1040  — showrunner (film/TV crew role)
 *
 * OPTIONAL blocks mean a missing property returns a row with that binding absent,
 * rather than excluding the whole item — so we still get what data IS available.
 *
 * FILTER(LANG(...) = "en") restricts labels to English to avoid duplicates from
 * multilingual Wikidata items that have labels in dozens of languages.
 */
function buildSparqlQuery(imdbIds: string[]): string {
  // Format IMDb IDs as quoted string literals for the VALUES clause
  const values = imdbIds.map(id => `"${id}"`).join(' ');

  return `
SELECT ?imdbId ?prodcoLabel ?countryLabel ?showrunnerLabel WHERE {
  VALUES ?imdbId { ${values} }
  ?item wdt:P345 ?imdbId .
  OPTIONAL {
    ?item wdt:P272 ?prodco .
    ?prodco rdfs:label ?prodcoLabel .
    FILTER(LANG(?prodcoLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P495 ?country .
    ?country rdfs:label ?countryLabel .
    FILTER(LANG(?countryLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P1040 ?showrunner .
    ?showrunner rdfs:label ?showrunnerLabel .
    FILTER(LANG(?showrunnerLabel) = "en")
  }
}
`.trim();
}

// ─── SPARQL fetcher ───────────────────────────────────────────────────────────

/**
 * POSTs a SPARQL query to the Wikidata endpoint.
 *
 * Why POST (not GET): IMDb ID batches of 200 can produce query strings over 2KB,
 * which some proxies and servers truncate. POST with form body is always safe.
 *
 * Wikidata requires a descriptive User-Agent for bot traffic — we send one.
 * Accept: application/sparql-results+json is the standard SPARQL results format.
 */
async function runSparqlQuery(sparql: string): Promise<SparqlResponse> {
  const body = new URLSearchParams({ query: sparql });

  const res = await fetch(SPARQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/sparql-results+json',
      'User-Agent':    USER_AGENT,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    // Include the response body in the error for debugging timeout/syntax issues
    const text = await res.text().catch(() => '');
    throw new Error(`Wikidata SPARQL HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<SparqlResponse>;
}

// ─── Result aggregator ────────────────────────────────────────────────────────

/**
 * Collapses SPARQL result rows (which may have multiple rows per imdb_id due to
 * multiple production companies, countries, or showrunners) into one enrichment
 * record per show. Takes the first non-null value for each field — COALESCE semantics.
 *
 * Wikidata can return duplicate rows when a show has multiple production companies
 * (P272) or multiple countries (P495). We take the first encountered value for each
 * field, which is consistent with COALESCE(col, ?) in the DB update.
 */
function aggregateResults(bindings: SparqlResultRow[]): Map<string, WikidataEnrichment> {
  const map = new Map<string, WikidataEnrichment>();

  for (const row of bindings) {
    const imdbId = row.imdbId?.value;
    if (!imdbId) continue;

    if (!map.has(imdbId)) {
      map.set(imdbId, {
        production_company: null,
        showrunner:         null,
        primary_country:    null,
      });
    }

    const acc = map.get(imdbId)!;

    // Only take the first value for each field — don't overwrite once we have one
    if (!acc.production_company && row.prodcoLabel?.value) {
      acc.production_company = row.prodcoLabel.value;
    }
    if (!acc.showrunner && row.showrunnerLabel?.value) {
      acc.showrunner = row.showrunnerLabel.value;
    }
    if (!acc.primary_country && row.countryLabel?.value) {
      acc.primary_country = row.countryLabel.value;
    }
  }

  return map;
}

// ─── DB update ────────────────────────────────────────────────────────────────

interface Stats {
  showsProcessed:        number;
  productionCompanyFilled: number;
  showrunnerFilled:      number;
  primaryCountryFilled:  number;
  errors:                number;
}

/**
 * Applies Wikidata enrichment to the DB for a batch of results.
 * All three fields use COALESCE — existing non-null data is never overwritten.
 * Only fires an UPDATE when at least one field would actually change.
 */
function applyBatchUpdates(
  enrichmentMap: Map<string, WikidataEnrichment>,
  dbRows:        Map<string, ShowRow>,
  stats:         Stats
): void {
  const now = Date.now();

  for (const [imdbId, enrichment] of enrichmentMap.entries()) {
    const show = dbRows.get(imdbId);
    if (!show) continue; // IMDb ID in Wikidata but not in our DB — ignore

    stats.showsProcessed++;

    // Determine which fields are candidates for update:
    // a field is a candidate only if Wikidata has a value AND our DB row has null
    const willFillProdco   = enrichment.production_company !== null && show.production_company === null;
    const willFillRunner   = enrichment.showrunner         !== null && show.showrunner         === null;
    const willFillCountry  = enrichment.primary_country    !== null && show.primary_country    === null;

    const anyUpdate = willFillProdco || willFillRunner || willFillCountry;

    if (!anyUpdate) continue;

    if (dryRun) {
      const parts: string[] = [];
      if (willFillProdco)  parts.push(`production_company="${enrichment.production_company}"`);
      if (willFillRunner)  parts.push(`showrunner="${enrichment.showrunner}"`);
      if (willFillCountry) parts.push(`primary_country="${enrichment.primary_country}"`);
      console.log(`  [dry-run] ${imdbId}: ${parts.join(', ')}`);
      if (willFillProdco)  stats.productionCompanyFilled++;
      if (willFillRunner)  stats.showrunnerFilled++;
      if (willFillCountry) stats.primaryCountryFilled++;
      continue;
    }

    try {
      // Use COALESCE on all three fields in a single UPDATE for atomicity
      const r = run(
        `UPDATE shows SET
           production_company = COALESCE(production_company, ?),
           showrunner         = COALESCE(showrunner, ?),
           primary_country    = COALESCE(primary_country, ?),
           updated_at         = ?
         WHERE id = ?`,
        [
          enrichment.production_company,
          enrichment.showrunner,
          enrichment.primary_country,
          now,
          show.id,
        ]
      );

      if (r.changes > 0) {
        if (willFillProdco)  stats.productionCompanyFilled++;
        if (willFillRunner)  stats.showrunnerFilled++;
        if (willFillCountry) stats.primaryCountryFilled++;
      }
    } catch (err) {
      console.error(`  ERROR updating ${imdbId}: ${(err as Error).message}`);
      stats.errors++;
    }
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  initDb();

  console.log('\nimport-wikidata.ts');
  if (dryRun)             console.log('  Mode: DRY RUN (no DB writes)');
  if (limit < Infinity)   console.log(`  Limit: ${limit} shows`);
  console.log('');

  // Load all shows that have an imdb_id — these are the candidates for enrichment
  const allShows = query<ShowRow>(
    `SELECT id, imdb_id, production_company, showrunner, primary_country
     FROM shows
     WHERE imdb_id IS NOT NULL`
  );

  if (allShows.length === 0) {
    console.log('No shows with imdb_id found in DB. Nothing to do.');
    process.exit(0);
  }

  // Apply --limit before batching
  const shows = limit < Infinity ? allShows.slice(0, limit) : allShows;
  console.log(`Processing ${shows.length} shows (${allShows.length} total with imdb_id)...`);
  console.log('');

  // Build a Map<imdb_id, ShowRow> for fast lookup during result processing
  const dbRows = new Map<string, ShowRow>();
  for (const row of shows) {
    dbRows.set(row.imdb_id, row);
  }

  // Split imdb_ids into batches of BATCH_SIZE
  const imdbIds = shows.map(s => s.imdb_id);
  const batches = chunk(imdbIds, BATCH_SIZE);

  const stats: Stats = {
    showsProcessed:          0,
    productionCompanyFilled: 0,
    showrunnerFilled:        0,
    primaryCountryFilled:    0,
    errors:                  0,
  };

  for (let i = 0; i < batches.length; i++) {
    const batch  = batches[i];
    const label  = `Batch ${i + 1}/${batches.length} (${batch.length} IDs)`;

    console.log(`  [${label}] querying Wikidata...`);

    try {
      const sparql   = buildSparqlQuery(batch);
      const response = await runSparqlQuery(sparql);
      const bindings = response.results.bindings;

      console.log(`  [${label}] ${bindings.length} result rows`);

      // Aggregate multi-row results into one enrichment per imdb_id
      const enrichmentMap = aggregateResults(bindings);
      console.log(`  [${label}] ${enrichmentMap.size} unique shows matched`);

      // Apply updates (or log in dry-run mode)
      applyBatchUpdates(enrichmentMap, dbRows, stats);

    } catch (err) {
      console.error(`  [${label}] ERROR: ${(err as Error).message}`);
      stats.errors++;
    }

    // Rate limit: 1 request per second per Wikidata bot policy.
    // Skip delay after the last batch — no point waiting when we're done.
    if (i < batches.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  // Summary
  console.log('');
  console.log('══ Summary ═══════════════════════════════════════════════');
  console.log(`  Shows processed:             ${stats.showsProcessed}`);
  console.log(`  production_company filled:   ${stats.productionCompanyFilled}`);
  console.log(`  showrunner filled:           ${stats.showrunnerFilled}`);
  console.log(`  primary_country filled:      ${stats.primaryCountryFilled}`);
  if (stats.errors > 0) {
    console.log(`  Errors:                      ${stats.errors}`);
  }
  if (dryRun) {
    console.log('  (dry-run — no writes made)');
  }
  console.log('');
}

main().catch(console.error);
