import { DatabaseSync } from 'node:sqlite';
process.removeAllListeners('warning');

const db = new DatabaseSync('data/db.sqlite');

console.log('=== BUYER SECTION AUDIT ===\n');

// Core table counts
const tables = [
  ['buyer_companies', 'Buyer Companies'],
  ['buyer_contacts', 'Buyer Contacts'],
  ['mandate_updates', 'Mandate Updates'],
  ['market_orders', 'Market Orders'],
  ['buyer_employer_history', 'Employer History'],
  ['production_companies', 'Production Companies'],
  ['deals', 'Deals'],
  ['pitches', 'Pitches'],
  ['ip_catalog', 'IP Catalog'],
  ['talent', 'Talent'],
  ['content_partners', 'Content Partners'],
  ['shows', 'Shows (comps)'],
  ['project_email_threads', 'Email Threads'],
];

for (const [t, label] of tables) {
  try {
    const r = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get();
    console.log(`  ${label.padEnd(25)} ${r.n} rows`);
  } catch { console.log(`  ${label.padEnd(25)} MISSING`); }
}

// Activity breakdown
console.log('\n--- Buyer Contact Activity Status ---');
const status = db.prepare(`SELECT activity_status, COUNT(*) as n FROM buyer_contacts GROUP BY activity_status ORDER BY n DESC`).all();
for (const s of status) console.log(`  ${(s.activity_status || 'null').padEnd(12)} ${s.n}`);

// Region breakdown
console.log('\n--- Buyer Contacts by Region ---');
const regions = db.prepare(`SELECT COALESCE(region,'us') as region, COUNT(*) as n FROM buyer_contacts GROUP BY region ORDER BY n DESC`).all();
for (const r of regions) console.log(`  ${r.region.padEnd(12)} ${r.n}`);

// Companies by tier
console.log('\n--- Buyer Companies by Tier ---');
const tiers = db.prepare(`SELECT tier, type, COUNT(*) as n FROM buyer_companies GROUP BY tier, type ORDER BY tier, n DESC`).all();
for (const t of tiers) console.log(`  Tier ${t.tier} ${(t.type||'?').padEnd(10)} ${t.n}`);

// Contacts with email
const withEmail = db.prepare(`SELECT COUNT(*) as n FROM buyer_contacts WHERE email IS NOT NULL AND email != ''`).get();
const withTitle = db.prepare(`SELECT COUNT(*) as n FROM buyer_contacts WHERE title IS NOT NULL AND title != ''`).get();
const withMandate = db.prepare(`SELECT COUNT(*) as n FROM buyer_contacts WHERE mandate_statement IS NOT NULL AND mandate_statement != ''`).get();
console.log(`\n--- Contact Data Completeness ---`);
console.log(`  Has email:    ${withEmail.n}`);
console.log(`  Has title:    ${withTitle.n}`);
console.log(`  Has mandate:  ${withMandate.n}`);

// Sample active buyer contacts
console.log('\n--- Sample Buyer Contacts (first 15) ---');
const contacts = db.prepare(`
  SELECT bc.name, bc.title, bc.email, bc.activity_status, bco.name as company
  FROM buyer_contacts bc
  LEFT JOIN buyer_companies bco ON bc.company_id = bco.id
  ORDER BY bc.activity_status DESC, bc.rowid ASC
  LIMIT 15
`).all();
for (const c of contacts) {
  console.log(`  ${(c.name||'?').padEnd(25)} | ${(c.title||'').padEnd(30)} | ${c.company||''}`);
}

// Pitches by outcome
console.log('\n--- Pitches by Outcome ---');
const outcomes = db.prepare(`SELECT outcome, COUNT(*) as n FROM pitches GROUP BY outcome ORDER BY n DESC`).all();
for (const o of outcomes) console.log(`  ${(o.outcome||'?').padEnd(15)} ${o.n}`);

// Production companies with networks
console.log('\n--- Top Production Companies (by current_networks filled) ---');
const prodcos = db.prepare(`
  SELECT name, country, ownership_type, current_networks
  FROM production_companies
  WHERE current_networks IS NOT NULL AND current_networks != ''
  LIMIT 10
`).all();
for (const p of prodcos) console.log(`  ${(p.name||'').padEnd(35)} | ${p.country} | ${(p.current_networks||'').substring(0,40)}`);

console.log('\n=== AUDIT COMPLETE ===');
