// Deduplicate buyer_contacts — keep the oldest row per email, delete newer duplicates.
// Contacts with no email are deduped by name+company_id.
import { DatabaseSync } from 'node:sqlite';
process.removeAllListeners('warning');

const db = new DatabaseSync('data/db.sqlite');
db.exec('PRAGMA foreign_keys = OFF');

// ── Dedup by email (non-null) ──────────────────────────────────────────────────
const dupEmails = db.prepare(`
  SELECT LOWER(email) as em, COUNT(*) as cnt
  FROM buyer_contacts
  WHERE email IS NOT NULL AND email != ''
  GROUP BY LOWER(email)
  HAVING cnt > 1
`).all();

let deleted = 0;
for (const { em } of dupEmails) {
  // Keep the row with the lowest rowid (first inserted)
  const rows = db.prepare(
    `SELECT id FROM buyer_contacts WHERE LOWER(email) = ? ORDER BY rowid ASC`
  ).all(em);
  const [keep, ...remove] = rows;
  for (const r of remove) {
    db.prepare('DELETE FROM buyer_contacts WHERE id = ?').run(r.id);
    deleted++;
  }
}

// ── Dedup by name + company (no email) ────────────────────────────────────────
const dupNames = db.prepare(`
  SELECT LOWER(name) as nm, COALESCE(company_id,'') as cid, COUNT(*) as cnt
  FROM buyer_contacts
  WHERE email IS NULL OR email = ''
  GROUP BY LOWER(name), COALESCE(company_id,'')
  HAVING cnt > 1
`).all();

for (const { nm, cid } of dupNames) {
  const rows = db.prepare(
    `SELECT id FROM buyer_contacts WHERE LOWER(name) = ? AND COALESCE(company_id,'') = ? ORDER BY rowid ASC`
  ).all(nm, cid);
  const [, ...remove] = rows;
  for (const r of remove) {
    db.prepare('DELETE FROM buyer_contacts WHERE id = ?').run(r.id);
    deleted++;
  }
}

// ── Add unique index to prevent future duplicates ──────────────────────────────
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bc_email ON buyer_contacts(LOWER(email)) WHERE email IS NOT NULL AND email != ''`);

db.exec('PRAGMA foreign_keys = ON');

const total = db.prepare('SELECT COUNT(*) as n FROM buyer_contacts').get();
console.log(`Deleted ${deleted} duplicate contacts. Remaining: ${total.n}`);
