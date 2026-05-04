// scripts/import-mye-sheet.ts
// Pulls data from the MYE Google Spreadsheet and upserts it into the local SQLite database.
// Covers pitch pipeline sheets, Brainstorms, Story Scout, contact sheets, Talent, and Brands.
//
// Run via: npx tsx scripts/import-mye-sheet.ts
//          or: npm run import-sheets
//
// Auth: reads an OAuth token.json file (NOT env vars) so this script works standalone
// without a running Next.js server that has GMAIL_* env vars loaded.

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

const SHEET_ID = '12nyQ3ffBq3bHnuFkKmFVw92FzvZNxM6ilqfNCuJAF7A';
const TOKEN_PATH = 'C:/Users/pb/.claude/google/token.json';

// Year context per sheet — used to complete partial dates found in status/next-steps cells
const SHEET_YEAR_CONTEXT: Record<string, number> = {
  'Priorities':              2023,
  'BACKBURNER/PENDING 2024': 2024,
  'Backburner / Pending':    2023,
  'Archived Projects':       2023,
  'Passes':                  2022,
  'Full Dev List':           2023,
  'Full Development list':   2023,
  'B&C Dev Sheet':           2023,
  'BC/MYE':                  2023,
};

// All pitch pipeline sheet names — each shares a similar columnar structure
const PITCH_PIPELINE_SHEETS = [
  'Priorities',
  'BACKBURNER/PENDING 2024',
  'Backburner / Pending',
  'Archived Projects',
  'Passes',
  'Full Dev List',
  'Full Development list',
  'B&C Dev Sheet',
  'BC/MYE',
];

// Contact sheets and their metadata
const CONTACT_SHEETS: Array<{ name: string; region: string; is_former: number }> = [
  { name: 'US Network Contacts ',        region: 'us',        is_former: 0 }, // trailing space is real — that's how the tab is named in the sheet
  { name: 'UK Network Contacts',        region: 'uk',        is_former: 0 },
  { name: 'Canadian Network Contacts',  region: 'canada',    is_former: 0 },
  { name: 'Australian Network Contacts',region: 'australia', is_former: 0 },
  { name: 'Former A&E Execs',           region: 'us',        is_former: 1 },
];

// Section header patterns — rows matching these are labels, not data rows
// They appear mid-sheet to visually group projects but have no structured data
const SECTION_HEADER_PATTERN = /^(FUNDED|ACTIVE|DEVELOPMENT|ARCHIVED|PASSED|IN PRODUCTION|PENDING|BACKBURNER|PRIORITY|SECTION|COMPLETED)/i;

// ── Auth ──────────────────────────────────────────────────────────────────────

// Build an OAuth2 client directly from the stored token file.
// Unlike lib/gmail.ts which reads credentials from env vars (for the live app),
// this script reads the token file directly so it can run standalone.
function buildAuthClient() {
  const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));

  const client = new google.auth.OAuth2(
    token.client_id    || process.env.GMAIL_CLIENT_ID,
    token.client_secret || process.env.GMAIL_CLIENT_SECRET
  );

  // token.json may have the credentials nested under a "credentials" key
  // or flattened at the top level — handle both shapes
  const creds = token.credentials ?? token;
  client.setCredentials(creds);

  return client;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a project title into a stable slug used as the upsert dedup key.
 * The full row key is "<sheet-slug>--<title-slug>" e.g. "priorities--ghost-adventures".
 */
function toRowKey(sheetName: string, title: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
  return `${slug(sheetName)}--${slug(title)}`;
}

/**
 * Extracts the best date from a freeform text string, using yearContext to complete
 * partial dates (month/day without year, or quarter references).
 *
 * Returns:
 *   - date: ISO date string like '2024-03' or '2024-03-15', or null if nothing found
 *   - confidence: 'extracted' (actual date found) | 'year-only' | 'none'
 */
function extractDate(
  text: string,
  yearContext: number
): { date: string | null; confidence: 'extracted' | 'year-only' | 'none' } {
  if (!text?.trim()) return { date: null, confidence: 'none' };

  const t = text.trim();

  // M/D/YY or M/D/YYYY — e.g. "3/15/24" or "11/2/2024"
  const mdyMatch = t.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (mdyMatch) {
    const m = mdyMatch[1].padStart(2, '0');
    const d = mdyMatch[2].padStart(2, '0');
    let y = parseInt(mdyMatch[3], 10);
    if (y < 100) y += 2000; // "24" → 2024
    return { date: `${y}-${m}-${d}`, confidence: 'extracted' };
  }

  // M/D without year — e.g. "3/15" or "11/2" — use yearContext
  const mdMatch = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (mdMatch) {
    const m = mdMatch[1].padStart(2, '0');
    const d = mdMatch[2].padStart(2, '0');
    return { date: `${yearContext}-${m}-${d}`, confidence: 'extracted' };
  }

  // Month name + optional day — e.g. "March 2024", "Jan 15", "February"
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const monthPattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{1,2})?,?\s*(\d{4})?\b/i;
  const monthMatch = t.match(monthPattern);
  if (monthMatch) {
    const mo = MONTHS[monthMatch[1].toLowerCase().substring(0, 3)];
    const day = monthMatch[2] ? monthMatch[2].padStart(2, '0') : null;
    const yr = monthMatch[3] ? parseInt(monthMatch[3], 10) : yearContext;
    const date = day ? `${yr}-${mo}-${day}` : `${yr}-${mo}`;
    return { date, confidence: 'extracted' };
  }

  // Quarter references — e.g. "Q1 2024", "Q3", "q2"
  const quarterMap: Record<string, string> = { '1': '01', '2': '04', '3': '07', '4': '10' };
  const qMatch = t.match(/\bQ([1-4])\s*(?:\'?(\d{2})|(\d{4}))?\b/i);
  if (qMatch) {
    const mo = quarterMap[qMatch[1]];
    let yr = yearContext;
    if (qMatch[2]) yr = 2000 + parseInt(qMatch[2], 10);
    else if (qMatch[3]) yr = parseInt(qMatch[3], 10);
    return { date: `${yr}-${mo}`, confidence: 'extracted' };
  }

  // Bare 4-digit year — least precise
  const yearMatch = t.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return { date: yearMatch[1], confidence: 'year-only' };
  }

  return { date: null, confidence: 'none' };
}

