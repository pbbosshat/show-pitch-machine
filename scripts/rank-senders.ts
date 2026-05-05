// Ranks all buyer-domain email senders across myentprod.com mailboxes by frequency.
// Fetches only the From header (format=metadata) — no body download.
// Throttled to 4 req/sec per mailbox to stay under Gmail's 250 QPM quota.
// Saves results to data/sender-rank.json as it goes; can be killed and restarted
// (already-seen message IDs are skipped on resume).

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
  'C:/Users/bang/show-pitch-machine/data/service_account.json';

const RESULTS_FILE = path.join(process.cwd(), 'data', 'sender-rank.json');

const BUYER_DOMAINS = [
  'netflix.com', 'hulu.com', 'amazon.com', 'apple.com',
  'nbcuni.com', 'wbd.com', 'hbo.com', 'max.com', 'fox.com', 'paramount.com',
  'aenetworks.com', 'amc.com', 'amcnetworks.com', 'showtime.com', 'starz.com',
  'mgm.com', 'discovery.com', 'scripps.com', 'peacocktv.com', 'paramountplus.com',
  'disneystreaming.com', 'bravo.com', 'oxygen.com', 'lifetime.com',
  'sonypictures.com', 'lionsgate.com', 'a24films.com',
  'bbc.co.uk', 'bbc.com', 'channel4.com', 'itv.com', 'skystudios.com',
];

const QUERY = `(${BUYER_DOMAINS.map(d => `from:${d}`).join(' OR ')})`;

const MAILBOXES = [
  'michael@myentprod.com',
  'hhansen@myentprod.com',
  'jtownley@myentprod.com',
  'kmiles@myentprod.com',
];

const DELAY_MS = 250; // 4 req/sec — safely under 250 QPM

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

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/"/g, ''), email: match[2].toLowerCase().trim() };
  return { name: '', email: from.toLowerCase().trim() };
}

// Load or init results state
interface State {
  senders: Record<string, { name: string; count: number; mailboxes: string[] }>;
  seenIds: string[];
}

function loadState(): State {
  if (fs.existsSync(RESULTS_FILE)) {
    try { return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); } catch {}
  }
  return { senders: {}, seenIds: [] };
}

function saveState(state: State) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(state, null, 2));
}

async function rankSenders() {
  const state = loadState();
  const seenIds = new Set(state.seenIds);
  const senderMap = new Map(Object.entries(state.senders).map(([k, v]) => [k, { ...v, mailboxes: new Set(v.mailboxes) }]));

  if (seenIds.size > 0) console.log(`Resuming — ${seenIds.size} messages already processed`);

  for (const mailbox of MAILBOXES) {
    console.log(`\nScanning ${mailbox}...`);
    const gmail = google.gmail({ version: 'v1', auth: getAuth(mailbox) });

    // Phase 1: collect all message IDs (list calls — cheap)
    const allIds: string[] = [];
    let pageToken: string | undefined;
    do {
      await sleep(DELAY_MS);
      const listRes = await gmail.users.messages.list({ userId: 'me', q: QUERY, maxResults: 500, pageToken });
      const msgs = listRes.data.messages ?? [];
      for (const m of msgs) { if (m.id && !seenIds.has(m.id)) allIds.push(m.id); }
      pageToken = listRes.data.nextPageToken ?? undefined;
      process.stdout.write(`  collecting IDs: ${allIds.length} new (${seenIds.size} already done)\r`);
    } while (pageToken);

    console.log(`\n  ${allIds.length} new messages to fetch for ${mailbox}`);

    // Phase 2: fetch From header for each new ID, one at a time with throttle
    let done = 0;
    for (const msgId of allIds) {
      await sleep(DELAY_MS);
      try {
        const res = await gmail.users.messages.get({
          userId: 'me', id: msgId, format: 'metadata', metadataHeaders: ['From'],
        });
        const fromHeader = res.data.payload?.headers?.find(h => h.name?.toLowerCase() === 'from');
        if (fromHeader?.value) {
          const { name, email } = parseSender(fromHeader.value);
          const existing = senderMap.get(email);
          if (existing) {
            existing.count++;
            existing.mailboxes.add(mailbox);
            if (!existing.name && name) existing.name = name;
          } else {
            senderMap.set(email, { name, count: 1, mailboxes: new Set([mailbox]) });
          }
        }
        seenIds.add(msgId);
        done++;

        // Save progress every 100 messages
        if (done % 100 === 0) {
          const snap: State = {
            senders: Object.fromEntries([...senderMap.entries()].map(([k, v]) => [k, { ...v, mailboxes: [...v.mailboxes] }])),
            seenIds: [...seenIds],
          };
          saveState(snap);
          const eta = Math.round(((allIds.length - done) * DELAY_MS) / 60000);
          process.stdout.write(`  ${done}/${allIds.length} — ~${eta}min remaining\r`);
        }
      } catch (err: any) {
        console.warn(`\n  warn: ${msgId} — ${err?.message ?? err}`);
        await sleep(2000); // back off on any error
      }
    }
    console.log(`\n  done: ${done} fetched for ${mailbox}`);
  }

  // Final save + print
  const finalState: State = {
    senders: Object.fromEntries([...senderMap.entries()].map(([k, v]) => [k, { ...v, mailboxes: [...v.mailboxes] }])),
    seenIds: [...seenIds],
  };
  saveState(finalState);

  const sorted = [...senderMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 100);

  console.log('\n\n=== TOP SENDERS ACROSS ALL MYE MAILBOXES ===\n');
  console.log('Count  Email                                         Name                        [mailboxes]');
  console.log('-----  --------------------------------------------  --------------------------  -----------');
  for (const [email, { name, count, mailboxes }] of sorted) {
    const boxes = [...mailboxes].map(m => m.split('@')[0]).join(',');
    console.log(`${String(count).padStart(5)}  ${email.padEnd(46)}${name.substring(0, 26).padEnd(26)}  [${boxes}]`);
  }
  console.log(`\nTotal unique senders: ${senderMap.size}`);
  console.log(`Results saved to: ${RESULTS_FILE}`);
  process.exit(0);
}

rankSenders().catch(e => { console.error(e); process.exit(1); });
