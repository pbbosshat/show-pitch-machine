// scripts/ingest-inbox-emails.ts
//
// Ingests buyer-to/from-MYE email threads as trade_articles rows.
// Scans sm@gototeam.com (OAuth) and all myentprod.com mailboxes (service account DWD)
// for emails matching buyer domain filters. Each thread is stored as one article row
// with source = 'inbox-email'. Entity extraction is handled downstream by process-articles.ts.
//
// Run via:
//   npx tsx --env-file=.env scripts/ingest-inbox-emails.ts
//
// Prerequisites:
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN  (for sm@gototeam.com OAuth)
//   GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_PATH  (for myentprod.com DWD)
//   GROQ_API_KEY  (for item_type classification)

// Suppress node:sqlite experimental warning before any imports
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { randomUUID } from 'crypto';
import { pathToFileURL } from 'url';
import { google } from 'googleapis';
import { convert } from 'html-to-text';
import fs from 'node:fs';
import Groq from 'groq-sdk';
import { initDb, run, query, queryOne } from '../lib/db';

// ── Constants ─────────────────────────────────────────────────────────────────

// Groq model for item_type classification — same default as process-articles.ts
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Delay between mailbox scans to avoid Gmail 429 rate limits
const MAILBOX_DELAY_MS = 150;

// Max threads to fetch per mailbox per run — prevents runaway API usage on first run
const MAX_RESULTS_PER_MAILBOX = 200;

// Look back 90 days on first run; subsequent runs use latest ingested_at from ingestion_log
const FIRST_RUN_LOOKBACK_DAYS = 90;

// myentprod.com mailboxes to scan — same list as getMYEPipelineMessages in lib/gmail.ts
const MYE_PIPELINE_MAILBOXES = [
  'michael@myentprod.com',
  'hhansen@myentprod.com',
  'admin@myentprod.com',
  'jtownley@myentprod.com',
  'kmiles@myentprod.com',
];

// Full buyer domain filter for myentprod.com mailboxes — matches MYE_BUYER_DOMAIN_FILTER
// in lib/gmail.ts. Covers all major streaming, broadcast, cable, premium, and studio domains.
const MYE_BUYER_DOMAINS = [
  // Big streaming
  'netflix.com', 'hulu.com', 'amazon.com', 'apple.com',
  // Broadcast / cable
  'nbcuni.com', 'wbd.com', 'hbo.com', 'max.com', 'fox.com', 'paramount.com',
  'aenetworks.com', 'amc.com', 'amcnetworks.com',
  // Premium
  'showtime.com', 'starz.com', 'mgm.com',
  // Cable lifestyle / reality / doc
  'discovery.com', 'scripps.com', 'peacocktv.com', 'paramountplus.com',
  'disneystreaming.com', 'bravo.com', 'oxygen.com', 'lifetime.com',
  // Studios / distributors
  'sonypictures.com', 'lionsgate.com', 'a24films.com',
  // International
  'bbc.co.uk', 'bbc.com', 'channel4.com', 'itv.com', 'skystudios.com',
];

// Shorter domain list for sm@gototeam.com — matches getPipelineMessages in lib/gmail.ts
const SM_BUYER_DOMAINS = [
  'wbd.com', 'nbcuni.com', 'netflix.com', 'hbo.com', 'aenetworks.com',
  'paramount.com', 'fox.com', 'amazon.com', 'apple.com',
];

// ── Auth helpers (copied from lib/gmail.ts — not exported there) ──────────────

// Service account DWD auth — impersonates any myentprod.com mailbox
function getServiceAccountAuth(scopes: string[], subject: string) {
  // Railway injects the key as JSON string; locally read from disk
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : JSON.parse(fs.readFileSync(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
        'C:/Users/pb/.claude/google/service_account.json',
        'utf-8'
      ));

  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes,
    subject,
  });
}

