// Dumps all pending package_emails as JSON to stdout. Run on Bang.
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/db.sqlite');
const rows = db.prepare(
  "SELECT gmail_thread_id, subject, sender, received_at FROM package_emails WHERE grok_signal = 'pending'"
).all();
process.stdout.write(JSON.stringify(rows));
db.close();
