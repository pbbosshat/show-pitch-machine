// Full historical backfill of pitch-related emails across all myentprod.com mailboxes.
// - Applies pitch_exclude contacts from DB as -from: filters (excludes production contacts)
// - Fetches From/Subject/Date headers + body for each message not yet in package_emails
// - Inserts with grok_signal='pending' — no Groq classification (too slow for bulk)
// - Deduplicates by gmail_thread_id — safe to kill and restart
// - Throttled to 4 req/sec per Gmail 250 QPM quota

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import { convert } from 'html-to-text';

const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
  'C:/Users/bang/show-pitch-machine/data/service_account.json';

const DB_PATH = process.env.DATABASE_PATH ||
  path.join(process.cwd(), 'data', 'db.sqlite');

const MAILBOXES = [
  'michael@myentprod.com',
  'hhansen@myentprod.com',
  'jtownley@myentprod.com',
  'kmiles@myentprod.com',
];

const BUYER_DOMAINS = [
  'netflix.com', 'hulu.com', 'amazon.com', 'apple.com',
  'nbcuni.com', 'wbd.com', 'hbo.com', 'max.com', 'fox.com', 'paramount.com',
  'aenetworks.com', 'amc.com', 'amcnetworks.com', 'showtime.com', 'starz.com',
  'mgm.com', 'discovery.com', 'scripps.com', 'peacocktv.com', 'paramountplus.com',
  'disneystreaming.com', 'bravo.com', 'oxygen.com', 'lifetime.com',
  'sonypictures.com', 'lionsgate.com', 'a24films.com',
  'bbc.co.uk', 'bbc.com', 'channel4.com', 'itv.com', 'skystudios.com',
];

const DELAY_MS = 260; // ~3.8 req/sec — safely under 250 QPM

// Progress file — tracks which message IDs we've already stored
const PROGRESS_FILE = path.join(process.cwd(), 'data', 'backfill-progress.json');

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getAuth(mailbox: string) {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: mailbox,
  });
}

function decodeBody(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function extractBody(payload: any): string {
  const parts = payload?.parts ?? [];
  const textPart = parts.find((p: any) => p.mimeType === 'text/plain');
  const htmlPart = parts.find((p: any) => p.mimeType === 'text/html');
  if (textPart?.body?.data) return decodeBody(textPart.body.data);
  if (htmlPart?.body?.data) {
    return convert(decodeBody(htmlPart.body.data), {
      wordwrap: false,
      selectors: [{ selector: 'a', options: { ignoreHref: true } }],
    });
  }
  if (payload?.body?.data) {
    const raw = decodeBody(payload.body.data);
    return raw.includes('<html') ? convert(raw, { wordwrap: false }) : raw;
  }
  return '';
}

function loadProgress(): Set<string> {
  if (fs.existsSync(PROGRESS_FILE)) {
    try { return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))); } catch {}
  }
  return new Set();
}

function saveProgress(done: Set<string>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
}

async function main() {
  const db = new DatabaseSync(DB_PATH);

  // Load pitch_exclude emails from DB to build -from: exclusion clauses
  const excluded = db.prepare(
    "SELECT email FROM buyer_contacts WHERE pitch_exclude = 1 AND email IS NOT NULL AND email != ''"
  ).all() as { email: string }[];
  const exclusionClause = excluded.map(r => `-from:${r.email}`).join(' ');
  console.log(`Loaded ${excluded.length} excluded contacts from DB`);

  const domainFilter = `(${BUYER_DOMAINS.map(d => `from:${d}`).join(' OR ')})`;
  const q = [domainFilter, exclusionClause].filter(Boolean).join(' ');

  // Load existing thread IDs from package_emails for cross-mailbox dedup
  const existingThreads = new Set(
    (db.prepare('SELECT DISTINCT gmail_thread_id FROM package_emails WHERE gmail_thread_id IS NOT NULL').all() as { gmail_thread_id: string }[])
      .map(r => r.gmail_thread_id)
  );
  console.log(`${existingThreads.size} threads already in package_emails`);

  const doneIds = loadProgress();
  console.log(`${doneIds.size} message IDs already processed (resuming)\n`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO package_emails
      (id, package_id, gmail_thread_id, subject, sender, received_at,
       grok_signal, grok_raw, stage_moved_to, processed_at)
    VALUES (?, NULL, ?, ?, ?, ?, 'pending', NULL, NULL, ?)
  `);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const mailbox of MAILBOXES) {
    console.log(`\n=== ${mailbox} ===`);
    const gmail = google.gmail({ version: 'v1', auth: getAuth(mailbox) });

    // Phase 1: collect all matching message IDs
    const allIds: string[] = [];
    let pageToken: string | undefined;
    do {
      await sleep(DELAY_MS);
      const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500, pageToken });
      const msgs = res.data.messages ?? [];
      for (const m of msgs) {
        if (m.id && !doneIds.has(m.id)) allIds.push(m.id);
      }
      pageToken = res.data.nextPageToken ?? undefined;
      process.stdout.write(`  collecting: ${allIds.length} new IDs\r`);
    } while (pageToken);

    console.log(`\n  ${allIds.length} new messages to fetch`);

    // Phase 2: fetch full message and insert
    let mailboxInserted = 0;
    for (let i = 0; i < allIds.length; i++) {
      const msgId = allIds[i];
      await sleep(DELAY_MS);

      try {
        const res = await gmail.users.messages.get({ userId: 'me', id: msgId, format: 'full' });
        const msg = res.data;
        const headers = msg.payload?.headers ?? [];
        const get = (name: string) =>
          headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

        const threadId = msg.threadId ?? '';
        const subject = get('subject');
        const sender = get('from');
        const receivedAt = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();

        // Skip threads already in package_emails (cross-mailbox dedup)
        if (!existingThreads.has(threadId)) {
          insert.run(uuidv4(), threadId, subject, sender, receivedAt, Date.now());
          existingThreads.add(threadId);
          mailboxInserted++;
          totalInserted++;
        } else {
          totalSkipped++;
        }

        doneIds.add(msgId);

        if ((i + 1) % 100 === 0) {
          saveProgress(doneIds);
          const eta = Math.round(((allIds.length - i - 1) * DELAY_MS) / 60000);
          process.stdout.write(`  ${i + 1}/${allIds.length} — ~${eta}min remaining — ${mailboxInserted} inserted\r`);
        }
      } catch (err: any) {
        console.warn(`\n  warn: ${msgId} — ${err?.message ?? err}`);
        await sleep(2000);
      }
    }

    saveProgress(doneIds);
    console.log(`\n  done: ${mailboxInserted} new threads inserted for ${mailbox}`);
  }

  console.log('\n=== BACKFILL COMPLETE ===');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped (cross-mailbox dupes): ${totalSkipped}`);
  const finalCount = (db.prepare('SELECT COUNT(*) as c FROM package_emails').get() as any).c;
  console.log(`Total in package_emails: ${finalCount}`);

  db.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
