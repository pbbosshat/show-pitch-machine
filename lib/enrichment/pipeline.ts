// lib/enrichment/pipeline.ts
//
// Shared buyer enrichment pipeline logic.
// Used by both:
//   - scripts/enrich-buyers.ts  (CLI, run directly via npx tsx)
//   - app/api/research/run/route.ts (API, runs async in background after POST)
//
// The pipeline reads Shawn Moffatt's email thread exports, discovers non-MYE
// participants, upserts buyer_contacts, records every message as a touch,
// and uses Claude Haiku to extract structured contact data from email signatures.
//
// Entry point: runEnrichmentPipeline(options)
//
// Schema reference: migrations/017_buyer_enrichment.sql
// Tables used:
//   buyer_research_runs   — one row per pipeline invocation
//   buyer_research        — per-buyer Haiku extraction result
//   buyer_contact_touches — one row per message per participant
//   buyer_contacts        — upserted with title/phone from signature extraction

import { readFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { initDb, run, query, queryOne } from '../db';

// ── Constants ─────────────────────────────────────────────────────────────────

const MYE_DOMAINS = ['gototeam.com', 'myentprod.com'];
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Pause between Haiku calls — avoids rate limit on 100+ contacts
const HAIKU_DELAY_MS = 100;

// How many chars to take from the message tail for signature extraction
const SIG_TAIL_CHARS = 800;

// Markers that separate the current message body from quoted reply history
const REPLY_INDICATORS = [
  /\n> /,
  /\n---+\n/,
  /\nFrom:\s/,
  /\nSent:\s/,
  /\n_{10,}/,         // long underlines (Outlook style)
  /\nOn .+wrote:/,
];

// ── Domain → canonical company name mapping ───────────────────────────────────
// Maps email domains to the company name we expect to find in buyer_companies.
// Used to populate company_id on new buyer_contact rows.
const DOMAIN_COMPANY_MAP: Record<string, string> = {
  'wbd.com': 'Warner Bros. Discovery',
  'discovery.com': 'Warner Bros. Discovery',
  'hbo.com': 'Warner Bros. Discovery',
  'hbomax.com': 'Warner Bros. Discovery',
  'fox.com': 'Fox',
  'foxcorp.com': 'Fox',
  'foxsports.com': 'Fox Sports',
  'nbcuni.com': 'NBCUniversal',
  'nbc.com': 'NBC',
  'bravo.com': 'Bravo',
  'syfy.com': 'Syfy',
  'netflix.com': 'Netflix',
  'disney.com': 'Disney',
  'abc.com': 'ABC',
  'freeform.com': 'Freeform',
  'disneyplus.com': 'Disney+',
  'hulu.com': 'Hulu',
  'espn.com': 'ESPN',
  'aenetworks.com': 'A+E Networks',
  'history.com': 'History',
  'lifetime.com': 'Lifetime',
  'aetv.com': 'A&E',
  'paramount.com': 'Paramount',
  'viacomcbs.com': 'Paramount',
  'mtv.com': 'MTV',
  'bet.com': 'BET',
  'vh1.com': 'VH1',
  'comedycentral.com': 'Comedy Central',
  'amazon.com': 'Amazon MGM Studios',
  'amazonstudios.com': 'Amazon MGM Studios',
  'apple.com': 'Apple TV+',
  'amcnetworks.com': 'AMC Networks',
  'amc.com': 'AMC',
  'bbcamerica.com': 'BBC America',
  'reelz.com': 'Reelz',
  'peacocktv.com': 'Peacock',
  'hallmark.com': 'Hallmark Channel',
  'crownmedia.com': 'Hallmark Channel',
  'showtime.com': 'Showtime',
  'cbs.com': 'CBS',
  'travelchannel.com': 'Travel Channel',
  'scripps.com': 'Scripps Networks',
  'foodnetwork.com': 'Food Network',
  'hgtv.com': 'HGTV',
  'own.tv': 'OWN',
  'tlc.com': 'TLC',
  'investigationdiscovery.com': 'Investigation Discovery',
};

// ── Internal types ────────────────────────────────────────────────────────────

interface PitchRecord {
  subject: string;
  date: string;
  buyer_name: string;
  buyer_email: string;
  network: string;
  msg_count: number;
  outcome: string;
  thread_id: string;
  snippet: string;
}

interface ThreadMessage {
  date: string;
  from: string;
  to: string;
  subject: string;
  body?: string;
}

interface Thread {
  thread_id: string;
  messages: ThreadMessage[];
}

// Accumulated data for one non-MYE participant across all threads
interface ContactCandidate {
  email: string;
  name: string;
  domain: string;
  messages: ThreadMessage[];    // messages sent BY this person
  threadIds: Set<string>;       // all threads they appeared in
  touchDates: number[];         // unix-ms timestamps of all their messages
}

interface SignatureExtraction {
  name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
}

// ── Public options type ───────────────────────────────────────────────────────

export interface PipelineOptions {
  runId: string;          // pre-created buyer_research_runs.id
  user: string;           // MYE team member email (e.g. sm@gototeam.com)
  threadsFile: string;    // absolute path to shawn_pitch_threads_full.json
  pitchDbFile: string;    // absolute path to mye_pitch_database.json
}

// ── Email parsing helpers ─────────────────────────────────────────────────────

/** Extract bare email from "Display Name <email>" or plain address. */
function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/** Extract display name from "Display Name <email>". Falls back to email. */
function extractName(raw: string): string {
  const match = raw.match(/^"?([^"<]+?)"?\s*</);
  if (match) return match[1].trim();
  return extractEmail(raw);
}

