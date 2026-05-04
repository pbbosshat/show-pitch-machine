// scripts/cross-ref-emails.ts
// Cross-references every TV show project in ip_catalog against Gmail threads
// to produce a chronological email timeline per project in project_email_threads.
//
// PREREQUISITE: Run scripts/import-mye-sheet.ts first to populate ip_catalog
// with sheet_row_key values. Projects without a sheet_row_key are skipped
// since they weren't imported from the spreadsheet.
//
// Two-pass strategy:
//   Pass 1 — Parse pre-exported JSON files from disk (fast, covers historical data)
//   Pass 2 — Live Gmail API search for projects that got zero matches in Pass 1
//
// Run via: npx tsx scripts/cross-ref-emails.ts
//          or: npm run cross-ref-emails

// Suppress node:sqlite experimental warning before any imports
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'node:path';
import { initDb, run, query } from '../lib/db';

// ── Constants ─────────────────────────────────────────────────────────────────

// OAuth2 token for Gmail API (same file used by import-mye-sheet.ts)
const TOKEN_PATH = 'C:/Users/pb/.claude/google/token.json';

// Internal team email addresses — used to classify direction of email threads
const INTERNAL_DOMAINS = ['gototeam.com', 'myentprod.com'];
const MYE_SENDERS = ['sm@gototeam.com', 'patrickbryant@gototeam.com', 'pb@gototeam.com',
  '1@gototeam.com', 'cc@gototeam.com', 'ccrosby@gototeam.com'];

// JSON export files live in the parent directory (My Entertainment/) not the project root.
// These are pre-exported Gmail snapshots that don't require a live API call.
const JSON_FILES = [
  path.resolve(__dirname, '../../shawn_pitch_threads_full.json'),
  path.resolve(__dirname, '../../pitch_threads_full.json'),
];

// Fallback: flat message list with snippet — used if thread format is unrecognised
const RAW_EMAILS_FILE = path.resolve(__dirname, '../../pitch_emails_raw.json');

// Maximum threads to fetch from Gmail live API per project (keeps runtime bounded)
const GMAIL_MAX_RESULTS = 20;

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a thread object in pitch_threads_full.json / shawn_pitch_threads_full.json
interface ThreadExportMessage {
  date: string;
  from: string;
  to: string;
  subject: string;
  body?: string;
}

interface ThreadExport {
  thread_id: string;
  messages: ThreadExportMessage[];
}

// Shape of a record in pitch_emails_raw.json (flat individual message list)
interface RawEmailRecord {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: string;
  snippet?: string;
  thread_id: string;
}

// Normalised, source-agnostic thread record ready for insertion
interface ResolvedThread {
  thread_id: string;
  subject: string;
  participants: string[];
  first_message_date: string;
  last_message_date: string;
  message_count: number;
  snippet: string;
  direction: 'sent' | 'received' | 'internal';
  source: 'json-export' | 'gmail-live';
  match_confidence: 'exact' | 'fuzzy';
}

// Minimal project row from ip_catalog
interface Project {
  id: string;
  title: string;
  sheet_row_key: string | null;
}

// ── Auth helper ───────────────────────────────────────────────────────────────

/**
 * Build an OAuth2 client from the stored token.json file.
 * Mirrors the pattern in import-mye-sheet.ts so the script runs standalone
 * without needing env vars for GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET.
 */
function buildAuthClient() {
  const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
  const client = new google.auth.OAuth2(
    token.client_id    || process.env.GMAIL_CLIENT_ID,
    token.client_secret || process.env.GMAIL_CLIENT_SECRET
  );
  // token.json may store credentials at the top level or nested under "credentials"
  const creds = token.credentials ?? token;
  client.setCredentials(creds);
  return client;
}

// ── Matching logic ────────────────────────────────────────────────────────────

