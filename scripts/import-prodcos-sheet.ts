// scripts/import-prodcos-sheet.ts
// Imports production company data from the prodco Google Spreadsheet into SQLite.
// Covers: Canadian prodcos, UK prodcos, US-based prodcos, MM 9/29 outreach emails,
// and the Acquisitions sheet for ownership enrichment.
//
// Run via: npx tsx scripts/import-prodcos-sheet.ts
//          or: npm run import-prodcos
//          or: npx tsx scripts/import-prodcos-sheet.ts --dry-run
//
// Auth: reads OAuth token.json directly — works standalone without a running Next.js server.

// Suppress node:sqlite experimental warning before any imports fire
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { initDb, run, query, queryOne } from '../lib/db';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHEET_ID   = '1kdByxpDBut-LSZhWskg_nyA5AllRc1HMA46tG1PHKY4';
const TOKEN_PATH = 'C:/Users/pb/.claude/google/token.json';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Auth ──────────────────────────────────────────────────────────────────────

function buildAuthClient() {
  const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));

  const client = new google.auth.OAuth2(
    token.client_id     || process.env.GMAIL_CLIENT_ID,
    token.client_secret || process.env.GMAIL_CLIENT_SECRET
  );

  // token.json may have credentials nested under a "credentials" key or at the top level
  const creds = token.credentials ?? token;
  client.setCredentials(creds);

  return client;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeText(s: string): string {
  return (s ?? '').toLowerCase().trim();
}

// 'A, B, C' → '["A","B","C"]' — strips blanks from splitting so '  , B, ' → '["B"]'
function toJsonArray(csv: string): string {
  if (!csv?.trim()) return '[]';
  const parts = csv.split(',').map((s) => s.trim()).filter(Boolean);
  return JSON.stringify(parts);
}

// Safe column accessor — returns '' for any out-of-bounds or undefined cell
function cell(row: string[], i: number): string {
  if (i < 0 || i >= row.length) return '';
  return (row[i] ?? '').trim();
}

// ── DB write helpers ──────────────────────────────────────────────────────────

// Wrap every DB write so --dry-run mode can print intent without executing
function dbRun(sql: string, params: unknown[]): void {
  if (DRY_RUN) {
    // Print first 120 chars of SQL + first 3 params for human readability
    const preview = sql.replace(/\s+/g, ' ').trim().substring(0, 120);
    const p = params.slice(0, 3).map((v) => JSON.stringify(v)).join(', ');
    console.log(`    [DRY-RUN] ${preview} … [${p}${params.length > 3 ? ', ...' : ''}]`);
    return;
  }
  run(sql, params);
}

// ── Prodco upsert ─────────────────────────────────────────────────────────────