/** True if email belongs to the MYE team (gototeam.com or myentprod.com). */
function isMYE(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return MYE_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

/** Parse RFC-2822-ish email date to unix-ms. Returns 0 on failure. */
function parseEmailDate(dateStr: string): number {
  if (!dateStr?.trim()) return 0;
  try {
    const d = new Date(dateStr.trim());
    if (!isNaN(d.getTime())) return d.getTime();
  } catch { /* fall through */ }
  return 0;
}

/**
 * Split a comma-separated email header into individual address parts.
 * Handles "Last, First <email>" by detecting segments without "@" and
 * joining them with the next segment before treating as a full address.
 */
function splitEmailHeader(header: string): string[] {
  if (!header) return [];
  const parts = header.split(',');
  const result: string[] = [];
  let pending = '';

  for (const part of parts) {
    const combined = pending ? `${pending},${part}` : part;
    if (combined.includes('@') || combined.includes('<')) {
      result.push(combined.trim());
      pending = '';
    } else {
      // Accumulate — probably the "Last" of "Last, First <email>"
      pending = combined;
    }
  }
  if (pending.trim()) result.push(pending.trim());
  return result.filter(Boolean);
}

// ── Signature extraction helpers ──────────────────────────────────────────────

/**
 * Isolate the signature block from a message body.
 * Cuts everything after the first reply indicator (quoted history),
 * then returns the last SIG_TAIL_CHARS characters.
 * Returns null if the result is too short to be a real signature.
 */
function extractSignatureCandidate(body: string): string | null {
  let text = body;
  for (const pattern of REPLY_INDICATORS) {
    const idx = text.search(pattern);
    if (idx > 0) {
      text = text.slice(0, idx);
      break;
    }
  }
  const tail = text.slice(-SIG_TAIL_CHARS).trim();
  return tail.length >= 30 ? tail : null;
}

/**
 * Call Claude Haiku to extract name/title/company/phone from a signature block.
 * Returns null on API failure or unparseable JSON response.
 */
async function extractSignatureViaHaiku(
  client: Anthropic,
  signatureText: string
): Promise<SignatureExtraction | null> {
  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content:
            'Extract the contact information from this email signature. ' +
            'Return JSON only, no explanation: ' +
            '{"name": string|null, "title": string|null, "company": string|null, "phone": string|null}. ' +
            'Extract only from the signature block. Return null for fields not found.\n\n' +
            signatureText,
        },
      ],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : null;
    if (!raw) return null;

    // Strip markdown fences if Haiku wraps the JSON
    const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as SignatureExtraction;
  } catch (err) {
    console.warn(`  [WARN] Haiku extraction failed: ${(err as Error).message}`);
    return null;
  }
}

// ── Company lookup by email domain ────────────────────────────────────────────

/**
 * Build a Map<domain, {id, name}> from buyer_companies for quick FK lookups.
 * Matches canonical company names via exact match first, then first-word fuzzy.
 */