/**
 * Determine whether a Gmail thread is related to a given project title.
 *
 * - Exact: the full lowercased project title appears in the thread subject.
 * - Fuzzy: all significant words (>3 chars) appear somewhere in subject OR snippet.
 *
 * Keeping the threshold at 2+ significant words avoids matching single generic
 * words like "ghost" or "storm" against unrelated threads.
 */
function matchesProject(
  threadSubject: string,
  threadSnippet: string,
  projectTitle: string
): { matched: boolean; confidence: 'exact' | 'fuzzy' } {
  const subject = threadSubject.toLowerCase();
  const snippet = (threadSnippet || '').toLowerCase();
  const title = projectTitle.toLowerCase();

  // Exact match: full title appears verbatim in the subject line
  if (subject.includes(title)) return { matched: true, confidence: 'exact' };

  // Fuzzy match: all significant words (>3 chars) appear in subject OR snippet
  const words = title.split(/\s+/).filter((w) => w.length > 3);
  if (
    words.length >= 2 &&
    words.every((w) => subject.includes(w) || snippet.includes(w))
  ) {
    return { matched: true, confidence: 'fuzzy' };
  }

  return { matched: false, confidence: 'exact' };
}

// ── Email address extraction ──────────────────────────────────────────────────

/**
 * Extract a bare email address from a "Display Name <email>" string.
 * Falls back to returning the trimmed input if no angle-bracket format found.
 */
function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/**
 * Parse a comma-separated "From/To/Cc" header value into unique email addresses.
 * Handles "Display Name <email>" format and plain addresses.
 */
function parseParticipants(headerValues: string[]): string[] {
  const emails = new Set<string>();
  for (const val of headerValues) {
    // Split on comma but not commas inside quotes (e.g. "Last, First <email>")
    // Simple split is sufficient for Gmail export format
    for (const part of val.split(',')) {
      const email = extractEmail(part.trim());
      if (email && email.includes('@')) emails.add(email);
    }
  }
  return Array.from(emails);
}

// ── Direction classification ──────────────────────────────────────────────────

/**
 * Classify the direction of a thread based on the first message's sender.
 *
 * - 'sent'     : MYE team member sent the first message to an external party
 * - 'internal' : All participants have internal (gototeam.com / myentprod.com) addresses
 * - 'received' : First message came from an external sender
 */
function classifyDirection(
  firstSender: string,
  allParticipants: string[]
): 'sent' | 'received' | 'internal' {
  const senderEmail = extractEmail(firstSender).toLowerCase();

  // Check if all participants are internal-domain addresses
  const isInternalParticipant = (email: string) =>
    INTERNAL_DOMAINS.some((d) => email.endsWith('@' + d));

  if (allParticipants.every(isInternalParticipant)) return 'internal';

  // MYE sender initiated the thread (outbound pitch / follow-up)
  if (MYE_SENDERS.includes(senderEmail)) return 'sent';
  if (isInternalParticipant(senderEmail)) return 'sent';

  // External sender initiated (inbound inquiry / buyer response)
  return 'received';
}

// ── Date parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a RFC-2822-style date string from email headers into an ISO 8601 string.
 * Returns a fallback empty string on failure so the thread still gets inserted
 * rather than crashing the whole import.
 */
function parseEmailDate(dateStr: string): string {
  if (!dateStr?.trim()) return '';
  try {
    const d = new Date(dateStr.trim());
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
    // Malformed date — log nothing, fall through to empty string
  }
  return '';
}

// ── Thread normalisation from JSON exports ────────────────────────────────────

/**
 * Convert a ThreadExport object (from pitch_threads_full.json format) into
 * a ResolvedThread ready for insertion. Returns null if the thread has no messages.
 */