/**
 * Returns true if a row looks like a section divider rather than real project data.
 * Heuristic: fewer than 2 non-empty cells, or the first cell matches SECTION_HEADER_PATTERN.
 */
function isSectionHeader(row: string[]): boolean {
  const nonEmpty = row.filter((c) => c?.trim()).length;
  if (nonEmpty <= 1) return true;
  const firstCell = row[0]?.trim() ?? '';
  if (SECTION_HEADER_PATTERN.test(firstCell)) return true;
  // Also skip if the first cell is entirely uppercase and has no lowercase letters —
  // sheet authors often write section headers in ALL CAPS
  if (firstCell.length > 3 && firstCell === firstCell.toUpperCase() && /[A-Z]/.test(firstCell)) {
    return true;
  }
  return false;
}

/**
 * Find the index of a column header (case-insensitive, partial match allowed).
 * Returns -1 if not found.
 */
function findCol(headers: string[], ...candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h) =>
      h?.trim().toLowerCase().includes(candidate.toLowerCase())
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Pull a cell value by column index, returning '' for missing/undefined cells. */
function cell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  return (row[idx] ?? '').trim();
}

// ── Database helpers ──────────────────────────────────────────────────────────

/**
 * Upsert a buyer_company by name. Returns the company ID (existing or newly created).
 * Uses INSERT OR IGNORE so concurrent calls from the same sheet don't duplicate.
 */
