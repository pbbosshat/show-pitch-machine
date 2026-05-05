// For each top sender, fetches the 10 most recent email subjects across myentprod.com mailboxes.
// Output: data/sender-subjects.json — used to manually/automatically classify production vs. pitch.

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';

const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
  'C:/Users/pb/.claude/google/service_account.json';

const MAILBOXES = [
  'michael@myentprod.com',
  'jtownley@myentprod.com',
];

// Top senders by volume — excludes automated/no-reply addresses
const TOP_SENDERS = [
  'daniel_schwartz@discovery.com',
  'matthew_butler@discovery.com',
  'christine_shuler@discovery.com',
  'nicole_hughes@discovery.com',
  'michael_sorensen@discovery.com',
  'brittinee.royes@nbcuni.com',
  'winona_meringolo@discovery.com',
  'eric_esteva@discovery.com',
  'jeanie_vink@discovery.com',
  'jon_stephens@discovery.com',
  'kathryn_stafford@discovery.com',
  'cori.abraham@nbcuni.com',
  'fred.grinstein@aenetworks.com',
  'nicole.vogel@aenetworks.com',
  'anna_geddes@discovery.com',
  'jodi_tovay@discovery.com',
  'vaibhav_bhatt@discovery.com',
  'christine.shuler@wbd.com',
  'bj.levin@nbcuni.com',
  'jessica_lowther@discovery.com',
  'angela_freedman@discovery.com',
  'jane_latman@discovery.com',
  'michelle_manassah@discovery.com',
  'charlotte_fletcher@discovery.com',
  'todd_weiser@discovery.com',
  'rob_shaftel@discovery.com',
  'elaine_foster@discovery.com',
  'marc_etkind@discovery.com',
  'maddie.hausberg@nbcuni.com',
  'madison_slate@discovery.com',
  'wayne.sampson@nbcuni.com',
  'jim_kowats@discovery.com',
  'michael.kane@nbcuni.com',
  'jim.pasquarella@aenetworks.com',
  'shanon.smith@nbcuni.com',
  'nicole.hughes@wbd.com',
  'kate.watts@nbcuni.com',
  'abbie_burden@discovery.com',
  'laura.welch@aenetworks.com',
  'julie_meisnereagle@discovery.com',
  'amber_husbands@discovery.com',
  'camille.halliwell@wbd.com',
  'rachel_brenner@discovery.com',
  'coleman.o\'brien@fox.com',
  'victoria_noble@discovery.com',
];

const SAMPLES_PER_SENDER = 12;
const DELAY_MS = 300;

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

interface SenderSample {
  email: string;
  totalCount: number;
  subjects: string[];
  snippets: string[];
}

async function sampleSender(email: string): Promise<SenderSample> {
  const subjects = new Set<string>();
  const snippets: string[] = [];

  for (const mailbox of MAILBOXES) {
    if (subjects.size >= SAMPLES_PER_SENDER) break;
    try {
      const gmail = google.gmail({ version: 'v1', auth: getAuth(mailbox) });
      await sleep(DELAY_MS);
      const listRes = await gmail.users.messages.list({
        userId: 'me',
        q: `from:${email}`,
        maxResults: 10,
      });
      const msgs = listRes.data.messages ?? [];
      for (const m of msgs) {
        if (!m.id || subjects.size >= SAMPLES_PER_SENDER) break;
        await sleep(DELAY_MS);
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: m.id,
          format: 'metadata',
          metadataHeaders: ['Subject'],
        });
        const subj = full.data.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value ?? '(no subject)';
        const snippet = full.data.snippet ?? '';
        subjects.add(subj);
        if (snippets.length < SAMPLES_PER_SENDER) snippets.push(snippet.slice(0, 200));
      }
    } catch (err: any) {
      // mailbox not accessible — skip
    }
  }

  return {
    email,
    totalCount: 0, // filled from sender-rank.json
    subjects: [...subjects],
    snippets,
  };
}

async function main() {
  // Load counts from sender-rank.json if it exists locally
  const rankPath = path.join(process.cwd(), 'data', 'sender-rank.json');
  let countMap: Record<string, number> = {};
  if (fs.existsSync(rankPath)) {
    try {
      const rank = JSON.parse(fs.readFileSync(rankPath, 'utf-8'));
      for (const [email, data] of Object.entries(rank.senders as Record<string, any>)) {
        countMap[email] = data.count;
      }
    } catch {}
  }

  const outPath = path.join(process.cwd(), 'data', 'sender-subjects.json');
  const results: SenderSample[] = [];

  for (const senderEmail of TOP_SENDERS) {
    process.stdout.write(`  sampling ${senderEmail}...\r`);
    const sample = await sampleSender(senderEmail);
    sample.totalCount = countMap[senderEmail] ?? 0;
    results.push(sample);
    console.log(`  done: ${senderEmail} (${sample.subjects.length} subjects)`);
  }

  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outPath}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