function buildDomainMap(): Map<string, { id: string; name: string }> {
  const companies = query<{ id: string; name: string }>('SELECT id, name FROM buyer_companies');

  const byName = new Map<string, { id: string; name: string }>();
  for (const co of companies) byName.set(co.name.toLowerCase(), co);

  const domainMap = new Map<string, { id: string; name: string }>();

  for (const [domain, companyName] of Object.entries(DOMAIN_COMPANY_MAP)) {
    const exact = byName.get(companyName.toLowerCase());
    if (exact) { domainMap.set(domain, exact); continue; }

    // Fuzzy: first word of canonical name matches stored name
    const firstWord = companyName.split(' ')[0].toLowerCase();
    for (const [storedName, co] of byName) {
      if (storedName.includes(firstWord)) { domainMap.set(domain, co); break; }
    }
  }

  return domainMap;
}

// ── Touch dedup helper ────────────────────────────────────────────────────────

/**
 * Check if a touch row already exists for this thread + contact + date combo.
 * The existing schema has no UNIQUE constraint on buyer_contact_touches, so we
 * check manually before inserting to keep re-runs idempotent.
 */
function touchExists(threadId: string, contactEmail: string, touchDate: number): boolean {
  const row = queryOne<{ id: string }>(
    `SELECT id FROM buyer_contact_touches
     WHERE thread_id = ? AND contact_email = ? AND touch_date = ?`,
    [threadId, contactEmail, touchDate]
  );
  return !!row;
}

// ── Pipeline entry point ──────────────────────────────────────────────────────

/**
 * Run the full buyer enrichment pipeline.
 *
 * Reads JSON files, discovers non-MYE participants, upserts buyer_contacts,
 * inserts touch rows, creates pitch records for known outcomes, then calls
 * Haiku to extract title/phone from email signatures.
 *
 * Updates buyer_research_runs row (options.runId) with counters and final status.
 *
 * @throws on missing files or missing ANTHROPIC_API_KEY — caller writes error_msg.
 */