function upsertCompany(name: string): string {
  const trimmed = name.trim();
  const existing = query<{ id: string }>(
    'SELECT id FROM buyer_companies WHERE name = ?',
    [trimmed]
  )[0];
  if (existing) return existing.id;

  const id = randomUUID();
  run(
    `INSERT OR IGNORE INTO buyer_companies (id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [id, trimmed, Date.now(), Date.now()]
  );

  // Re-fetch in case a concurrent call beat us to the INSERT
  const inserted = query<{ id: string }>(
    'SELECT id FROM buyer_companies WHERE name = ?',
    [trimmed]
  )[0];
  return inserted?.id ?? id;
}

// ── Sheet importers ───────────────────────────────────────────────────────────

/**
 * Import a pitch pipeline sheet into ip_catalog.
 *
 * These sheets share a common structure with a "Project" column header row, followed
 * by data rows. The exact column positions vary per sheet so we find columns dynamically.
 * Each project is upserted by sheet_row_key (sheet tab + slugified title) so re-running
 * is safe and incremental.
 */
async function importPitchSheet(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'${sheetName}'`,
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

  // Find the header row — the first row where column 0 equals "Project" (case-insensitive)
  let headerRowIdx = rows.findIndex(
    (r) => r[0]?.trim().toLowerCase() === 'project'
  );
  if (headerRowIdx === -1) {
    console.log(`  [${sheetName}] No header row found — skipping`);
    return { inserted: 0, updated: 0, skipped: rows.length };
  }

  const headers = rows[headerRowIdx].map((h) => h?.trim() ?? '');
  const yearContext = SHEET_YEAR_CONTEXT[sheetName] ?? 2023;

  // Locate columns by searching header names — handles minor naming variations across sheets
  const colProject        = 0; // always first
  const colStatus         = findCol(headers, 'status');
  const colPoint          = findCol(headers, 'point');
  const colAttach         = findCol(headers, 'attach', 'materials');
  const colTargetNets     = findCol(headers, 'target net', 'target');
  // "Pitching/Pitched" column — the primary source for pitch record parsing (Fix 7)
  const colSentMats       = findCol(headers, 'pitching', 'pitched', 'sent materials');
  const colPassed         = findCol(headers, 'passed');
  const colNextSteps      = findCol(headers, 'next steps', 'timing');
  const colSigned         = findCol(headers, 'signed');
  // Talent email column — distinct from buyer email (added in migration 004)
  const colTalentEmail    = findCol(headers, 'talent email', 'email');
  // Fix 6: dedicated sizzle + deck + other-materials columns for asset parsing
  const colSizzle         = findCol(headers, 'sizzle');
  const colDeck           = findCol(headers, 'deck');
  const colOtherMaterials = findCol(headers, 'other materials', 'other mat');

  let inserted = 0, updated = 0, skipped = 0;
  // Running counters for the asset summary logged at the end of main()
  let sizzleCount = 0, deckCount = 0, pitchCount = 0;

  const dataRows = rows.slice(headerRowIdx + 1);
  for (const row of dataRows) {
    const title = cell(row, colProject);
    if (!title || title.length < 2) { skipped++; continue; }
    if (isSectionHeader(row)) { skipped++; continue; }

    // Build the stable dedup key for this row
    const rowKey = toRowKey(sheetName, title);

    // Combine next_steps + status text for date extraction
    const nextStepsText  = cell(row, colNextSteps);
    const rawStatus      = cell(row, colStatus);
    const pitchedToText  = cell(row, colSentMats);
    const combinedForDate = [nextStepsText, rawStatus].filter(Boolean).join(' ');
    const { date: extractedDate, confidence: dateConf } = extractDate(combinedForDate, yearContext);

    // Raw sizzle/deck/other-materials values — stored individually in their own tables (Fix 6)
    const sizzleVal      = cell(row, colSizzle);
    const deckVal        = cell(row, colDeck);
    const otherMatsVal   = colOtherMaterials >= 0 ? cell(row, colOtherMaterials) : '';
    const signedVal      = colSigned >= 0 ? cell(row, colSigned) : '';
    const talentEmailVal = colTalentEmail >= 0 ? cell(row, colTalentEmail) : '';

    // sheet_attachments stays as a human-readable summary of what's attached
    const attachParts = [
      sizzleVal    ? `sizzle:${sizzleVal}`    : '',
      deckVal      ? `deck:${deckVal}`        : '',
      otherMatsVal ? `other:${otherMatsVal}` : '',
      cell(row, colAttach),
    ].filter(Boolean).join(' | ');

    // Check whether this row already exists so we can track inserted vs updated
    const existing = query<{ id: string }>(
      'SELECT id FROM ip_catalog WHERE sheet_row_key = ?',
      [rowKey]
    )[0];

    let ipId: string;

    if (existing) {
      ipId = existing.id;
      // Update the sheet-sourced columns but leave core editorial columns (logline, format, etc.) intact.
      // Fix 6: also update the four new columns added in migration 004.
      run(
        `UPDATE ip_catalog SET
           sheet_source          = ?,
           sheet_status          = ?,
           sheet_point_person    = ?,
           sheet_target_nets     = ?,
           sheet_pitched_to      = ?,
           sheet_passed          = ?,
           sheet_next_steps      = ?,
           sheet_attachments     = ?,
           sheet_raw_status      = ?,
           extracted_date        = ?,
           date_confidence       = ?,
           sheet_other_materials = ?,
           sheet_sent_materials  = ?,
           sheet_signed          = ?,
           sheet_talent_email    = ?,
           origin_source         = 'sheet',
           updated_at            = ?
         WHERE sheet_row_key = ?`,
        [
          sheetName,
          rawStatus || null,
          cell(row, colPoint) || null,
          cell(row, colTargetNets) || null,
          pitchedToText || null,
          cell(row, colPassed) || null,
          nextStepsText || null,
          attachParts || null,
          combinedForDate || null,
          extractedDate,
          dateConf,
          otherMatsVal || null,
          pitchedToText || null,  // sheet_sent_materials mirrors pitching column for now
          signedVal || null,
          talentEmailVal || null,
          Date.now(),
          rowKey,
        ]
      );
      updated++;
    } else {
      // New row — insert with sheet data; editorial fields default to null
      ipId = randomUUID();
      run(
        `INSERT OR IGNORE INTO ip_catalog
           (id, title, status, sheet_source, sheet_status, sheet_point_person,
            sheet_target_nets, sheet_pitched_to, sheet_passed, sheet_next_steps,
            sheet_attachments, sheet_raw_status, extracted_date, date_confidence,
            sheet_other_materials, sheet_sent_materials, sheet_signed, sheet_talent_email,
            sheet_row_key, origin_source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sheet', ?, ?)`,
        [
          ipId,
          title,
          // Map the raw sheet status to a normalized status for the pitch pipeline UI
          mapSheetStatusToIpStatus(rawStatus),
          sheetName,
          rawStatus || null,
          cell(row, colPoint) || null,
          cell(row, colTargetNets) || null,
          pitchedToText || null,
          cell(row, colPassed) || null,
          nextStepsText || null,
          attachParts || null,
          combinedForDate || null,
          extractedDate,
          dateConf,
          otherMatsVal || null,
          pitchedToText || null,
          signedVal || null,
          talentEmailVal || null,
          rowKey,
          Date.now(),
          Date.now(),
        ]
      );
      inserted++;
    }

    // ── Fix 6: Parse sizzle/deck/other-materials into their own tables ─────────
    if (sizzleVal) {
      parseSizzle(sizzleVal, ipId, title, sheetName);
      sizzleCount++;
    }
    if (deckVal) {
      parseDeckOrMaterial(deckVal, ipId, 'deck', sheetName);
      deckCount++;
    }
    if (otherMatsVal) {
      parseDeckOrMaterial(otherMatsVal, ipId, 'other', sheetName);
    }

    // ── Fix 7: Parse pitch records from the Pitching/Pitched column ───────────
    if (pitchedToText) {
      pitchCount += parsePitchRecords(pitchedToText, ipId, yearContext);
    }
  }

  // Attach asset counts to the return so main() can accumulate them for the summary
  // We extend the return type inline via a cast — avoids changing the function signature
  const result = { inserted, updated, skipped } as {
    inserted: number; updated: number; skipped: number;
    sizzleCount: number; deckCount: number; pitchCount: number;
  };
  result.sizzleCount = sizzleCount;
  result.deckCount   = deckCount;
  result.pitchCount  = pitchCount;
  return result;
}

/**
 * Map a freeform sheet status string to one of the ip_catalog normalized status values.
 * Sheet authors use varying terminology; this maps to the UI's status vocabulary.
 */
function mapSheetStatusToIpStatus(raw: string): string {
  if (!raw?.trim()) return 'active';
  const r = raw.toLowerCase();
  if (/pass|passed|no go/.test(r))          return 'pass';
  if (/greenlit|in production|ordered/.test(r)) return 'greenlit';
  if (/archived|dead|cancelled/.test(r))    return 'archived';
  if (/backburner|pending|hold/.test(r))    return 'backburner';
  if (/brainstorm/.test(r))                 return 'brainstorm';
  return 'active';
}

/**
 * Import the Brainstorms sheet into ip_catalog with status='brainstorm'.
 * Row 1 is a title row, row 2 is the header row (Rank | Project | Status | Genre | ...).
 */
async function importBrainstorms(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Brainstorms'",
  });

  const rows = (res.data.values ?? []) as string[][];
  // Row 0 = sheet title, Row 1 = headers (Rank | Project | Status | Genre | Point | Attachments)
  // Data starts at row 2
  if (rows.length < 3) return { inserted: 0, updated: 0, skipped: 0 };

  let inserted = 0, updated = 0, skipped = 0;

  // Skip rows 0 and 1 (title + header)
  const dataRows = rows.slice(2);
  for (const row of dataRows) {
    const rankStr = cell(row, 0);
    const title   = cell(row, 1);
    if (!title || title.length < 2) { skipped++; continue; }

    const rank = parseInt(rankStr, 10);
    const rowKey = toRowKey('Brainstorms', title);

    const existing = query<{ id: string }>(
      'SELECT id FROM ip_catalog WHERE sheet_row_key = ?',
      [rowKey]
    )[0];

    if (existing) {
      run(
        `UPDATE ip_catalog SET
           sheet_source       = 'Brainstorms',
           sheet_status       = ?,
           genre              = COALESCE(genre, ?),
           sheet_point_person = ?,
           sheet_attachments  = ?,
           brainstorm_rank    = ?,
           origin_source      = 'sheet',
           updated_at         = ?
         WHERE sheet_row_key = ?`,
        [
          cell(row, 2) || null,
          cell(row, 3) || null,
          cell(row, 4) || null,
          cell(row, 5) || null,
          isNaN(rank) ? null : rank,
          Date.now(),
          rowKey,
        ]
      );
      updated++;
    } else {
      const id = randomUUID();
      run(
        `INSERT OR IGNORE INTO ip_catalog
           (id, title, status, genre, sheet_source, sheet_status, sheet_point_person,
            sheet_attachments, brainstorm_rank, sheet_row_key, origin_source, created_at, updated_at)
         VALUES (?, ?, 'brainstorm', ?, 'Brainstorms', ?, ?, ?, ?, ?, 'sheet', ?, ?)`,
        [
          id, title,
          cell(row, 3) || null,  // genre
          cell(row, 2) || null,  // sheet_status
          cell(row, 4) || null,  // point person
          cell(row, 5) || null,  // attachments
          isNaN(rank) ? null : rank,
          rowKey,
          Date.now(), Date.now(),
        ]
      );
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Import the STORY SCOUT sheet into the story_scout table.
 * Row 1 is headers: HEADLINE | SUMMARY | LINK | PROJECT BANNER | ARTICLE RIGHTS | ACTION
 * Deduplication is by headline (case-insensitive).
 */
async function importStoryScout(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'STORY SCOUT'",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return { inserted: 0, updated: 0, skipped: 0 };

  let inserted = 0, updated = 0, skipped = 0;

  // Row 0 is headers; data starts at row 1
  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    const headline = cell(row, 0);
    if (!headline || headline.length < 3) { skipped++; continue; }

    // Check for existing entry by headline (case-insensitive via lowercased comparison)
    const existing = query<{ id: string }>(
      'SELECT id FROM story_scout WHERE LOWER(headline) = LOWER(?)',
      [headline]
    )[0];

    if (existing) {
      // Update existing entry with fresh data from the sheet
      run(
        `UPDATE story_scout SET
           summary        = ?,
           link           = ?,
           project_banner = ?,
           article_rights = ?,
           action_notes   = ?
         WHERE id = ?`,
        [
          cell(row, 1) || null,
          cell(row, 2) || null,
          cell(row, 3) || null,
          cell(row, 4) || null,
          cell(row, 5) || null,
          existing.id,
        ]
      );
      updated++;
    } else {
      run(
        `INSERT INTO story_scout
           (id, headline, summary, link, project_banner, article_rights, action_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          headline,
          cell(row, 1) || null,
          cell(row, 2) || null,
          cell(row, 3) || null,
          cell(row, 4) || null,
          cell(row, 5) || null,
        ]
      );
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Import a contact sheet (US/UK/Canadian/Australian Network Contacts) into
 * buyer_companies + buyer_contacts.
 *
 * Fix 1: The actual contact sheets use "Contact" as the name column header, not "Name".
 * We now search for 'contact' OR 'name' so both variants work.
 *
 * Fix 5: "US Network Contacts" may have trailing spaces/special chars that cause a 404.
 * The outer main() loop wraps each sheet call in try/catch — if the API returns an error
 * this function propagates it so main() can log and continue.
 *
 * Column mapping for standard contact sheets:
 *   "Contact"  → buyer_contacts.name
 *   "Network"  → buyer_companies.name  (looked up via 'company' OR 'network' candidate)
 *   "Phone"    → buyer_contacts.coverage_notes  (NOT phone — this col contains mandate/role text)
 *   "Email"    → buyer_contacts.email
 */
async function importContactSheet(
  sheets: ReturnType<typeof google.sheets>,
  sheetName: string,
  region: string,
  is_former: number
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let res;
  try {
    // Primary attempt: use the sheet name exactly as listed in CONTACT_SHEETS
    res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${sheetName}'`,
    });
  } catch (primaryErr) {
    // Fix 5: Fall back to URL-encoded sheet name in case trailing spaces/special chars
    // caused the 404. encodeURIComponent handles spaces → %20, & → %26, etc.
    console.warn(`  [${sheetName}] Primary fetch failed (${(primaryErr as Error).message}), retrying with encoded name...`);
    try {
      res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: encodeURIComponent(sheetName),
      });
    } catch (fallbackErr) {
      console.error(`  [${sheetName}] Both fetch attempts failed — skipping. Error: ${(fallbackErr as Error).message}`);
      return { inserted: 0, updated: 0, skipped: 0 };
    }
  }

  // Fix 2 intercept: Former A&E Execs has no header row and a completely different structure.
  // Delegate to the specialized importer rather than using generic header-based column detection.
  if (is_former === 1) {
    return importFormerExecs((res.data.values ?? []) as string[][]);
  }

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return { inserted: 0, updated: 0, skipped: 0 };

  // Row 0 is the header row — read it to find column positions.
  // Fix 1: search 'contact' first, then 'name' — standard contact sheets use "Contact" header.
  const headers = rows[0].map((h) => h?.trim() ?? '');
  const colName    = findCol(headers, 'contact', 'name');
  const colTitle   = findCol(headers, 'title');
  // "Network" column in contact sheets → maps to buyer_companies.name
  const colCompany = findCol(headers, 'network', 'company');
  const colEmail   = findCol(headers, 'email');
  // Fix 1: "Phone" column actually contains mandate/coverage notes like
  //         "Head of Documentary Features at Amazon" — map to coverage_notes, NOT phone
  const colCoverage = findCol(headers, 'phone');
  const colNotes   = findCol(headers, 'notes', 'comment');

  if (colName === -1) {
    console.log(`  [${sheetName}] No 'Contact'/'Name' column found in headers: ${headers.join(', ')} — skipping`);
    return { inserted: 0, updated: 0, skipped: rows.length };
  }

  let inserted = 0, updated = 0, skipped = 0;

  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    const name    = cell(row, colName);
    const email   = cell(row, colEmail).toLowerCase();
    // "Network" column value becomes the buyer company name
    const company = colCompany >= 0 ? cell(row, colCompany) : '';
    // Coverage notes from the "Phone" column — this is mandate context, not a phone number
    const coverageNotes = colCoverage >= 0 ? cell(row, colCoverage) || null : null;

    if (!name || name.length < 2) { skipped++; continue; }

    // Upsert the company first (contacts reference companies by FK)
    let companyId: string | null = null;
    if (company) {
      companyId = upsertCompany(company);
    }

    // Dedup contact by email (preferred) or name+company combo
    let contactId: string | null = null;

    if (email) {
      const byEmail = query<{ id: string }>(
        'SELECT id FROM buyer_contacts WHERE LOWER(email) = ?',
        [email]
      )[0];
      if (byEmail) contactId = byEmail.id;
    }

    if (!contactId) {
      const byName = query<{ id: string }>(
        `SELECT bc.id FROM buyer_contacts bc
           LEFT JOIN buyer_companies bco ON bc.company_id = bco.id
         WHERE LOWER(bc.name) = LOWER(?) AND LOWER(COALESCE(bco.name, '')) = LOWER(?)`,
        [name, company]
      )[0];
      if (byName) contactId = byName.id;
    }

    if (contactId) {
      // Update region/is_former + new coverage_notes on existing contact
      run(
        `UPDATE buyer_contacts SET
           region         = ?,
           is_former      = ?,
           coverage_notes = COALESCE(coverage_notes, ?),
           updated_at     = ?
         WHERE id = ?`,
        [region, is_former, coverageNotes, Date.now(), contactId]
      );
      updated++;
    } else {
      // New contact — insert with coverage_notes from the "Phone" column
      run(
        `INSERT OR IGNORE INTO buyer_contacts
           (id, company_id, name, email, title, notes, coverage_notes, region, is_former, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          companyId,
          name,
          email || null,
          colTitle >= 0 ? cell(row, colTitle) || null : null,
          colNotes >= 0 ? cell(row, colNotes) || null : null,
          coverageNotes,
          region,
          is_former,
          Date.now(),
          Date.now(),
        ]
      );
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Fix 2: Import the "Former A&E Execs" sheet.
 *
 * This sheet has NO header row — data starts at row 1 with a hardcoded column layout:
 *   Col 0 (A): Current company/network  → buyer_companies.name
 *   Col 1 (B): Person's name            → buyer_contacts.name
 *   Col 2 (C): Former role OR LinkedIn  → title / former_role / linkedin_url
 *   Col 3 (D): Priority flag "X"        → outreach_priority = 1, else 0
 *
 * We do NOT use findCol() here — the column map is hardcoded because there are no headers.
 * Rows where col 1 (name) is blank or looks like a section header are skipped.
 */
function importFormerExecs(
  rows: string[][]
): { inserted: number; updated: number; skipped: number } {
  let inserted = 0, updated = 0, skipped = 0;

  // Section header detection: a row is a header if col 1 is blank OR col 0 is all-caps
  // short text (e.g. "CABLE", "STREAMING") with no person name alongside it.
  const looksLikeHeader = (row: string[]): boolean => {
    const nameCell = (row[1] ?? '').trim();
    if (!nameCell || nameCell.length < 2) return true;
    // If col 0 is all-caps with no lowercase and no person in col 1, it's a section divider
    const compCell = (row[0] ?? '').trim();
    if (compCell === compCell.toUpperCase() && compCell.length > 0 && !/[a-z]/.test(compCell) && nameCell === nameCell.toUpperCase()) {
      return true;
    }
    return false;
  };

  for (const row of rows) {
    // Hardcoded column indices — no header detection, row 1 is data
    const company   = (row[0] ?? '').trim();
    const name      = (row[1] ?? '').trim();
    const col2      = (row[2] ?? '').trim();
    const priorityFlag = (row[3] ?? '').trim().toUpperCase();

    if (!name || name.length < 2) { skipped++; continue; }
    if (looksLikeHeader(row))     { skipped++; continue; }

    // Col 2 is either a LinkedIn URL or a former role description — detect by prefix
    const isLinkedIn   = col2.toLowerCase().startsWith('https://linkedin') ||
                         col2.toLowerCase().startsWith('https://www.linkedin');
    const linkedinUrl  = isLinkedIn ? col2 : null;
    const formerRole   = !isLinkedIn && col2 ? col2 : null;
    // Title is the former role when it's not a LinkedIn URL
    const title        = formerRole;
    const outreachPri  = priorityFlag === 'X' ? 1 : 0;

    // Upsert the current company (col 0)
    let companyId: string | null = null;
    if (company) {
      companyId = upsertCompany(company);
    }

    // Dedup by name + company (Former A&E Execs rows rarely have email addresses)
    const existing = query<{ id: string }>(
      `SELECT bc.id FROM buyer_contacts bc
         LEFT JOIN buyer_companies bco ON bc.company_id = bco.id
       WHERE LOWER(bc.name) = LOWER(?) AND LOWER(COALESCE(bco.name, '')) = LOWER(?)`,
      [name, company]
    )[0];

    if (existing) {
      // Update fields that may have been populated — use COALESCE to avoid clobbering
      run(
        `UPDATE buyer_contacts SET
           region           = 'us',
           is_former        = 1,
           linkedin_url     = COALESCE(linkedin_url, ?),
           former_role      = COALESCE(former_role, ?),
           outreach_priority = MAX(outreach_priority, ?),
           updated_at       = ?
         WHERE id = ?`,
        [linkedinUrl, formerRole, outreachPri, Date.now(), existing.id]
      );
      updated++;
    } else {
      run(
        `INSERT OR IGNORE INTO buyer_contacts
           (id, company_id, name, title, linkedin_url, former_role, outreach_priority,
            region, is_former, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'us', 1, ?, ?)`,
        [
          randomUUID(),
          companyId,
          name,
          title,
          linkedinUrl,
          formerRole,
          outreachPri,
          Date.now(),
          Date.now(),
        ]
      );
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Fix 3: Import the Talent sheet into the talent table.
 *
 * The Talent sheet is NOT a single roster — it contains 7 independent vertical lists
 * in separate column pairs. We only import the two talent lists; the rest are genre/platform
 * taxonomies that don't map to the talent table.
 *
 * Column layout (0-indexed):
 *   Col 0 (A): "Our Talent"              → talent_tier='signed'
 *   Col 1 (B): (blank / notes)           → skip
 *   Col 2 (C): "Category Killer Talent"  → talent_tier='target'
 *   Col 3 (D): (blank)                   → skip
 *   Col 4+:    Categories, PayWalls, YouTube, Branded, Digital Rights → skip
 *
 * Row 0 is the header row (contains "Our Talent", "Category Killer Talent", etc.) — skip it.
 * Each subsequent row is processed for both col 0 and col 2 independently.
 */
async function importTalent(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Talent'",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return { inserted: 0, updated: 0, skipped: 0 };

  // Row 0 is headers — "Our Talent" in col 0, "Category Killer Talent" in col 2
  // Data starts at row 1; each row may contribute 0, 1, or 2 talent entries
  const dataRows = rows.slice(1);

  let inserted = 0, updated = 0, skipped = 0;

  /**
   * Upsert a single talent name with the given tier.
   * Only updates talent_tier if it wasn't already set to avoid clobbering manual edits.
   */
  function upsertTalent(name: string, tier: 'signed' | 'target'): void {
    if (!name || name.length < 2) { skipped++; return; }

    // Skip cells that look like category labels or strategy notes rather than names
    // (e.g. "Reality Stars", "Sports Personalities" — these appear in the header area
    //  of the "Category Killer Talent" list)
    if (/^[A-Z][A-Z\s&+]+$/.test(name.trim()) && name.trim().length > 10) {
      // Looks like an all-caps category header — skip it
      skipped++;
      return;
    }

    const existing = query<{ id: string }>(
      'SELECT id FROM talent WHERE LOWER(name) = LOWER(?)',
      [name]
    )[0];

    if (existing) {
      // Update talent_tier if not already set — signed takes precedence over target
      run(
        `UPDATE talent SET
           talent_tier = CASE
             WHEN talent_tier IS NULL THEN ?
             WHEN talent_tier = 'relationship' AND ? = 'signed' THEN 'signed'
             ELSE talent_tier
           END
         WHERE id = ?`,
        [tier, tier, existing.id]
      );
      updated++;
    } else {
      run(
        `INSERT OR IGNORE INTO talent (id, name, talent_tier)
         VALUES (?, ?, ?)`,
        [randomUUID(), name, tier]
      );
      inserted++;
    }
  }

  for (const row of dataRows) {
    // Col 0: "Our Talent" list → talent_tier='signed'
    const signedName = cell(row, 0);
    if (signedName) upsertTalent(signedName, 'signed');

    // Col 2: "Category Killer Talent" list → talent_tier='target'
    const targetName = cell(row, 2);
    if (targetName) upsertTalent(targetName, 'target');
  }

  return { inserted, updated, skipped };
}

/**
 * Fix 4: Import the Brands sheet into content_partners.
 *
 * The Brands sheet does NOT have a flat Name/Type layout. It uses alternating column pairs
 * where each column is a separate brand list under a different agency header.
 *
 * Column layout (0-indexed):
 *   Col 0 (A): "Buchwald Brands" header row 0, brand names rows 1+
 *   Col 1 (B): (blank spacer)
 *   Col 2 (C): "Edelman" header, brand names below
 *   Col 3 (D): freeform strategy notes — SKIP entirely
 *   Col 4 (E): "Hearst" header, brand names below
 *   Col 5 (F): (blank spacer)
 *   Col 6 (G): "Abbvie" header (direct brand, no intermediary agency)
 *   Cols 7+ (H, I, ...): freeform text strategy notes — SKIP entirely
 *
 * Row 0 contains the agency names. Rows 1+ contain brand names under each agency.
 * Blank cells and freeform-text columns (D, H, I) are skipped.
 */
async function importBrands(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Brands'",
  });

  const rows = (res.data.values ?? []) as string[][];
  if (rows.length < 2) return { inserted: 0, updated: 0, skipped: 0 };

  // Row 0 contains agency names in the brand-list columns (0, 2, 4, 6).
  // We read the header row to get the agency label for each column — this handles
  // minor naming variations without hardcoding the agency strings.
  const headerRow = rows[0];
  // Only the even-indexed brand columns are valid: 0, 2, 4, 6
  // Odd-indexed cols and cols beyond 6 are spacers or freeform strategy notes.
  const BRAND_COLS = [0, 2, 4, 6];
  const agencyByCol: Record<number, string> = {};
  for (const colIdx of BRAND_COLS) {
    const label = (headerRow[colIdx] ?? '').trim();
    // Use the header text as agency if it looks like an agency/brand name (not blank)
    agencyByCol[colIdx] = label || `Column ${colIdx}`;
  }

  let inserted = 0, updated = 0, skipped = 0;

  // Data rows start at row 1
  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    for (const colIdx of BRAND_COLS) {
      const brandName = (row[colIdx] ?? '').trim();
      if (!brandName || brandName.length < 2) { skipped++; continue; }

      // Skip cells that are clearly strategy notes or repeated headers:
      // heuristic — if the value is very long (>50 chars) it's a note, not a brand name
      if (brandName.length > 60) { skipped++; continue; }

      const agency = agencyByCol[colIdx];

      const existing = query<{ id: string }>(
        'SELECT id FROM content_partners WHERE LOWER(name) = LOWER(?)',
        [brandName]
      )[0];

      if (existing) {
        // Don't overwrite manually curated data — update agency if it was previously null
        run(
          `UPDATE content_partners SET agency = COALESCE(agency, ?) WHERE id = ?`,
          [agency, existing.id]
        );
        updated++;
      } else {
        run(
          `INSERT OR IGNORE INTO content_partners (id, name, type, agency)
           VALUES (?, ?, 'brand', ?)`,
          [randomUUID(), brandName, agency]
        );
        inserted++;
      }
    }
  }

  return { inserted, updated, skipped };
}

// ── Asset parsers (Fix 6 & 7) ─────────────────────────────────────────────────

/**
 * Fix 6: Parse a sizzle reel cell value and insert into sizzle_reels.
 *
 * Handles Vimeo URLs and passwords embedded in freeform text like:
 *   "https://vimeo.com/123456789 PW: HoopDreams"
 *   "Sizzle PW: DanceMoms https://vimeo.com/987654321"
 *   "YouTube link: https://youtu.be/abcdef"
 *
 * INSERT OR IGNORE uses the UNIQUE index idx_sizzle_unique (ip_catalog_id, raw_value)
 * to prevent duplicates on re-runs without needing a pre-check query.
 */
function parseSizzle(
  raw: string,
  ipId: string,
  projectTitle: string,
  sheetSource: string
): void {
  if (!raw || raw.trim() === '') return;

  // Extract first Vimeo URL from the cell value
  const vimeoMatch = raw.match(/https?:\/\/vimeo\.com\/[^\s]+/);
  // Extract password from patterns like "PW: HoopDreams", "Password: abc123", "Sizzle PW: DanceMoms"
  const pwMatch = raw.match(/(?:PW|Password|pw)[\s:]+(\S+)/i);
  // Detect YouTube even without a Vimeo URL
  const isYouTube = /youtube\.com|youtu\.be/i.test(raw);

  const platform = vimeoMatch ? 'vimeo' : (isYouTube ? 'youtube' : 'other');

  // INSERT OR IGNORE: if this ip_id + raw_value pair already exists, the index
  // will silently block the insert — safe for idempotent re-runs.
  run(
    `INSERT OR IGNORE INTO sizzle_reels
       (id, ip_catalog_id, title, vimeo_url, vimeo_password, platform, raw_value, sheet_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      ipId,
      projectTitle,
      vimeoMatch ? vimeoMatch[0] : null,
      pwMatch    ? pwMatch[1]    : null,
      platform,
      raw.trim(),
      sheetSource,
    ]
  );
}

