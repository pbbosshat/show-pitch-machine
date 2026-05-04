// Enrich buyer_contacts: promote coverage_notes → title where title is null.
// The Google Sheet "Phone" column contains mandate/role text like
// "Head of Documentary Features" — stored in coverage_notes during import.
// Also classify buyer_companies that have null type/tier.
import { DatabaseSync } from 'node:sqlite';
process.removeAllListeners('warning');

const db = new DatabaseSync('data/db.sqlite');

// ── Promote coverage_notes → title ────────────────────────────────────────────
// Only promote when: title is empty AND coverage_notes looks like a role
// (under 120 chars and not a URL or phone number)
const promoted = db.prepare(`
  UPDATE buyer_contacts
  SET title = coverage_notes
  WHERE (title IS NULL OR title = '')
    AND coverage_notes IS NOT NULL
    AND coverage_notes != ''
    AND LENGTH(coverage_notes) < 120
    AND coverage_notes NOT LIKE '%http%'
    AND coverage_notes NOT GLOB '*[0-9][0-9][0-9]-[0-9][0-9][0-9]*'
`).run();
console.log(`Promoted coverage_notes → title for ${promoted.changes} contacts`);

// ── Classify buyer companies with null type/tier ──────────────────────────────
// Use the company name to infer type and tier
const companies = db.prepare(`
  SELECT id, name FROM buyer_companies WHERE type IS NULL OR tier IS NULL
`).all();

const streamers = /netflix|prime video|hulu|disney\+|apple\s*tv|peacock|max\b|paramount\+|tubi|pluto|freevee|roku|discovery\+/i;
const majors    = /hbo|wbd|warner|discovery|a\+e|aenetwork|a&e|lifetime|history|national geo|bravo|oxygen|investigation|id\b/i;
const networks  = /nbc|cbs|abc|fox|cnn|msnbc|pbs|cw\b/i;
const cable     = /hallmark|bet|vh1|mtv|comedy central|cartoon|nickelodeon|syfy|usa\s*net|fyi|reelz|amc\b|ifc|sundance/i;
const intl      = /bbc|channel 4|itv|sky|channel5|w network|cbc|ctv|tvone|seven|abc australia|nine|ten\b|stan\b|sbs\b/i;

let classified = 0;
for (const co of companies) {
  const n = co.name;
  let type = 'mid';
  let tier = 'B';

  if (streamers.test(n))     { type = 'streamer'; tier = 'A'; }
  else if (majors.test(n))   { type = 'major';    tier = 'A'; }
  else if (networks.test(n)) { type = 'network';  tier = 'A'; }
  else if (cable.test(n))    { type = 'cable';    tier = 'B'; }
  else if (intl.test(n))     { type = 'international'; tier = 'B'; }

  db.prepare(`UPDATE buyer_companies SET type = ?, tier = ?, updated_at = ? WHERE id = ?`)
    .run(type, tier, Date.now(), co.id);
  classified++;
}
console.log(`Classified ${classified} buyer companies`);

// ── Final counts ──────────────────────────────────────────────────────────────
const withTitle   = db.prepare(`SELECT COUNT(*) as n FROM buyer_contacts WHERE title IS NOT NULL AND title != ''`).get();
const withEmail   = db.prepare(`SELECT COUNT(*) as n FROM buyer_contacts WHERE email IS NOT NULL AND email != ''`).get();
const totalBuyers = db.prepare(`SELECT COUNT(*) as n FROM buyer_contacts`).get();

console.log(`\nBuyer contacts: ${totalBuyers.n} total | ${withEmail.n} with email | ${withTitle.n} with title`);

const tierA = db.prepare(`SELECT COUNT(*) as n FROM buyer_companies WHERE tier = 'A'`).get();
const tierB = db.prepare(`SELECT COUNT(*) as n FROM buyer_companies WHERE tier = 'B'`).get();
console.log(`Buyer companies: ${tierA.n} Tier A | ${tierB.n} Tier B`);

// Sample contacts with titles now
console.log('\nSample contacts with titles:');
const sample = db.prepare(`
  SELECT bc.name, bc.title, bco.name as company
  FROM buyer_contacts bc
  LEFT JOIN buyer_companies bco ON bc.company_id = bco.id
  WHERE bc.title IS NOT NULL AND bc.title != ''
  LIMIT 15
`).all();
for (const c of sample) console.log(`  ${(c.name||'').padEnd(28)} | ${(c.title||'').substring(0,40).padEnd(40)} | ${c.company||''}`);