function normaliseThreadExport(
  thread: ThreadExport,
  confidence: 'exact' | 'fuzzy'
): ResolvedThread | null {
  if (!thread.messages || thread.messages.length === 0) return null;

  // Sort messages chronologically so first/last dates are correct
  const sorted = [...thread.messages].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Collect all participants across all messages (from + to fields)
  const participantHeaders: string[] = [];
  for (const msg of sorted) {
    if (msg.from) participantHeaders.push(msg.from);
    if (msg.to)   participantHeaders.push(msg.to);
  }
  const participants = parseParticipants(participantHeaders);

  // Snippet: first non-empty message body, truncated to 300 chars
  const snippetSource = sorted.find((m) => m.body?.trim())?.body ?? '';
  const snippet = snippetSource.replace(/\r?\n/g, ' ').trim().slice(0, 300);

  return {
    thread_id:          thread.thread_id,
    subject:            first.subject ?? '',
    participants,
    first_message_date: parseEmailDate(first.date),
    last_message_date:  parseEmailDate(last.date),
    message_count:      sorted.length,
    snippet,
    direction:          classifyDirection(first.from ?? '', participants),
    source:             'json-export',
    match_confidence:   confidence,
  };
}

// ── Database insertion ────────────────────────────────────────────────────────

/**
 * Insert a resolved thread into project_email_threads.
 * Uses INSERT OR IGNORE because the table has a UNIQUE(ip_catalog_id, thread_id)
 * constraint — running the script twice is safe.
 *
 * Returns 1 if the row was inserted, 0 if it already existed.
 */
