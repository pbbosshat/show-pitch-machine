import { google } from 'googleapis';
import fs from 'node:fs';

const key = JSON.parse(fs.readFileSync('C:/Users/pb/.claude/google/service_account.json', 'utf-8'));

const auth = new google.auth.JWT({
  email: key.client_email,
  key: key.private_key,
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  subject: 'sm@gototeam.com',
});

const gmail = google.gmail({ version: 'v1', auth });

try {
  const profile = await gmail.users.getProfile({ userId: 'me' });
  console.log('SUCCESS:', JSON.stringify(profile.data));
} catch (err) {
  console.log('ERROR:', err.message);
  console.log('CODE:', err.code);
  console.log('STATUS:', err.status);
  if (err.response?.data) console.log('DATA:', JSON.stringify(err.response.data));
}

// List all labels
try {
  const labels = await gmail.users.labels.list({ userId: 'me' });
  console.log('\nALL LABELS:');
  for (const l of labels.data.labels ?? []) {
    console.log(`  ${l.id.padEnd(25)} ${l.name}`);
  }
} catch (err) {
  console.log('LABELS ERROR:', err.message);
}

// Check last 30 days with no label filter — any newsletters?
try {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const after = Math.floor(since.getTime() / 1000);
  const q = `(from:cynopsis OR from:deadline OR from:variety OR from:realscreen OR from:c21) after:${after}`;
  console.log('\nNewsletter search (no label):', q);
  const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 });
  console.log('Messages found:', list.data.messages?.length ?? 0);
  if (list.data.messages?.length) {
    for (const m of list.data.messages.slice(0,5)) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
      const headers = msg.data.payload?.headers ?? [];
      const sub = headers.find(h => h.name === 'Subject')?.value;
      const from = headers.find(h => h.name === 'From')?.value;
      const date = headers.find(h => h.name === 'Date')?.value;
      console.log(`  [${date}] ${from?.slice(0,40)} | ${sub?.slice(0,60)}`);
    }
  }
} catch (err) {
  console.log('SEARCH ERROR:', err.message);
}