// Returns { prodcoId, isNew } where prodcoId is the UUID (existing or newly created).
// Uses INSERT OR IGNORE + UPDATE pattern:
//   INSERT creates the row only if name_normalized doesn't exist yet (new UUID).
//   UPDATE always fires and overwrites all enrichment fields — safe to re-run.
function upsertProdco(fields: {
  name: string;
  country: string;
  source_sheet: string;
  email?: string;
  phone?: string;
  website?: string;
  bio?: string;
  twitter_url?: string;
  region?: string;
  hq_city?: string;
  organization_type?: string;
  genres?: string;
  employee_count?: string;
  contact_status?: string;
  contacted_detail?: string;
  current_shows?: string;
  current_networks?: string;
  notes?: string;
}): { prodcoId: string; isNew: boolean } {
  const nameNorm = normalizeText(fields.name);
  if (!nameNorm) return { prodcoId: '', isNew: false };

  const newId = randomUUID();

  // INSERT OR IGNORE: if name_normalized already exists the unique index blocks it silently
  dbRun(
    `INSERT OR IGNORE INTO production_companies
       (id, name, name_normalized, country, source_sheet, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId, fields.name, nameNorm, fields.country, fields.source_sheet, Date.now(), Date.now()]
  );

  // Re-fetch after INSERT to get the actual id (whether just created or pre-existing)
  let prodcoId: string;
  if (DRY_RUN) {
    prodcoId = newId; // in dry-run the row was never written, just use the generated id
  } else {
    const row = queryOne<{ id: string }>(
      'SELECT id FROM production_companies WHERE name_normalized = ?',
      [nameNorm]
    );
    prodcoId = row?.id ?? newId;
  }

  const isNew = DRY_RUN ? true : prodcoId === newId;

  // Always UPDATE enrichment fields — so fresh sheet data overwrites stale values
  dbRun(
    `UPDATE production_companies SET
       email             = ?,
       phone             = ?,
       website           = ?,
       bio               = ?,
       twitter_url       = ?,
       region            = ?,
       hq_city           = ?,
       organization_type = ?,
       genres            = ?,
       employee_count    = ?,
       contact_status    = ?,
       contacted_detail  = ?,
       current_shows     = ?,
       current_networks  = ?,
       notes             = ?,
       country           = ?,
       source_sheet      = ?,
       updated_at        = ?
     WHERE name_normalized = ?`,
    [
      fields.email             || null,
      fields.phone             || null,
      fields.website           || null,
      fields.bio               || null,
      fields.twitter_url       || null,
      fields.region            || null,
      fields.hq_city           || null,
      fields.organization_type || null,
      fields.genres            || null,
      fields.employee_count    || null,
      fields.contact_status    || null,
      fields.contacted_detail  || null,
      fields.current_shows     || null,
      fields.current_networks  || null,
      fields.notes             || null,
      fields.country,
      fields.source_sheet,
      Date.now(),
      nameNorm,
    ]
  );

  return { prodcoId, isNew };
}

// Inserts a prodco_contacts row if no matching email (or name when email is blank) exists.
// is_owner=1 marks the primary owner/founder contact from the sheet.
function upsertProdcoContact(fields: {
  prodcoId: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  notes?: string;
  is_owner?: number;
}): boolean {
  if (!fields.name?.trim() || !fields.prodcoId) return false;

  const emailLower = (fields.email ?? '').toLowerCase().trim();

  // Dedup: prefer email match; fall back to name match within same prodco
  let existingId: string | undefined;

  if (emailLower) {
    const byEmail = queryOne<{ id: string }>(
      'SELECT id FROM prodco_contacts WHERE prodco_id = ? AND LOWER(email) = ?',
      [fields.prodcoId, emailLower]
    );
    existingId = byEmail?.id;
  }

  if (!existingId) {
    const byName = queryOne<{ id: string }>(
      'SELECT id FROM prodco_contacts WHERE prodco_id = ? AND LOWER(name) = LOWER(?)',
      [fields.prodcoId, fields.name.trim()]
    );
    existingId = byName?.id;
  }

  if (existingId) return false; // already present — skip

  dbRun(
    `INSERT INTO prodco_contacts
       (id, prodco_id, name, title, email, phone, linkedin_url, notes, is_owner, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      fields.prodcoId,
      fields.name.trim(),
      fields.title       || null,
      emailLower         || null,
      fields.phone       || null,
      fields.linkedin_url || null,
      fields.notes       || null,
      fields.is_owner    ?? 0,
      Date.now(),
    ]
  );

  return true;
}

// ── Sheet importers ───────────────────────────────────────────────────────────

// Import Canadian or UK sheet (same column layout).
// Returns { upserted, contacts, errors }
async function importCaOrUkSheet(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string,
  country: 'CA' | 'UK'
): Promise<{ upserted: number; contacts: number; errors: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'`,
  });

  const rows = (res.data.values ?? []) as string[][];
  // Row 0 is the header row — data starts at row 1
  if (rows.length < 2) return { upserted: 0, contacts: 0, errors: 0 };

  let upserted = 0, contacts = 0, errors = 0;

  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    const name = cell(row, 0);
    if (!name || name.length < 2) continue;

    try {
      const { prodcoId } = upsertProdco({
        name,
        country,
        source_sheet:      sheetName,
        contact_status:    cell(row, 1) || 'N',
        contacted_detail:  cell(row, 2) || undefined,
        website:           cell(row, 3) || undefined,
        current_shows:     cell(row, 4) || undefined,
        current_networks:  cell(row, 5) || undefined,
        // Col 13 = General Phone, Col 14 = General Email
        phone:             cell(row, 13) || undefined,
        email:             cell(row, 14) || undefined,
        employee_count:    cell(row, 15) || undefined,
        twitter_url:       cell(row, 16) || undefined,
        region:            cell(row, 17) || undefined,
        hq_city:           cell(row, 18) || undefined,
        bio:               cell(row, 19) || undefined,
        organization_type: cell(row, 20) || undefined,
        genres:            cell(row, 21) ? toJsonArray(cell(row, 21)) : undefined,
        // Col 22 is raw data blob — skipped per spec
      });

      upserted++;

      // Owner/contact info from cols 6–12
      const ownerName  = cell(row, 6);
      const ownerTitle = cell(row, 7);
      const ownerLinkedIn = cell(row, 8);
      const ownerEmail = cell(row, 9);
      const ownerCell  = cell(row, 10);
      const otherInfo  = cell(row, 11);
      const officePhone = cell(row, 12);

      if (ownerName && prodcoId) {
        const noteParts = [otherInfo, officePhone ? `Office: ${officePhone}` : ''].filter(Boolean).join(' | ');
        const created = upsertProdcoContact({
          prodcoId,
          name:        ownerName,
          title:       ownerTitle || undefined,
          email:       ownerEmail || undefined,
          phone:       ownerCell  || undefined,
          linkedin_url: ownerLinkedIn || undefined,
          notes:       noteParts   || undefined,
          is_owner:    1,
        });
        if (created) contacts++;
      }
    } catch (err) {
      console.error(`    ERROR [${sheetName}] row "${name}": ${(err as Error).message}`);
      errors++;
    }
  }

  return { upserted, contacts, errors };
}