function insertThread(ipCatalogId: string, thread: ResolvedThread): number {
  const result = run(
    `INSERT OR IGNORE INTO project_email_threads
       (id, ip_catalog_id, thread_id, subject, participants,
        first_message_date, last_message_date, message_count,
        snippet, direction, source, match_confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      ipCatalogId,
      thread.thread_id,
      thread.subject || null,
      JSON.stringify(thread.participants),
      thread.first_message_date || null,
      thread.last_message_date  || null,
      thread.message_count,
      thread.snippet || null,
      thread.direction,
      thread.source,
      thread.match_confidence,
    ]
  );
  return result.changes;
}

// ── Pass 1: JSON file scan ────────────────────────────────────────────────────

/**
 * Load and parse the pre-exported JSON thread files.
 *
 * Tries pitch_threads_full.json / shawn_pitch_threads_full.json first (ThreadExport[]).
 * Falls back to pitch_emails_raw.json (RawEmailRecord[]) if those files are missing
 * or have an unexpected structure.
 *
 * Returns an array of ThreadExport objects with a normalised shape.
 */
function loadJsonThreads(): ThreadExport[] {
  const allThreads: ThreadExport[] = [];

  for (const filePath of JSON_FILES) {
    if (!existsSync(filePath)) {
      console.warn(`[WARN] JSON file not found, skipping: ${filePath}`);
      continue;
    }

    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      // Validate shape: expect array of { thread_id, messages[] }
      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        typeof parsed[0].thread_id !== 'string' ||
        !Array.isArray(parsed[0].messages)
      ) {
        console.warn(`[WARN] Unexpected structure in ${path.basename(filePath)} — skipping`);
        continue;
      }

      allThreads.push(...(parsed as ThreadExport[]));
      console.log(`  Loaded ${parsed.length} threads from ${path.basename(filePath)}`);
    } catch (err) {
      console.warn(`[WARN] Failed to parse ${path.basename(filePath)}: ${(err as Error).message}`);
    }
  }

  // Fallback: try pitch_emails_raw.json and synthesise ThreadExport objects from it
  if (allThreads.length === 0 && existsSync(RAW_EMAILS_FILE)) {
    console.log('  No thread-format files loaded — trying pitch_emails_raw.json fallback...');
    try {
      const raw = readFileSync(RAW_EMAILS_FILE, 'utf-8');
      const records = JSON.parse(raw) as RawEmailRecord[];

      // Group individual message records by thread_id to form synthetic thread objects
      const byThread = new Map<string, RawEmailRecord[]>();
      for (const rec of records) {
        if (!rec.thread_id) continue;
        if (!byThread.has(rec.thread_id)) byThread.set(rec.thread_id, []);
        byThread.get(rec.thread_id)!.push(rec);
      }

      // Convert each group into a ThreadExport-compatible shape
      for (const [threadId, msgs] of byThread) {
        const sorted = [...msgs].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        allThreads.push({
          thread_id: threadId,
          messages:  sorted.map((m) => ({
            date:    m.date,
            from:    m.from,
            to:      m.to,
            subject: m.subject,
            body:    m.snippet ?? '',
          })),
        });
      }

      console.log(`  Loaded ${allThreads.length} synthetic threads from pitch_emails_raw.json`);
    } catch (err) {
      console.warn(`[WARN] Failed to parse pitch_emails_raw.json: ${(err as Error).message}`);
    }
  }

  return allThreads;
}

/**
 * For each project, scan the preloaded thread array for title matches.
 * Returns a map of ip_catalog_id → array of ResolvedThread objects.
 */
function pass1JsonScan(
  projects: Project[],
  allThreads: ThreadExport[]
): Map<string, ResolvedThread[]> {
  const resultMap = new Map<string, ResolvedThread[]>();

  for (const project of projects) {
    const matches: ResolvedThread[] = [];

    for (const thread of allThreads) {
      // Use the subject of the first message as the canonical thread subject
      const firstMsg = thread.messages?.[0];
      if (!firstMsg) continue;

      const subject = firstMsg.subject ?? '';
      // Build a snippet from the first message body for fuzzy matching
      const bodySnippet = (firstMsg.body ?? '').replace(/\r?\n/g, ' ').slice(0, 300);

      const { matched, confidence } = matchesProject(subject, bodySnippet, project.title);
      if (!matched) continue;

      const resolved = normaliseThreadExport(thread, confidence);
      if (resolved) matches.push(resolved);
    }

    resultMap.set(project.id, matches);
  }

  return resultMap;
}

// ── Pass 2: Live Gmail search ─────────────────────────────────────────────────

/**
 * Normalise a Gmail API thread response into a ResolvedThread.
 * The Gmail API returns message metadata (headers) but not full bodies by default —
 * we request format:'metadata' to get headers for subject/from/to plus the snippet.
 */
async function fetchAndNormaliseGmailThread(
  gmail: ReturnType<typeof google.gmail>,
  gmailThreadId: string,
  confidence: 'exact' | 'fuzzy'
): Promise<ResolvedThread | null> {
  const res = await gmail.users.threads.get({
    userId: 'me',
    id:     gmailThreadId,
    format: 'metadata',
    // Request only the headers we care about (reduces payload size)
    metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
  });

  const msgs = res.data.messages ?? [];
  if (msgs.length === 0) return null;

  // Sort messages by internalDate (ms since epoch provided by Gmail API)
  const sorted = [...msgs].sort((a, b) => {
    const da = parseInt(a.internalDate ?? '0', 10);
    const db = parseInt(b.internalDate ?? '0', 10);
    return da - db;
  });

  const first = sorted[0];
  const last  = sorted[sorted.length - 1];

  // Helper to pull a named header value from a message
  function getHeader(msg: typeof first, name: string): string {
    return (
      msg.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      )?.value ?? ''
    );
  }

  // Collect all participants across all messages
  const participantHeaders: string[] = [];
  for (const msg of sorted) {
    const from = getHeader(msg, 'From');
    const to   = getHeader(msg, 'To');
    const cc   = getHeader(msg, 'Cc');
    if (from) participantHeaders.push(from);
    if (to)   participantHeaders.push(to);
    if (cc)   participantHeaders.push(cc);
  }
  const participants = parseParticipants(participantHeaders);

  const subject = getHeader(first, 'Subject');
  // internalDate is milliseconds since epoch; convert to ISO for consistency
  const firstDate = first.internalDate
    ? new Date(parseInt(first.internalDate, 10)).toISOString()
    : '';
  const lastDate  = last.internalDate
    ? new Date(parseInt(last.internalDate, 10)).toISOString()
    : '';

  // Gmail provides a pre-built snippet on the thread object (first message preview)
  const snippet = (res.data.snippet ?? '').slice(0, 300);

  return {
    thread_id:          gmailThreadId,
    subject,
    participants,
    first_message_date: firstDate,
    last_message_date:  lastDate,
    message_count:      sorted.length,
    snippet,
    direction:          classifyDirection(getHeader(first, 'From'), participants),
    source:             'gmail-live',
    match_confidence:   confidence,
  };
}

/**
 * Search Gmail live for threads related to a project title.
 *
 * Strategy:
 *   1. subject:"<title>" — fastest, highest precision
 *   2. "<title>"         — full-text search if subject search returns nothing
 *
 * Skips thread IDs that are already recorded for this project (by checking
 * the pass1Results set) to avoid duplicate work in the live pass.
 */
async function pass2GmailSearch(
  gmail: ReturnType<typeof google.gmail>,
  project: Project,
  alreadyFoundIds: Set<string>
): Promise<ResolvedThread[]> {
  const results: ResolvedThread[] = [];

  // Try subject-line search first (higher precision)
  const queries = [
    `subject:"${project.title}"`,
    `"${project.title}"`, // full-text fallback
  ];

  for (const q of queries) {
    let listRes;
    try {
      listRes = await gmail.users.threads.list({
        userId:     'me',
        q,
        maxResults: GMAIL_MAX_RESULTS,
      });
    } catch (err) {
      console.error(`    Gmail search error for "${project.title}" (q=${q}): ${(err as Error).message}`);
      break;
    }

    const threads = listRes.data.threads ?? [];
    if (threads.length === 0) continue; // try next query form

    for (const t of threads) {
      if (!t.id) continue;
      // Skip threads already found in Pass 1 or earlier in this pass
      if (alreadyFoundIds.has(t.id)) continue;

      // Use exact confidence for subject-line matches, fuzzy for full-text
      const confidence: 'exact' | 'fuzzy' = q.startsWith('subject:') ? 'exact' : 'fuzzy';

      try {
        const resolved = await fetchAndNormaliseGmailThread(gmail, t.id, confidence);
        if (resolved) {
          results.push(resolved);
          alreadyFoundIds.add(t.id); // prevent double-inserting from full-text pass
        }
      } catch (err) {
        console.error(`    Failed to fetch thread ${t.id}: ${(err as Error).message}`);
      }
    }

    // If we found matches in subject search, don't bother with full-text
    if (results.length > 0) break;
  }

  return results;
}

// ── Summary formatting ────────────────────────────────────────────────────────

/**
 * Format a ISO date string as YYYY-MM-DD for compact summary output.
 * Returns '?' if the date is empty or invalid.
 */
function fmtDate(iso: string): string {
  if (!iso) return '?';
  return iso.slice(0, 10);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Email Cross-Reference Script ===\n');

  // Step 1: Ensure database schema is up to date (runs all migration SQL files)
  console.log('Running migrations...');
  initDb();
  console.log('Migrations complete.\n');

  // Step 2: Load all sheet-imported projects (those with a sheet_row_key)
  // Projects seeded from CSV alone won't have a sheet_row_key and are excluded —
  // the email timeline feature is scoped to the spreadsheet-managed pipeline.
  const projects = query<Project>(
    `SELECT id, title, sheet_row_key
     FROM ip_catalog
     WHERE sheet_row_key IS NOT NULL
     ORDER BY title`
  );

  if (projects.length === 0) {
    console.log('No sheet-imported projects found in ip_catalog.');
    console.log('Run scripts/import-mye-sheet.ts first, then re-run this script.');
    return;
  }

  console.log(`Found ${projects.length} sheet-imported projects.\n`);

  // Step 3: Load JSON export files into memory (Pass 1 data source)
  console.log('--- Pass 1: Loading JSON thread exports ---');
  const allJsonThreads = loadJsonThreads();
  console.log(`  Total threads available for matching: ${allJsonThreads.length}\n`);

  // Step 4: Match each project against the JSON threads
  console.log('--- Pass 1: Matching projects to JSON threads ---');
  const pass1Results = pass1JsonScan(projects, allJsonThreads);

  // Insert Pass 1 results and track which projects need Pass 2
  const projectsNeedingPass2: Project[] = [];
  const insertCounts = new Map<string, { json: number; gmail: number }>();

  for (const project of projects) {
    const threads = pass1Results.get(project.id) ?? [];
    let jsonInserted = 0;
    for (const thread of threads) {
      jsonInserted += insertThread(project.id, thread);
    }
    insertCounts.set(project.id, { json: jsonInserted, gmail: 0 });

    if (threads.length === 0) {
      projectsNeedingPass2.push(project);
    }
  }

  // Step 5: Pass 2 — live Gmail search for projects with no JSON matches
  let gmailClient: ReturnType<typeof google.gmail> | null = null;

  if (projectsNeedingPass2.length > 0) {
    console.log(`\n--- Pass 2: Live Gmail search for ${projectsNeedingPass2.length} projects with no JSON matches ---`);

    // Only initialise the Gmail client if we actually need it
    if (!existsSync(TOKEN_PATH)) {
      console.warn(`[WARN] Gmail token not found at ${TOKEN_PATH} — skipping live search`);
    } else {
      try {
        const auth = buildAuthClient();
        gmailClient = google.gmail({ version: 'v1', auth });
      } catch (err) {
        console.error(`[ERROR] Failed to build Gmail auth client: ${(err as Error).message}`);
      }
    }

    if (gmailClient) {
      for (const project of projectsNeedingPass2) {
        // Build a set of thread IDs already inserted for this project (from Pass 1)
        // This is always empty for Pass 2 candidates but kept for correctness
        const existingIds = new Set(
          query<{ thread_id: string }>(
            'SELECT thread_id FROM project_email_threads WHERE ip_catalog_id = ?',
            [project.id]
          ).map((r) => r.thread_id)
        );

        let gmailInserted = 0;
        try {
          const liveThreads = await pass2GmailSearch(gmailClient, project, existingIds);
          for (const thread of liveThreads) {
            gmailInserted += insertThread(project.id, thread);
          }
        } catch (err) {
          console.error(`  [ERROR] Gmail pass for "${project.title}": ${(err as Error).message}`);
        }

        // Update the count map
        const counts = insertCounts.get(project.id) ?? { json: 0, gmail: 0 };
        counts.gmail = gmailInserted;
        insertCounts.set(project.id, counts);
      }
    }
  }

  // Step 6: Print per-project summary
  console.log('\n--- Summary ---');

  for (const project of projects) {
    const counts = insertCounts.get(project.id) ?? { json: 0, gmail: 0 };
    const total = counts.json + counts.gmail;

    if (total === 0) {
      console.log(`[${project.title}] 0 threads found`);
      continue;
    }

    // Fetch date range from DB for this project (the inserted rows may span multiple runs)
    const dateRow = query<{ first: string; last: string }>(
      `SELECT MIN(first_message_date) AS first, MAX(last_message_date) AS last
       FROM project_email_threads
       WHERE ip_catalog_id = ?`,
      [project.id]
    )[0];

    const firstDate = fmtDate(dateRow?.first ?? '');
    const lastDate  = fmtDate(dateRow?.last  ?? '');

    // Build source breakdown string (only show non-zero sources)
    const sourceParts: string[] = [];
    if (counts.json > 0)  sourceParts.push(`json(${counts.json})`);
    if (counts.gmail > 0) sourceParts.push(`gmail(${counts.gmail})`);

    console.log(
      `[${project.title}] ${total} threads found | ${firstDate} → ${lastDate} | sources: ${sourceParts.join(' ')}`
    );
  }

  // Final DB totals
  const totalThreadRows = query<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM project_email_threads'
  )[0]?.cnt ?? 0;

  console.log(`\n=== Complete. ${totalThreadRows} total rows in project_email_threads ===`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
