/**
 * assign-buyer-companies.mjs
 *
 * Bulk-assigns buyer_contacts.company_id for all buyers where company_id IS NULL.
 *
 * Strategy: email domain matching.
 *   1. Build a domain→company_id map from buyers who ARE already matched (ground truth).
 *   2. Add manual overrides for known near-miss domains (typos, sub-brands, aliases).
 *   3. For each unmatched buyer with an email, extract the domain and look up the map.
 *   4. Update matched rows; report skipped (no email) and unresolved domains.
 *
 * Run: node scripts/assign-buyer-companies.mjs
 */

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'db.sqlite');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

console.log('=== Buyer → Company Assignment (email domain matching) ===\n');

// ── Step 1: Build domain→company_id ground-truth map from already-matched buyers ──
const matchedBuyers = db.prepare(
  "SELECT email, company_id FROM buyer_contacts WHERE company_id IS NOT NULL AND email IS NOT NULL AND email LIKE '%@%'"
).all();

const domainMap = {};
for (const row of matchedBuyers) {
  const domain = row.email.split('@')[1].toLowerCase();
  if (!domainMap[domain]) domainMap[domain] = row.company_id;
}
console.log(`Built ${Object.keys(domainMap).length} domain→company mappings from existing matched buyers.\n`);

// ── Step 2: Manual overrides for near-miss domains ──
// amazonstudios.com is Amazon's content studio arm — same buyer_companies entry as amazon.com
if (domainMap['amazon.com']) domainMap['amazonstudios.com'] = domainMap['amazon.com'];
// aegm.com = A+E Global Media (international arm of A+E Networks)
domainMap['aegm.com'] = '1698d65b-8327-4e62-8524-f5fb535cab0e';
// bellbedia.ca is a data-entry typo for bellmedia.ca
if (domainMap['bellmedia.ca']) domainMap['bellbedia.ca'] = domainMap['bellmedia.ca'];
// channel4.co.uk = Channel 4 (UK)
domainMap['channel4.co.uk'] = 'ea1b5e1d-5039-4bb9-9c9c-778e2976686d';
// hallmarkmedia.com = Hallmark Channel
domainMap['hallmarkmedia.com'] = '86c8d9c5-5799-47e7-b173-c61cbaa03ce1';
// nbcui.com is a typo for nbcuni.com
if (domainMap['nbcuni.com']) domainMap['nbcui.com'] = domainMap['nbcuni.com'];
// rci.rogers.co is a typo for rci.rogers.com (CityTV)
if (domainMap['rci.rogers.com']) domainMap['rci.rogers.co'] = domainMap['rci.rogers.com'];

// ── Step 3: Get all unmatched buyers ──
const unmatched = db.prepare(
  "SELECT id, name, email FROM buyer_contacts WHERE company_id IS NULL ORDER BY name"
).all();

const beforeCount = db.prepare(
  "SELECT COUNT(*) as n FROM buyer_contacts WHERE company_id IS NOT NULL"
).get().n;

console.log(`Buyers with no company_id: ${unmatched.length}`);
console.log(`Company_id already assigned (before): ${beforeCount}\n`);

const updateStmt = db.prepare("UPDATE buyer_contacts SET company_id = ? WHERE id = ?");
const getCompanyName = db.prepare("SELECT name FROM buyer_companies WHERE id = ?");

let updated = 0, noEmail = 0, noMatch = 0;
const unresolvedDomains = new Set();

for (const buyer of unmatched) {
  if (!buyer.email || !buyer.email.includes('@')) {
    noEmail++;
    console.log(`  — ${buyer.name} — no email address`);
    continue;
  }

  const domain = buyer.email.split('@')[1].toLowerCase();
  const companyId = domainMap[domain];

  if (companyId) {
    updateStmt.run(companyId, buyer.id);
    updated++;
    const co = getCompanyName.get(companyId);
    console.log(`  ✓ ${buyer.name} (${buyer.email}) → ${co?.name ?? companyId}`);
  } else {
    noMatch++;
    unresolvedDomains.add(domain);
    console.log(`  ✗ ${buyer.name} (${buyer.email}) — domain @${domain} not in map`);
  }
}

const afterCount = db.prepare(
  "SELECT COUNT(*) as n FROM buyer_contacts WHERE company_id IS NOT NULL"
).get().n;

console.log(`\n--- Summary ---`);
console.log(`Updated:  ${updated}`);
console.log(`No email: ${noEmail}`);
console.log(`No match: ${noMatch}`);
if (unresolvedDomains.size > 0) {
  console.log(`Unresolved domains: ${[...unresolvedDomains].join(', ')}`);
}
console.log(`\nCompany_id assigned before: ${beforeCount}`);
console.log(`Company_id assigned after:  ${afterCount}`);
console.log(`Net new assignments:        ${afterCount - beforeCount}`);