// OAuth2 client — used for sm@gototeam.com (Patrick's pitch mailbox)
function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return client;
}

// ── Message parsing ────────────────────────────────────────────────────────────

// Shape returned from parseMessage — minimal subset of GmailMessage for this script
interface ParsedMsg {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  body: string;
  receivedAt: number;
}

// Parse a raw Gmail API message payload into a clean object.
// Matches the parseMessage() logic in lib/gmail.ts exactly.
function parseMessage(msg: {
  id?: string | null;
  threadId?: string | null;
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }> | null;
    body?: { data?: string | null } | null;
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null } | null;
    }> | null;
  } | null;
  internalDate?: string | null;
}): ParsedMsg {
  const headers = msg.payload?.headers ?? [];
  const get = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

  let body = '';
  const parts = msg.payload?.parts ?? [];
  const textPart = parts.find((p) => p.mimeType === 'text/plain');
  const htmlPart = parts.find((p) => p.mimeType === 'text/html');

  if (textPart?.body?.data) {
    body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
  } else if (htmlPart?.body?.data) {
    const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
    body = convert(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] });
  } else if (msg.payload?.body?.data) {
    const raw = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
    body = raw.includes('<html') ? convert(raw, { wordwrap: false }) : raw;
  }

  return {
    id: msg.id ?? '',
    threadId: msg.threadId ?? '',
    subject: get('subject'),
    sender: get('from'),
    body: body.slice(0, 8000), // cap at 8 KB — consistent with lib/gmail.ts
    receivedAt: msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now(),
  };
}

// ── Dedup ─────────────────────────────────────────────────────────────────────

// Returns the set of thread IDs already stored as buyer-email trade articles.
// Uses source_type='buyer-email' to avoid any collision with the newsletter
// scraper (source_type='gmail') or pipeline poller (source_type='gmail').
function getIngestedBuyerEmailThreadIds(): Set<string> {
  const rows = query<{ source_id: string }>(
    "SELECT source_id FROM ingestion_log WHERE source_type = 'buyer-email'"
  );
  return new Set(rows.map((r) => r.source_id));
}

// Determine the since-date for this run:
// - First run: go back FIRST_RUN_LOOKBACK_DAYS
// - Subsequent runs: use MAX(ingested_at) from previous buyer-email ingest rows
function getSinceDate(): Date {
  const row = queryOne<{ max_at: number | null }>(
    "SELECT MAX(ingested_at) AS max_at FROM ingestion_log WHERE source_type = 'buyer-email'"
  );
  if (row?.max_at) {
    return new Date(row.max_at);
  }
  const d = new Date();
  d.setDate(d.getDate() - FIRST_RUN_LOOKBACK_DAYS);
  return d;
}

// ── item_type classification via Groq ─────────────────────────────────────────