/**
 * Fix 6: Parse a pitch deck or other materials cell and insert into pitch_decks.
 *
 * Handles Dropbox, Google Drive, and any other URL-bearing material links.
 * materialType should be 'deck', 'one-sheet', 'episode-proposal', 'talent-reel', or 'other'.
 *
 * INSERT OR IGNORE deduplicates via idx_deck_unique (ip_catalog_id, raw_value).
 */
function parseDeckOrMaterial(
  raw: string,
  ipId: string,
  materialType: string,
  sheetSource: string
): void {
  if (!raw || raw.trim() === '') return;

  // Extract first HTTP(S) URL from the cell, if any
  const urlMatch = raw.match(/https?:\/\/[^\s]+/);

  run(
    `INSERT OR IGNORE INTO pitch_decks
       (id, ip_catalog_id, material_type, deck_url, raw_value, sheet_source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      ipId,
      materialType,
      urlMatch ? urlMatch[0] : null,
      raw.trim(),
      sheetSource,
    ]
  );
}

/**
 * Fix 7: Parse the "Pitching/Pitched" column text into individual pitch records.
 *
 * Sheet values look like: "ONYX - 5/17", "Roku - 8/29 (Nov)", "TBS - pitch 11/7",
 *   "NBC (6/14)", "Hulu - 5/17 (SK)"
 *
 * Each entry is split out by newline or comma, then a network name and optional date
 * are extracted. A pitch record is inserted with outcome='pitched'.
 *
 * INSERT OR IGNORE: pitches table has no unique index today — we use a compound check
 * to avoid exact duplicates (same ip_id + buyer_company_id + pitch_date).
 */
function parsePitchRecords(
  pitchedText: string,
  ipId: string,
  yearContext: number
): number {
  if (!pitchedText) return 0;

  // Split on newlines or commas — both separators appear in the wild
  const entries = pitchedText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  let created = 0;

  for (const entry of entries) {
    // Extract the network name: everything before " - " or " (" or end of string
    // Handles: "ONYX - 5/17", "NBC (6/14)", "Hulu - 5/17 (SK)", "TBS - pitch 11/7"
    const networkMatch = entry.match(/^([A-Za-z0-9&\/+\s]+?)(?:\s*[-–]\s*|\s*\(|$)/);
    if (!networkMatch) continue;

    const networkName = networkMatch[1].trim();
    if (networkName.length < 2) continue;
    // Skip noise words that sneak through the regex (e.g. "pitch" standalone)
    if (/^(pitch|pitched|sent|meeting|pass|tbd)$/i.test(networkName)) continue;

    // Extract date — M/D pattern; use yearContext to supply the year
    const dateMatch = entry.match(/(\d{1,2})\/(\d{1,2})/);
    let pitchDate: string | null = null;
    if (dateMatch) {
      pitchDate = `${yearContext}-${String(dateMatch[1]).padStart(2, '0')}-${String(dateMatch[2]).padStart(2, '0')}`;
    }

    // Look up buyer_company by name — try broad LIKE first, then move on
    const company = query<{ id: string }>(
      `SELECT id FROM buyer_companies WHERE LOWER(name) LIKE LOWER(?) LIMIT 1`,
      [`%${networkName}%`]
    )[0];

    // Avoid creating duplicate pitch records on re-runs:
    // check for an existing pitch with the same ip_id + company + date before inserting
    const dupCheck = query<{ id: string }>(
      `SELECT id FROM pitches
         WHERE ip_id = ?
           AND COALESCE(buyer_company_id, '') = COALESCE(?, '')
           AND COALESCE(pitch_date, '') = COALESCE(?, '')
         LIMIT 1`,
      [ipId, company?.id ?? null, pitchDate]
    )[0];
    if (dupCheck) continue;

    run(
      `INSERT INTO pitches
         (id, ip_id, buyer_company_id, pitch_date, format_pitched, outcome, created_at)
       VALUES (?, ?, ?, ?, 'unscripted', 'pitched', datetime('now'))`,
      [randomUUID(), ipId, company?.id ?? null, pitchDate]
    );
    created++;
  }

  return created;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Dev Team Tracker: project | materials | point | deadline
// Sections ("ACTIVE PRIORITIES", "TEAM BRAINSTORMS", "RESEARCH INITIATIVES") become the task.section field.
async function importDevTeamTracker(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ inserted: number; skipped: number }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `'Dev Team Tracker'!A1:D200`,
  });
  const rows: string[][] = (res.data.values ?? []).map(r => r.map(String));

  let inserted = 0;
  let skipped  = 0;
  let section  = 'GENERAL';

  const SECTION_LABELS = new Set(['ACTIVE PRIORITIES', 'TEAM BRAINSTORMS', 'RESEARCH INITIATIVES']);
  const HEADER_PATTERNS = /^(project|task|materials|point|deadline)$/i;

  for (const row of rows) {
    const first = (row[0] ?? '').trim();
    if (!first) { skipped++; continue; }

    // Section divider row
    if (SECTION_LABELS.has(first.toUpperCase())) { section = first.toUpperCase(); continue; }

    // Header row — skip
    if (HEADER_PATTERNS.test(first)) { skipped++; continue; }

    const taskDesc  = (row[1] ?? '').trim() || first; // materials column, fallback to project name
    const projectName = first;
    const assignedTo  = (row[2] ?? '').trim() || null;
    const deadline    = (row[3] ?? '').trim() || null;

    // Try to link to an ip_catalog entry by project name
    const ip = queryOne<{ id: string }>(
      `SELECT id FROM ip_catalog WHERE LOWER(title) LIKE LOWER(?) LIMIT 1`,
      [`%${projectName}%`]
    );

    run(
      `INSERT INTO dev_tasks (id, ip_catalog_id, task_description, assigned_to, deadline, section, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', datetime('now'))`,
      [randomUUID(), ip?.id ?? null, taskDesc, assignedTo, deadline, section]
    );
    inserted++;
  }

  return { inserted, skipped };
}

