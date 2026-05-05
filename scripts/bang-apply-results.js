// Reads classify-results.json and applies grok_signal updates to package_emails. Run on Bang.
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const db = new DatabaseSync('data/db.sqlite');
const results = JSON.parse(fs.readFileSync('data/classify-results.json', 'utf-8'));
const stmt = db.prepare(
  "UPDATE package_emails SET grok_signal = ?, grok_raw = ?, processed_at = ? WHERE gmail_thread_id = ? AND grok_signal = 'pending'"
);
let updated = 0;
for (const [threadId, r] of Object.entries(results)) {
  const res = stmt.run(r.signal, JSON.stringify(r), Date.now(), threadId);
  if (res.changes) updated++;
}
console.log('updated ' + updated + ' rows');
const counts = db.prepare(
  'SELECT grok_signal, COUNT(*) as c FROM package_emails GROUP BY grok_signal ORDER BY c DESC'
).all();
console.log(JSON.stringify(counts));
db.close();
