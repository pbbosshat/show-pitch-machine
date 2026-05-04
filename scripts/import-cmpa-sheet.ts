// scripts/import-cmpa-sheet.ts
// Imports CMPA (Canadian Media Producers Association) member data from the CMPA
// member directory spreadsheet and merges it into existing production_companies rows.
//
// What it does:
//   - Marks matched companies as is_cmpa_member = 1
//   - Sets primary_platform and production_model from CMPA fields
//   - Fills in bio, twitter_url, website, organization_type, hq_city only when NULL
//   - Inserts NEW companies that appear in CMPA but not in the DB (rare edge case)
//
// Matching strategy: lowercase(name) == name_normalized
//   CMPA names are already clean — no fuzzy matching needed; exact normalized match.
//
// Run: npx tsx scripts/import-cmpa-sheet.ts
//      npx tsx scripts/import-cmpa-sheet.ts --dry-run

process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { initDb, run, queryOne } from '../lib/db';

// ── Config ────────────────────────────────────────────────────────────────────

const CMPA_SHEET_ID = '1DJWb3Lpr5uJ0-R04wY9o_i6mDbVq_I-kWdGLOwwrtv8';
const TOKEN_PATH    = 'C:/Users/pb/.claude/google/token.json';
const CREDS_PATH    = 'C:/Users/pb/.claude/google/credentials.json';
const DRY_RUN       = process.argv.includes('--dry-run');

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function dbRun(sql: string, params: unknown[]) {
  if (DRY_RUN) return;
  run(sql, params);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log('=== DRY RUN — no DB writes will occur ===\n');
  console.log('=== CMPA Spreadsheet Import ===\n');

  // Bootstrap DB and run any pending migrations
  initDb();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
  const creds = JSON.parse(readFileSync(CREDS_PATH, 'utf-8'));
  const { client_id, client_secret } = creds.installed ?? creds.web;
  const auth = new OAuth2Client(client_id, client_secret);
  auth.setCredentials(token);
  const sheets = google.sheets({ version: 'v4', auth });

  // ── Fetch sheet ───────────────────────────────────────────────────────────
  console.log('Fetching CMPA member directory...');
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: CMPA_SHEET_ID,
    range: "'Sheet1'",
  });
  const rows = resp.data.values ?? [];
  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);
  console.log(`  ${dataRows.length} member rows found\n`);

  // Column index helpers
  const col = (name: string) => headers.indexOf(name);
  const get  = (row: string[], name: string) => row[col(name)]?.trim() || null;

  // ── Process each CMPA member row ──────────────────────────────────────────
  let matched = 0;
  let inserted = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const rawName = get(row, 'Organization Name');
    if (!rawName) { skipped++; continue; }

    const nameNorm     = normalizeName(rawName);
    const bio          = get(row, 'Company biography (maximum 250 words)');
    const primaryPlat  = get(row, 'Primary Platform');
    const prodModel    = get(row, 'Primary Production Model');
    const orgType      = get(row, 'Organization Type');
    const twitterUrl   = get(row, 'Org_ Twitter');
    const website      = get(row, 'Website');
    const city         = get(row, 'City');
    const province     = get(row, 'Province');

    const existing = queryOne<{ id: string; bio: string | null; twitter_url: string | null; website: string | null; organization_type: string | null; hq_city: string | null }>(
      'SELECT id, bio, twitter_url, website, organization_type, hq_city FROM production_companies WHERE name_normalized = ?',
      [nameNorm]
    );

    if (existing) {
      // Always set CMPA fields; only fill in data fields when currently NULL
      dbRun(
        `UPDATE production_companies SET
           is_cmpa_member    = 1,
           primary_platform  = ?,
           production_model  = ?,
           bio               = COALESCE(bio, ?),
           twitter_url       = COALESCE(twitter_url, ?),
           website           = COALESCE(website, ?),
           organization_type = COALESCE(organization_type, ?),
           hq_city           = COALESCE(hq_city, ?),
           updated_at        = ?
         WHERE id = ?`,
        [
          primaryPlat,
          prodModel,
          bio,
          twitterUrl,
          website,
          orgType,
          city,
          Date.now(),
          existing.id,
        ]
      );
      matched++;
    } else {
      // Company not in DB yet — insert as new CMPA-sourced entry
      const newId = randomUUID().replace(/-/g, '');
      const region = province ? `CA - ${province}` : null;
      dbRun(
        `INSERT INTO production_companies
           (id, name, name_normalized, ownership_type, strategic_tag, country, region,
            hq_city, bio, twitter_url, website, organization_type,
            is_cmpa_member, primary_platform, production_model,
            source_sheet, created_at, updated_at)
         VALUES (?, ?, ?, 'independent', 'watch_list', 'CA', ?,
                 ?, ?, ?, ?, ?,
                 1, ?, ?,
                 'cmpa_directory', ?, ?)`,
        [
          newId,
          rawName,
          nameNorm,
          region,
          city,
          bio,
          twitterUrl,
          website,
          orgType,
          primaryPlat,
          prodModel,
          Date.now(),
          Date.now(),
        ]
      );
      inserted++;
    }
  }

  console.log('Results:');
  console.log(`  Matched + updated: ${matched}`);
  console.log(`  Newly inserted:    ${inserted}`);
  console.log(`  Skipped (blank):   ${skipped}`);
  console.log();

  if (DRY_RUN) {
    console.log('DRY RUN complete — no writes made.');
  } else {
    const total = queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM production_companies WHERE is_cmpa_member = 1', []);
    console.log(`Total CMPA members in DB: ${total?.c ?? '?'}`);
  }
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