async function main() {
  console.log('=== MYE Spreadsheet Import ===\n');

  // Run migrations to ensure schema (including 004) is up to date before we write
  console.log('Running migrations...');
  initDb();
  console.log('Migrations complete.\n');

  // Build authenticated Sheets client
  const auth = buildAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Accumulate asset-level counters across all pitch pipeline sheets for the summary
  let totalSizzle = 0;
  let totalDecks  = 0;
  let totalPitches = 0;

  // ── Pitch pipeline sheets ──────────────────────────────────────────────────
  console.log('--- Pitch Pipeline Sheets ---');
  for (const sheetName of PITCH_PIPELINE_SHEETS) {
    try {
      const result = await importPitchSheet(sheets, sheetName) as {
        inserted: number; updated: number; skipped: number;
        sizzleCount?: number; deckCount?: number; pitchCount?: number;
      };
      const { inserted, updated, skipped } = result;
      console.log(`  [${sheetName}] ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
      // Accumulate asset counts returned by the extended result object (Fix 6 & 7)
      totalSizzle  += result.sizzleCount  ?? 0;
      totalDecks   += result.deckCount    ?? 0;
      totalPitches += result.pitchCount   ?? 0;
    } catch (err) {
      console.error(`  [${sheetName}] ERROR:`, (err as Error).message);
    }
  }

  // ── Brainstorms ────────────────────────────────────────────────────────────
  console.log('\n--- Brainstorms ---');
  try {
    const { inserted, updated, skipped } = await importBrainstorms(sheets);
    console.log(`  [Brainstorms] ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  } catch (err) {
    console.error('  [Brainstorms] ERROR:', (err as Error).message);
  }

  // ── Story Scout ────────────────────────────────────────────────────────────
  console.log('\n--- Story Scout ---');
  try {
    const { inserted, updated, skipped } = await importStoryScout(sheets);
    console.log(`  [STORY SCOUT] ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  } catch (err) {
    console.error('  [STORY SCOUT] ERROR:', (err as Error).message);
  }

  // ── Contact sheets ─────────────────────────────────────────────────────────
  // Fix 5: US Network Contacts may 404 due to trailing spaces — importContactSheet
  // handles the fallback internally and logs rather than throwing so the loop continues.
  console.log('\n--- Contact Sheets ---');
  let totalContactsNew = 0;
  let totalContactsUpd = 0;
  for (const { name, region, is_former } of CONTACT_SHEETS) {
    try {
      const { inserted, updated, skipped } = await importContactSheet(sheets, name, region, is_former);
      console.log(`  [${name}] ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
      totalContactsNew += inserted;
      totalContactsUpd += updated;
    } catch (err) {
      // importContactSheet already handles its own fallback — this catch is a safety net
      console.error(`  [${name}] UNHANDLED ERROR:`, (err as Error).message);
    }
  }

  // ── Talent ─────────────────────────────────────────────────────────────────
  console.log('\n--- Talent ---');
  try {
    const { inserted, updated, skipped } = await importTalent(sheets);
    console.log(`  [Talent] ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  } catch (err) {
    console.error('  [Talent] ERROR:', (err as Error).message);
  }

  // ── Brands ─────────────────────────────────────────────────────────────────
  console.log('\n--- Brands ---');
  let totalBrands = 0;
  try {
    const { inserted, updated, skipped } = await importBrands(sheets);
    console.log(`  [Brands] ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    totalBrands = inserted;
  } catch (err) {
    console.error('  [Brands] ERROR:', (err as Error).message);
  }

  // ── Dev Team Tracker ───────────────────────────────────────────────────────
  console.log('\n--- Dev Team Tracker ---');
  let totalDevTasks = 0;
  try {
    const { inserted, skipped } = await importDevTeamTracker(sheets);
    console.log(`  [Dev Team Tracker] ${inserted} inserted, ${skipped} skipped`);
    totalDevTasks = inserted;
  } catch (err) {
    console.error('  [Dev Team Tracker] ERROR:', (err as Error).message);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  // Pull final DB counts for the asset summary (Fix 6 & 7 logging additions)
  console.log('\n=== Import complete ===');

  const ipCount      = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM ip_catalog')[0]?.cnt ?? 0;
  const contactCount = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM buyer_contacts')[0]?.cnt ?? 0;
  const scoutCount   = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM story_scout')[0]?.cnt ?? 0;
  const talentCount  = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM talent')[0]?.cnt ?? 0;
  console.log(`DB totals: ${ipCount} IPs | ${contactCount} contacts | ${scoutCount} story scouts | ${talentCount} talent`);

  // Asset-level summary — counts rows that were indexed this run (may be lower than DB totals
  // on re-runs because INSERT OR IGNORE silently skips duplicates for sizzle/deck)
  const sizzleTotal    = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM sizzle_reels')[0]?.cnt ?? 0;
  const sizzleVimeo    = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM sizzle_reels WHERE vimeo_url IS NOT NULL')[0]?.cnt ?? 0;
  const sizzlePw       = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM sizzle_reels WHERE vimeo_password IS NOT NULL')[0]?.cnt ?? 0;
  const deckTotal      = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM pitch_decks')[0]?.cnt ?? 0;
  const deckWithUrl    = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM pitch_decks WHERE deck_url IS NOT NULL')[0]?.cnt ?? 0;
  const pitchTotal     = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM pitches WHERE outcome = ?', ['pitched'])[0]?.cnt ?? 0;
  const signedTalent   = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM talent WHERE talent_tier = ?', ['signed'])[0]?.cnt ?? 0;
  const targetTalent   = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM talent WHERE talent_tier = ?', ['target'])[0]?.cnt ?? 0;
  const brandPartners  = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM content_partners WHERE type = ?', ['brand'])[0]?.cnt ?? 0;

  console.log('\n=== Asset Summary ===');
  console.log(`Sizzle reels indexed: ${sizzleTotal} (${sizzleVimeo} with Vimeo URLs, ${sizzlePw} with passwords)`);
  console.log(`Pitch decks indexed: ${deckTotal} (${deckWithUrl} with URLs)`);
  console.log(`Pitch records created: ${pitchTotal}`);
  const devTaskCount = query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM dev_tasks')[0]?.cnt ?? 0;
  console.log(`Dev tasks imported: ${devTaskCount}`);
  console.log(`Talent (signed): ${signedTalent} | Talent (targets): ${targetTalent}`);
  console.log(`Buyer contacts: ${totalContactsNew} new | ${totalContactsUpd} updated`);
  console.log(`Brand partners: ${brandPartners}`);
}

main().catch(console.error);
