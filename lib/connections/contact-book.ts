// Look a lead up in buyer_contacts — My Entertainment's own curated contact
// book — before deciding Apollo's miss means "uncontactable".
//
// WHY: buyer_contacts holds 232 people and 181 email addresses that someone
// deliberately researched and recorded. connection_leads already fuzzy-matches
// against this table for the "probably known" signal (matched_contact_id), but
// it never READ the address it found — so a lead could sit on screen as "none
// found" while their address was two tables away. That is the cheapest, most
// trustworthy contact source available: no API call, no credit, no guess.

import { query } from '@/lib/db';

export interface ContactBookHit {
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
  /** The buyer_contacts row that matched, for provenance. */
  contact_id: string;
  matched_name: string;
}

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Same-person test, deliberately stricter than the fuzzy score used for the
 * "probably known" chip.
 *
 * That chip being slightly wrong is cosmetic; borrowing the WRONG person's
 * email address sends Shawn's outreach to a stranger under their name. So this
 * requires an exact surname match AND either an identical first name or a
 * 5-character shared first-name prefix — the same rule (and the same reasoning)
 * as the duplicate-collapsing in build.ts.
 */
function isSamePerson(a: string, b: string): boolean {
  const A = normalize(a).split(' ').filter(Boolean);
  const B = normalize(b).split(' ').filter(Boolean);
  if (A.length < 2 || B.length < 2) return false; // need a surname on both sides
  if (A[A.length - 1] !== B[B.length - 1]) return false;
  if (A[0] === B[0]) return true;
  let i = 0;
  while (i < A[0].length && i < B[0].length && A[0][i] === B[0][i]) i++;
  return i >= 5;
}

/**
 * Find `name` in the contact book. Returns null when there is no confident
 * match, or when the matched row carries neither an address nor a profile
 * (nothing to gain, and claiming a match would misreport provenance).
 */
export async function lookupContactBook(name: string): Promise<ContactBookHit | null> {
  const trimmed = (name ?? '').trim();
  if (trimmed.length < 3) return null;

  const rows = await query<ContactRow>(
    `SELECT id, name, email, linkedin_url, title
       FROM buyer_contacts
      WHERE name IS NOT NULL
        AND (email IS NOT NULL AND email <> '' OR linkedin_url IS NOT NULL AND linkedin_url <> '')`
  );

  for (const r of rows) {
    if (!r.name || !isSamePerson(trimmed, r.name)) continue;
    const email = r.email?.trim() || null;
    const linkedin_url = r.linkedin_url?.trim() || null;
    if (!email && !linkedin_url) continue;
    return { email, linkedin_url, title: r.title ?? null, contact_id: r.id, matched_name: r.name };
  }
  return null;
}
