import { DatabaseSync } from 'node:sqlite';

process.removeAllListeners('warning');

const db = new DatabaseSync('data/db.sqlite');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

try {
  db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS _test_fts USING fts5(x)');
  db.exec('DROP TABLE IF EXISTS _test_fts');
  console.log('FTS5: SUPPORTED');
} catch(e) {
  console.log('FTS5: NOT SUPPORTED -', e.message);
}

for (const t of ['buyer_companies','buyer_contacts','pitches','ip_catalog','shows','shows_fts','mandate_updates','market_orders','buyer_employer_history','production_companies','deals']) {
  try {
    const r = db.prepare('SELECT COUNT(*) as n FROM ' + t).get();
    console.log(t + ': ' + r.n + ' rows');
  } catch(e) {
    console.log(t + ': MISSING');
  }
}

// Sample buyer contacts
console.log('\nSample buyer contacts:');
const contacts = db.prepare('SELECT name, email, company_id, activity_status FROM buyer_contacts LIMIT 10').all();
for (const c of contacts) console.log(' -', c.name, '|', c.email, '|', c.activity_status);

// Sample companies
console.log('\nBuyer companies:');
const cos = db.prepare('SELECT name, type, tier FROM buyer_companies').all();
for (const c of cos) console.log(' -', c.name, '|', c.type, '|', c.tier);