export async function runEnrichmentPipeline(options: PipelineOptions): Promise<void> {
  const { runId, user, threadsFile, pitchDbFile } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!existsSync(threadsFile)) throw new Error(`Threads file not found: ${threadsFile}`);
  if (!existsSync(pitchDbFile)) throw new Error(`Pitch DB not found: ${pitchDbFile}`);

  // Ensure all migration tables exist (idempotent)
  initDb();

  const pitchRecords: PitchRecord[] = JSON.parse(readFileSync(pitchDbFile, 'utf-8'));
  const threads: Thread[]           = JSON.parse(readFileSync(threadsFile, 'utf-8'));

  console.log(`[enrichment] Loaded ${pitchRecords.length} pitches, ${threads.length} threads`);

  // Build a thread_id → pitch metadata lookup for outcome recording
  const pitchMap = new Map<string, PitchRecord>();
  for (const p of pitchRecords) {
    if (p.thread_id) pitchMap.set(p.thread_id, p);
  }

  const domainMap = buildDomainMap();

  // Counters for the final run record update
  let buyersSeen      = 0;
  let buyersCreated   = 0;
  let touchesCreated  = 0;
  let pitchesCreated  = 0;

  // contactCandidates: email → accumulated data across all threads
  const contactCandidates = new Map<string, ContactCandidate>();

  // ── Pass 1: Discover contacts, insert touch rows ───────────────────────────
  for (const thread of threads) {
    // pitchOutcome for this thread (if known) — stored on touch rows for reporting
    const pitchOutcome = pitchMap.get(thread.thread_id)?.outcome ?? null;

    for (const msg of thread.messages) {
      const senderEmail = extractEmail(msg.from);
      const ts = parseEmailDate(msg.date);

      // Discover all non-MYE participants in From + To headers
      for (const header of [msg.from, msg.to].filter(Boolean)) {
        for (const part of splitEmailHeader(header)) {
          const email = extractEmail(part);
          if (!email || !email.includes('@') || isMYE(email)) continue;

          const name   = extractName(part);
          const domain = email.split('@')[1] ?? '';

          if (!contactCandidates.has(email)) {
            contactCandidates.set(email, {
              email, name, domain,
              messages: [], threadIds: new Set(), touchDates: [],
            });
            buyersSeen++;
          }

          const candidate = contactCandidates.get(email)!;
          // Collect messages FROM this buyer for signature extraction
          if (extractEmail(msg.from) === email) candidate.messages.push(msg);
          candidate.threadIds.add(thread.thread_id);
          if (ts > 0) candidate.touchDates.push(ts);
          // Keep the longest (most complete) display name we've seen
          if (name.length > candidate.name.length && !name.includes('@')) {
            candidate.name = name;
          }
        }
      }

      if (ts === 0) continue; // can't insert a touch with no parseable date

      if (!isMYE(senderEmail) && senderEmail.includes('@')) {
        // Inbound: buyer wrote this message
        if (!touchExists(thread.thread_id, senderEmail, ts)) {
          run(
            `INSERT INTO buyer_contact_touches
               (id, contact_email, mye_user_email, touch_date,
                thread_id, thread_subject, message_direction,
                pitch_outcome, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'inbound', ?, ?)`,
            [randomUUID(), senderEmail, user, ts,
             thread.thread_id, msg.subject ?? null, pitchOutcome, Date.now()]
          );
          touchesCreated++;
        }
      } else if (isMYE(senderEmail)) {
        // Outbound: MYE wrote to buyers
        for (const part of splitEmailHeader(msg.to)) {
          const recipEmail = extractEmail(part);
          if (!recipEmail.includes('@') || isMYE(recipEmail)) continue;

          if (!touchExists(thread.thread_id, recipEmail, ts)) {
            run(
              `INSERT INTO buyer_contact_touches
                 (id, contact_email, mye_user_email, touch_date,
                  thread_id, thread_subject, message_direction,
                  pitch_outcome, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'outbound', ?, ?)`,
              [randomUUID(), recipEmail, user, ts,
               thread.thread_id, msg.subject ?? null, pitchOutcome, Date.now()]
            );
            touchesCreated++;
          }
        }
      }
    }
  }

  console.log(`[enrichment] Pass 1: ${buyersSeen} contacts, ${touchesCreated} touches`);

  // ── Pass 2: Upsert buyer_contacts ─────────────────────────────────────────
  // Lookup by email before inserting — buyer_contacts has no UNIQUE constraint on email
  for (const candidate of contactCandidates.values()) {
    const companyRow = domainMap.get(candidate.domain);

    const existing = queryOne<{ id: string }>(
      'SELECT id FROM buyer_contacts WHERE LOWER(email) = LOWER(?)',
      [candidate.email]
    );

    if (!existing) {
      run(
        `INSERT INTO buyer_contacts
           (id, name, email, company_id, activity_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'unknown', ?, ?)`,
        [randomUUID(), candidate.name, candidate.email,
         companyRow?.id ?? null, Date.now(), Date.now()]
      );
      buyersCreated++;
    }
  }

  // Backfill contact_id on any un-linked touch rows for newly created contacts
  run(
    `UPDATE buyer_contact_touches
     SET contact_id = (
       SELECT bc.id FROM buyer_contacts bc
       WHERE LOWER(bc.email) = buyer_contact_touches.contact_email
       LIMIT 1
     )
     WHERE contact_id IS NULL`
  );

  console.log(`[enrichment] Pass 2: ${buyersCreated} new contacts created`);

  // ── Pass 3: Insert pitch records ──────────────────────────────────────────
  for (const thread of threads) {
    const pitch = pitchMap.get(thread.thread_id);
    if (!pitch?.outcome || pitch.outcome === 'unknown') continue;

    const contactRow = queryOne<{ id: string; company_id: string | null }>(
      'SELECT id, company_id FROM buyer_contacts WHERE LOWER(email) = LOWER(?)',
      [pitch.buyer_email]
    );
    if (!contactRow) continue;

    const firstMsg  = thread.messages[0];
    const pitchDate = firstMsg ? parseEmailDate(firstMsg.date) : null;

    // Guard against duplicate pitches on re-runs (no unique index on pitches table)
    const existing = queryOne<{ id: string }>(
      'SELECT id FROM pitches WHERE thread_id = ? AND outcome = ? AND buyer_contact_id = ?',
      [thread.thread_id, pitch.outcome, contactRow.id]
    );

    if (!existing) {
      run(
        `INSERT INTO pitches
           (id, buyer_company_id, buyer_contact_id, pitch_date, outcome, thread_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), contactRow.company_id ?? null, contactRow.id,
         pitchDate || null, pitch.outcome, thread.thread_id, Date.now()]
      );
      pitchesCreated++;
    }
  }

  console.log(`[enrichment] Pass 3: ${pitchesCreated} pitch records inserted`);

  // ── Pass 4: Update last_mye_contact_date and mye_pitch_count ──────────────
  for (const candidate of contactCandidates.values()) {
    if (candidate.touchDates.length === 0) continue;
    const mostRecent = Math.max(...candidate.touchDates);

    run(
      `UPDATE buyer_contacts
       SET last_mye_contact_date = ?,
           mye_pitch_count       = ?,
           updated_at            = ?
       WHERE LOWER(email) = LOWER(?)`,
      [mostRecent, candidate.threadIds.size, Date.now(), candidate.email]
    );
  }

  // ── Pass 5: Haiku signature extraction ────────────────────────────────────
  const haiku = new Anthropic({ apiKey });
  let sigsExtracted = 0;
  let haikuIdx      = 0;

  for (const candidate of contactCandidates.values()) {
    haikuIdx++;

    // Idempotent: skip if already extracted in this run
    const alreadyDone = queryOne<{ id: string }>(
      'SELECT id FROM buyer_research WHERE contact_email = ? AND run_id = ?',
      [candidate.email, runId]
    );
    if (alreadyDone) continue;

    // Find the most recent message FROM this buyer that has a parseable signature
    const sortedMsgs = [...candidate.messages].sort(
      (a, b) => parseEmailDate(b.date) - parseEmailDate(a.date)
    );

    let sigText: string | null = null;
    let sourceMsgThread: string | null = null;
    for (const msg of sortedMsgs) {
      if (!msg.body) continue;
      sigText = extractSignatureCandidate(msg.body);
      if (sigText) {
        // Record which thread the winning message came from
        // We find the thread containing this message by matching content
        const matchThread = threads.find((t) =>
          t.messages.some((m) => m.from === msg.from && m.date === msg.date)
        );
        sourceMsgThread = matchThread?.thread_id ?? null;
        break;
      }
    }

    // Rate limit between Haiku calls
    if (haikuIdx > 1) {
      await new Promise((r) => setTimeout(r, HAIKU_DELAY_MS));
    }

    const extraction = sigText
      ? await extractSignatureViaHaiku(haiku, sigText)
      : null;

    // Resolve contact_id for the research row
    const contactRow = queryOne<{ id: string }>(
      'SELECT id FROM buyer_contacts WHERE LOWER(email) = LOWER(?)',
      [candidate.email]
    );

    run(
      `INSERT OR IGNORE INTO buyer_research
         (id, run_id, contact_id, contact_email,
          extracted_name, extracted_title, extracted_company, extracted_phone,
          sig_raw, source_thread_id,
          processed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(), runId,
        contactRow?.id ?? null, candidate.email,
        extraction?.name ?? null,
        extraction?.title ?? null,
        extraction?.company ?? null,
        extraction?.phone ?? null,
        sigText ?? null,
        sourceMsgThread,
        Date.now(), Date.now(),
      ]
    );

    if (extraction) {
      sigsExtracted++;
      // Only fill null fields — preserve manually curated data from sheet imports
      run(
        `UPDATE buyer_contacts
         SET title    = COALESCE(title, ?),
             phone    = COALESCE(phone, ?),
             updated_at = ?
         WHERE LOWER(email) = LOWER(?)`,
        [extraction.title ?? null, extraction.phone ?? null, Date.now(), candidate.email]
      );
    }
  }

  console.log(`[enrichment] Pass 5: ${sigsExtracted} signatures extracted`);

  // ── Finalize run record ────────────────────────────────────────────────────
  // Schema uses 'failed' not 'error'; status_user → source_user; buyers_updated counts updates
  const buyersUpdated = buyersSeen - buyersCreated; // contacts that already existed

  run(
    `UPDATE buyer_research_runs
     SET status          = 'done',
         completed_at    = ?,
         buyers_seen     = ?,
         buyers_created  = ?,
         buyers_updated  = ?,
         touches_created = ?,
         pitches_created = ?
     WHERE id = ?`,
    [Date.now(), buyersSeen, buyersCreated, buyersUpdated,
     touchesCreated, pitchesCreated, runId]
  );

  console.log(
    `[enrichment] run=${runId} done — ` +
    `buyers=${buyersSeen}(+${buyersCreated}) touches=${touchesCreated} ` +
    `pitches=${pitchesCreated} sigs=${sigsExtracted}`
  );
}
