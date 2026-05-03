// MCP tool handlers for buyer intelligence queries.
// These return structured data for Claude to synthesize into pitch briefings —
// the MCP server never calls an LLM; it just shapes SQLite data for the caller.

import { query, queryOne } from '../../db';
import type { BuyerContact, BuyerCompany, MandateUpdate, Pitch } from '../../../types';

// Active buyers sorted by recency of greenlit — the most actionable targets first
export function getActiveBuyers(): BuyerContact[] {
  return query<BuyerContact>(
    `SELECT bc.*
     FROM buyer_contacts bc
     WHERE bc.activity_status = 'active'
     ORDER BY bc.last_greenlit_date DESC NULLS LAST, bc.mye_pitch_count DESC`
  );
}

// Full buyer profile: contact record + company + mandate history + recent greenlits + pitch history
export function getBuyerProfile(contactId: string): {
  contact: BuyerContact | undefined;
  company: BuyerCompany | undefined;
  mandateHistory: MandateUpdate[];
  recentPitches: Pitch[];
} {
  const contact = queryOne<BuyerContact>(
    'SELECT * FROM buyer_contacts WHERE id = ?',
    [contactId]
  );

  const company = contact?.company_id
    ? queryOne<BuyerCompany>('SELECT * FROM buyer_companies WHERE id = ?', [contact.company_id])
    : undefined;

  // Return mandate history most-recent-first so Claude sees the current mandate at the top
  const mandateHistory = query<MandateUpdate>(
    `SELECT * FROM mandate_updates
     WHERE contact_id = ?
     ORDER BY stated_date DESC NULLS LAST, scraped_at DESC`,
    [contactId]
  );

  // Last 20 MYE pitches to this contact — enough context without overwhelming the LLM
  const recentPitches = query<Pitch>(
    `SELECT p.*, ic.title AS ip_title
     FROM pitches p
     LEFT JOIN ip_catalog ic ON ic.id = p.ip_id
     WHERE p.buyer_contact_id = ?
     ORDER BY p.pitch_date DESC NULLS LAST
     LIMIT 20`,
    [contactId]
  );

  return { contact, company, mandateHistory, recentPitches };
}

// Structured briefing snapshot — optimized shape for "who should we pitch this week" queries
export function getBuyerIntelligence(contactId: string): {
  contact: BuyerContact | undefined;
  companyName: string | null;
  currentMandate: string | null;
  lastMandateDate: number | null;
  recentGreenlits: Array<{ title: string; outcome: string; pitch_date: number | null }>;
  passPatterns: string[];
  daysSinceLastContact: number | null;
} {
  const contact = queryOne<BuyerContact>(
    'SELECT * FROM buyer_contacts WHERE id = ?',
    [contactId]
  );

  const companyName = contact?.company_id
    ? (queryOne<{ name: string }>('SELECT name FROM buyer_companies WHERE id = ?', [contact.company_id])?.name ?? null)
    : null;

  // Most recent mandate statement — what the buyer is actively looking for right now
  const latestMandate = queryOne<MandateUpdate>(
    `SELECT * FROM mandate_updates
     WHERE contact_id = ?
     ORDER BY stated_date DESC NULLS LAST, scraped_at DESC
     LIMIT 1`,
    [contactId]
  );

  // Greenlits = evidence of what actually gets bought; more predictive than stated mandate
  const recentGreenlits = query<{ title: string; outcome: string; pitch_date: number | null }>(
    `SELECT ic.title, p.outcome, p.pitch_date
     FROM pitches p
     LEFT JOIN ip_catalog ic ON ic.id = p.ip_id
     WHERE p.buyer_contact_id = ?
       AND p.outcome IN ('greenlit', 'in-production', 'meeting')
     ORDER BY p.pitch_date DESC
     LIMIT 5`,
    [contactId]
  );

  // Collect distinct pass reason categories to surface buyer blind spots
  const passRows = query<{ pass_reason_cat: string }>(
    `SELECT DISTINCT pass_reason_cat
     FROM pitches
     WHERE buyer_contact_id = ?
       AND outcome = 'pass'
       AND pass_reason_cat IS NOT NULL`,
    [contactId]
  );
  const passPatterns = passRows.map((r) => r.pass_reason_cat);

  const daysSinceLastContact = contact?.last_mye_contact_date
    ? Math.floor((Date.now() - contact.last_mye_contact_date) / 86400000)
    : null;

  return {
    contact,
    companyName,
    currentMandate: latestMandate?.statement ?? contact?.mandate_statement ?? null,
    lastMandateDate: latestMandate?.stated_date ?? contact?.mandate_date ?? null,
    recentGreenlits,
    passPatterns,
    daysSinceLastContact,
  };
}