// Single Groq client — reused across all classification calls
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Classify a thread into one of the canonical item_type values using a single
// fast Groq call. Falls back to 'other' on any API or parse error.
async function classifyThread(subject: string, body: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 10, // one word is all we need
      messages: [
        {
          role: 'system',
          content: 'Classify this email thread. Reply with one word only: greenlit, cancelled, exec-move, mandate-statement, or other.',
        },
        {
          role: 'user',
          content: `Subject: ${subject}\n\n${body.slice(0, 500)}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim().toLowerCase() ?? '';

    // Map the raw Groq response to canonical item_type values
    if (raw.startsWith('greenlit')) return 'greenlit';
    if (raw.startsWith('cancelled')) return 'cancelled';
    if (raw.startsWith('exec-move') || raw.startsWith('exec move')) return 'exec-move';
    if (raw.startsWith('mandate')) return 'mandate-statement';
    return 'other';
  } catch {
    // Non-fatal — classification is nice-to-have, not blocking
    return 'other';
  }
}

// ── Thread grouping ────────────────────────────────────────────────────────────

// Group an array of parsed messages by threadId.
// Within each thread, messages are ordered ascending by receivedAt (oldest first)
// so the concatenated body reads chronologically.
function groupByThread(messages: ParsedMsg[]): Map<string, ParsedMsg[]> {
  const threads = new Map<string, ParsedMsg[]>();
  for (const msg of messages) {
    if (!threads.has(msg.threadId)) threads.set(msg.threadId, []);
    threads.get(msg.threadId)!.push(msg);
  }
  // Sort each thread's messages chronologically
  for (const [, msgs] of threads) {
    msgs.sort((a, b) => a.receivedAt - b.receivedAt);
  }
  return threads;
}

// ── Per-mailbox scan ──────────────────────────────────────────────────────────

// Fetch all matching messages from one Gmail mailbox using the provided Gmail client.
// Returns an array of parsed messages, suppressing and logging any API errors.
async function fetchMessagesFromMailbox(
  gmail: ReturnType<typeof google.gmail>,
  mailbox: string,
  domainFilter: string[],
  sinceDate: Date
): Promise<ParsedMsg[]> {
  const after = Math.floor(sinceDate.getTime() / 1000);
  // Build query: domain filter + date constraint (no exclusions for buyer emails)
  const domainQuery = domainFilter.map((d) => `from:${d}`).join(' OR ');
  const q = `(${domainQuery}) after:${after}`;

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: MAX_RESULTS_PER_MAILBOX,
  });

  const messageIds = listRes.data.messages ?? [];
  if (messageIds.length === 0) return [];

  const results: ParsedMsg[] = [];
  for (const m of messageIds) {
    if (!m.id) continue;
    try {
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
      results.push(parseMessage(full.data));
    } catch (err) {
      // A single message fetch failure should not abort the mailbox scan
      console.warn(`[ingest-inbox] msg fetch failed (${mailbox}, id=${m.id}):`,
        err instanceof Error ? err.message : err);
    }
  }

  return results;
}

// ── SQL insert ────────────────────────────────────────────────────────────────

// Upsert one thread's assembled data into trade_articles.
// ON CONFLICT(url) updates the text fields so edits/replies in a thread are captured.
// Returns the article id (new or existing).
function upsertThreadArticle(opts: {
  threadId: string;
  subject: string;
  body: string;
  itemType: string;
  scrapedAt: number;
}): string {
  const id = randomUUID();
  const url = `gmail:${opts.threadId}`;

  run(
    `INSERT INTO trade_articles
       (id, source, url, headline, body, item_type, format_type, relevance_tier, signal_type, scraped_at, embedded)
     VALUES (?, 'inbox-email', ?, ?, ?, ?, NULL, 'A', NULL, ?, 0)
     ON CONFLICT(url) DO UPDATE SET
       headline = excluded.headline,
       body = excluded.body,
       scraped_at = excluded.scraped_at`,
    [id, url, opts.subject, opts.body, opts.itemType, opts.scrapedAt]
  );

  return id;
}

// Record that this thread has been ingested so future runs skip it.
// ON CONFLICT(source_id) prevents duplicate log rows on re-runs.
function logIngestion(threadId: string): void {
  run(
    `INSERT INTO ingestion_log (id, source_type, source_id, ingested_at, chunk_count, status)
     VALUES (?, 'buyer-email', ?, ?, 0, 'ok')
     ON CONFLICT DO NOTHING`,
    [randomUUID(), threadId, Date.now()]
  );
}

// ── Main exported function ────────────────────────────────────────────────────

/**
 * Scan all MYE mailboxes (sm@gototeam.com + myentprod.com) for buyer-domain emails,
 * group by thread, and store each new thread as one trade_articles row.
 *
 * Returns the count of NEW threads ingested this run.
 * Existing threads (already in ingestion_log as 'buyer-email') are skipped.
 * Per-mailbox failures are warned and skipped — not fatal.
 */
export async function ingestBuyerEmails(): Promise<number> {
  initDb();

  const ingested = getIngestedBuyerEmailThreadIds();
  const sinceDate = getSinceDate();

  // Running totals for the log summary
  const perMailboxCounts: Array<{ mailbox: string; count: number }> = [];
  let totalNew = 0;

  // ── sm@gototeam.com (OAuth) ────────────────────────────────────────────────
  try {
    const auth = getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const messages = await fetchMessagesFromMailbox(gmail, 'sm@gototeam.com', SM_BUYER_DOMAINS, sinceDate);
    const threads = groupByThread(messages);

    let newForMailbox = 0;
    for (const [threadId, msgs] of threads) {
      if (ingested.has(threadId)) continue;

      // Build the trade article from all messages in the thread
      const subject = msgs[0].subject;
      const body = msgs.map((m) => m.body).join('\n---\n');
      const scrapedAt = Math.max(...msgs.map((m) => m.receivedAt));

      const itemType = await classifyThread(subject, body);

      upsertThreadArticle({ threadId, subject, body, itemType, scrapedAt });
      logIngestion(threadId);

      ingested.add(threadId); // prevent cross-mailbox duplicate processing this run
      newForMailbox++;
      totalNew++;
    }

    perMailboxCounts.push({ mailbox: 'sm@gototeam.com', count: newForMailbox });
  } catch (err) {
    console.warn('[ingest-inbox] sm@gototeam.com failed:',
      err instanceof Error ? err.message : err);
    perMailboxCounts.push({ mailbox: 'sm@gototeam.com', count: 0 });
  }

  // ── myentprod.com mailboxes (service account DWD) ─────────────────────────
  for (const mailbox of MYE_PIPELINE_MAILBOXES) {
    // Rate-limit delay between mailboxes
    await new Promise((r) => setTimeout(r, MAILBOX_DELAY_MS));

    try {
      const auth = getServiceAccountAuth(
        ['https://www.googleapis.com/auth/gmail.readonly'],
        mailbox
      );
      const gmail = google.gmail({ version: 'v1', auth });

      const messages = await fetchMessagesFromMailbox(gmail, mailbox, MYE_BUYER_DOMAINS, sinceDate);
      const threads = groupByThread(messages);

      let newForMailbox = 0;
      for (const [threadId, msgs] of threads) {
        if (ingested.has(threadId)) continue;

        const subject = msgs[0].subject;
        const body = msgs.map((m) => m.body).join('\n---\n');
        const scrapedAt = Math.max(...msgs.map((m) => m.receivedAt));

        const itemType = await classifyThread(subject, body);

        upsertThreadArticle({ threadId, subject, body, itemType, scrapedAt });
        logIngestion(threadId);

        ingested.add(threadId); // suppress cross-mailbox duplicates within this run
        newForMailbox++;
        totalNew++;
      }

      perMailboxCounts.push({ mailbox, count: newForMailbox });
    } catch (err) {
      // DWD may not cover every mailbox — warn and continue to the next one
      console.warn(`[ingest-inbox] ${mailbox} skipped:`,
        err instanceof Error ? err.message : err);
      perMailboxCounts.push({ mailbox, count: 0 });
    }
  }

  // ── Log summary ───────────────────────────────────────────────────────────
  console.log('\n📧  Buyer email ingest');
  for (const { mailbox, count } of perMailboxCounts) {
    console.log(`  ${mailbox.padEnd(32)}${count} new thread${count === 1 ? '' : 's'}`);
  }
  console.log(`  ✅  ${totalNew} thread${totalNew === 1 ? '' : 's'} ingested as trade articles`);

  return totalNew;
}

// ── Standalone entry point ────────────────────────────────────────────────────

// Runs when executed directly: npx tsx --env-file=.env scripts/ingest-inbox-emails.ts
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  ingestBuyerEmails()
    .then((n) => { console.log(`\nIngested ${n} threads`); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