// Import US Based sheet — different column layout from CA/UK.
async function importUsSheet(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ upserted: number; contacts: number; errors: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'US Based'",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return { upserted: 0, contacts: 0, errors: 0 };

  let upserted = 0, contacts = 0, errors = 0;

  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    const name = cell(row, 0);
    if (!name || name.length < 2) continue;

    try {
      // US sheet cols 1 (Notes) and 7 (Points of Contact) both feed into notes
      const notesCol1  = cell(row, 1);
      const contactsCol7 = cell(row, 7);
      const combinedNotes = [notesCol1, contactsCol7 ? `Contacts: ${contactsCol7}` : '']
        .filter(Boolean).join(' | ');

      const { prodcoId } = upsertProdco({
        name,
        country:          'US',
        source_sheet:     'US Based',
        phone:            cell(row, 2) || undefined,
        email:            cell(row, 3) || undefined,
        website:          cell(row, 4) || undefined,
        current_shows:    cell(row, 5) || undefined,
        current_networks: cell(row, 6) || undefined,
        notes:            combinedNotes || undefined,
      });

      upserted++;

      // Owner contact from cols 8–10
      const ownerName  = cell(row, 8);
      const ownerTitle = cell(row, 9);
      const ownerPhone = cell(row, 10);

      if (ownerName && prodcoId) {
        const created = upsertProdcoContact({
          prodcoId,
          name:    ownerName,
          title:   ownerTitle || undefined,
          phone:   ownerPhone || undefined,
          is_owner: 1,
        });
        if (created) contacts++;
      }
    } catch (err) {
      console.error(`    ERROR [US Based] row "${name}": ${(err as Error).message}`);
      errors++;
    }
  }

  return { upserted, contacts, errors };
}

// Import MM 9/29 outreach sheet and match emails to prodco_contacts.
// Row 0 IS data (no header row). Returns { matched, unmatched }.
async function importMmOutreach(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ matched: number; unmatched: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'MM 9/29'",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length === 0) return { matched: 0, unmatched: 0 };

  let matched = 0, unmatched = 0;

  for (const row of rows) {
    const firstName    = cell(row, 0);
    const lastName     = cell(row, 1);
    const email        = cell(row, 2).toLowerCase().trim();
    const mergeStatus  = cell(row, 3);

    if (!email) { unmatched++; continue; }

    // Normalize merge status to our outreach_status vocabulary
    let outreachStatus: string;
    const ms = mergeStatus.toUpperCase();
    if (ms.includes('RESPONDED'))    outreachStatus = 'responded';
    else if (ms.includes('OPENED'))  outreachStatus = 'email_opened';
    else if (ms.includes('SENT'))    outreachStatus = 'email_sent';
    else                              outreachStatus = mergeStatus || 'email_sent';

    const contact = queryOne<{ id: string }>(
      'SELECT id FROM prodco_contacts WHERE LOWER(email) = ?',
      [email]
    );

    if (contact) {
      dbRun(
        'UPDATE prodco_contacts SET outreach_status = ? WHERE id = ?',
        [outreachStatus, contact.id]
      );
      matched++;
    } else {
      unmatched++;
    }
  }

  return { matched, unmatched };
}

