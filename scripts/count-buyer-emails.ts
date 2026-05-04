// Counts total buyer emails across all myentprod.com mailboxes by paginating
// the Gmail API (no maxResults cap). Does NOT download message bodies.

import { google } from 'googleapis';
import fs from 'node:fs';

const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
  'C:/Users/bang/show-pitch-machine/data/service_account.json';

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
  'admin@myentprod.com',
  'jtownley@myentprod.com',
  'kmiles@myentprod.com',
];

async function countMailbox(mailbox: string): Promise<number> {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: mailbox,
  });
  const gmail = google.gmail({ version: 'v1', auth });

  let total = 0;
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: QUERY,
      maxResults: 500,
      pageToken,
    });
    total += res.data.messages?.length ?? 0;
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return total;
}

async function main() {
  let grandTotal = 0;
  for (const mailbox of MAILBOXES) {
    try {
      const count = await countMailbox(mailbox);
      console.log(`  ${mailbox}: ${count}`);
      grandTotal += count;
    } catch (err) {
      console.warn(`  ${mailbox}: ERROR — ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`\nTotal (with cross-mailbox duplicates): ${grandTotal}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
