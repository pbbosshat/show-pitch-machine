// Reads data/deck-match-results.json and applies high-confidence deck_id links
// to package_emails. Run on Bang via SSH from match-emails-to-decks.ts.

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');

const db      = new DatabaseSync('data/db.sqlite');
const results = JSON.parse(fs.readFileSync('data/deck-match-results.json', 'utf-8'));

// Only auto-apply high-confidence matches — medium/low go to manual review in the UI
const toApply = results.filter(r => r.matched_deck_id && r.confidence === 'high');

const stmt = db.prepare(
  "UPDATE package_emails SET deck_id = ?, attachment_source = 'auto' WHERE id = ? AND deck_id IS NULL"
);

let applied = 0;
for (const r of toApply) {
  const res = stmt.run(r.matched_deck_id, r.email_id);
  if (res.changes) applied++;
}

console.log(`Applied ${applied} high-confidence deck matches`);

// Summary: how many emails are now linked per deck
const counts = db.prepare(`
  SELECT ds.title, COUNT(*) AS c
  FROM package_emails pe
  JOIN deck_sites ds ON ds.id = pe.deck_id
  GROUP BY pe.deck_id
  ORDER BY c DESC
`).all();
console.log(JSON.stringify(counts));

db.close();