// Process Acquisitions sheet — free-text rows like:
//   "Leftfield Entertainment was acquired by ITV Studios in 2014."
// Extracts acquiree + acquirer and sets ownership_type + parent_company on matched prodcos.
async function importAcquisitions(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ matched: number; notFound: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Acquistions'",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length === 0) return { matched: 0, notFound: 0 };

  let matched = 0, notFound = 0;

  // Regex captures: "CompanyName was acquired by AcquirerName in YYYY"
  const ACQ_RE = /(.*?)\s+was\s+acquired\s+by\s+(.*?)\s+in\s+\d{4}/i;

  for (const row of rows) {
    const text = cell(row, 0);
    if (!text) continue;

    const m = text.match(ACQ_RE);
    if (!m) continue;

    const acquiredName = m[1].trim();
    const acquirerName = m[2].trim();

    if (!acquiredName || !acquirerName) continue;

    // Use the first word of the normalized name as a LIKE anchor — broad enough to catch
    // "Leftfield Entertainment" when stored as "leftfield entertainment"
    const firstWord = normalizeText(acquiredName).split(/\s+/)[0];
    if (!firstWord || firstWord.length < 3) continue;

    const prodco = queryOne<{ id: string }>(
      `SELECT id FROM production_companies WHERE name_normalized LIKE ? LIMIT 1`,
      [`%${firstWord}%`]
    );

    if (prodco) {
      dbRun(
        `UPDATE production_companies SET
           ownership_type = 'studio_owned',
           parent_company = ?,
           updated_at     = ?
         WHERE id = ?`,
        [acquirerName, Date.now(), prodco.id]
      );
      matched++;
    } else {
      notFound++;
    }
  }

  return { matched, notFound };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN — no DB writes will occur ===\n');
  }

  console.log('=== Prodco Spreadsheet Import ===\n');

  console.log('Running migrations...');
  initDb();
  console.log('Migrations complete.\n');

  const auth   = buildAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  let totalProdcos  = 0;
  let totalContacts = 0;
  let totalOutreach = 0;
  let totalAcqMatch = 0;

  // ── Canadian ───────────────────────────────────────────────────────────────
  console.log('Importing sheet: Canadian...');
  try {
    const r = await importCaOrUkSheet(sheets, 'Canadian', 'CA');
    console.log(`  Upserted: ${r.upserted}  Contacts: ${r.contacts}  Errors: ${r.errors}`);
    totalProdcos  += r.upserted;
    totalContacts += r.contacts;
  } catch (err) {
    console.error('  ERROR:', (err as Error).message);
  }

  // ── UK ─────────────────────────────────────────────────────────────────────
  console.log('Importing sheet: UK...');
  try {
    const r = await importCaOrUkSheet(sheets, 'UK', 'UK');
    console.log(`  Upserted: ${r.upserted}  Contacts: ${r.contacts}  Errors: ${r.errors}`);
    totalProdcos  += r.upserted;
    totalContacts += r.contacts;
  } catch (err) {
    console.error('  ERROR:', (err as Error).message);
  }

  // ── US Based ───────────────────────────────────────────────────────────────
  console.log('Importing sheet: US Based...');
  try {
    const r = await importUsSheet(sheets);
    console.log(`  Upserted: ${r.upserted}  Contacts: ${r.contacts}  Errors: ${r.errors}`);
    totalProdcos  += r.upserted;
    totalContacts += r.contacts;
  } catch (err) {
    console.error('  ERROR:', (err as Error).message);
  }

  // ── MM 9/29 outreach ───────────────────────────────────────────────────────
  console.log('Matching MM 9/29 outreach emails...');
  try {
    const r = await importMmOutreach(sheets);
    console.log(`  Matched: ${r.matched}  Unmatched: ${r.unmatched}`);
    totalOutreach += r.matched;
  } catch (err) {
    console.error('  ERROR:', (err as Error).message);
  }

  // ── Acquisitions ───────────────────────────────────────────────────────────
  console.log('Processing Acquisitions...');
  try {
    const r = await importAcquisitions(sheets);
    console.log(`  Matched: ${r.matched}  Not found: ${r.notFound}`);
    totalAcqMatch += r.matched;
  } catch (err) {
    console.error('  ERROR:', (err as Error).message);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=== Summary ===');
  console.log(`Total prodcos upserted: ${totalProdcos}`);
  console.log(`Total contacts created: ${totalContacts}`);
  console.log(`Outreach statuses updated: ${totalOutreach}`);
  console.log(`Acquisitions matched: ${totalAcqMatch}`);

  if (!DRY_RUN) {
    const dbProdcos  = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM production_companies')[0]?.cnt ?? 0;
    const dbContacts = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM prodco_contacts')[0]?.cnt ?? 0;
    console.log(`\nDB totals: ${dbProdcos} production companies | ${dbContacts} prodco contacts`);
  }
}

main().catch(console.error);
