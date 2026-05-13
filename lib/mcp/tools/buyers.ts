// MCP tool handlers for buyer intelligence queries.
// These return structured data for Claude to synthesize into pitch briefings —
// the MCP server never calls an LLM; it just shapes Postgres data for the caller.
//
// Phase 1B: made all functions async, added await to query/queryOne calls.

import { query, queryOne } from '../../db';
import type { BuyerContact, BuyerCompany, MandateUpdate, Pitch } from '../../../types';

/**
 * Return all active buyer contacts sorted by recency of greenlit — the most
 * actionable targets first.
 *
 * Caller: MCP tool 'get_active_buyers'
 * Auth: none
 */
export async function getActiveBuyers(): Promise<BuyerContact[]> {
  return query<BuyerContact>(
    `SELECT bc.*
     FROM buyer_contacts bc
     WHERE bc.activity_status = 'active'
     ORDER BY bc.last_greenlit_date DESC NULLS LAST, bc.mye_pitch_count DESC`
  );
}

/**
 * Return the full profile for a buyer contact: contact record, company, mandate
 * history (newest first), and the last 20 pitches.
 *
 * Caller: MCP tool 'get_buyer_profile'
 * Auth: none
 *
 * @param contactId  buyer_contacts.id
 */
export async function getBuyerProfile(contactId: string): Promise<{
  contact: BuyerContact | undefined;
  company: BuyerCompany | undefined;
  mandateHistory: MandateUpdate[];
  recentPitches: Pitch[];
}> {
  const contact = await queryOne<BuyerContact>(
    'SELECT * FROM buyer_contacts WHERE id = ?',
    [contactId]
  );

  // Company lookup is conditional — only run if contact has a company_id to avoid
  // unnecessary round-trips when the contact is independent
  const company = contact?.company_id
    ? await queryOne<BuyerCompany>('SELECT * FROM buyer_companies WHERE id = ?', [contact.company_id])
    : undefined;

  // Return mandate history most-recent-first so Claude sees the current mandate at the top
  const mandateHistory = await query<MandateUpdate>(
    `SELECT * FROM mandate_updates
     WHERE contact_id = ?
     ORDER BY stated_date DESC NULLS LAST, scraped_at DESC`,
    [contactId]
  );

  // Last 20 MYE pitches to this contact — enough context without overwhelming the LLM
  const recentPitches = await query<Pitch>(
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

/**
 * Return a structured intelligence snapshot for a buyer — optimized for the
 * "who should we pitch this week" and briefing-generation use cases.
 *
 * Caller: MCP tool 'get_buyer_intelligence'
 * Auth: none
 *
 * @param contactId  buyer_contacts.id
 */
export async function getBuyerIntelligence(contactId: string): Promise<{
  contact: BuyerContact | undefined;
  companyName: string | null;
  currentMandate: string | null;
  lastMandateDate: number | null;
  recentGreenlits: Array<{ title: string; outcome: string; pitch_date: number | null }>;
  passPatterns: string[];
  daysSinceLastContact: number | null;
}> {
  const contact = await queryOne<BuyerContact>(
    'SELECT * FROM buyer_contacts WHERE id = ?',
    [contactId]
  );

  // Company name for display — separate query keeps buyer_contacts small
  const companyName = contact?.company_id
    ? ((await queryOne<{ name: string }>('SELECT name FROM buyer_companies WHERE id = ?', [contact.company_id]))?.name ?? null)
    : null;

  // Most recent mandate statement — what the buyer is actively looking for right now.
  // Falls back to contact.mandate_statement if no mandate_updates rows exist.
  const latestMandate = await queryOne<MandateUpdate>(
    `SELECT * FROM mandate_updates
     WHERE contact_id = ?
     ORDER BY stated_date DESC NULLS LAST, scraped_at DESC
     LIMIT 1`,
    [contactId]
  );

  // Greenlits = evidence of what actually gets bought; more predictive than stated mandate
  const recentGreenlits = await query<{ title: string; outcome: string; pitch_date: number | null }>(
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
  const passRows = await query<{ pass_reason_cat: string }>(
    `SELECT DISTINCT pass_reason_cat
     FROM pitches
     WHERE buyer_contact_id = ?
       AND outcome = 'pass'
       AND pass_reason_cat IS NOT NULL`,
    [contactId]
  );
  const passPatterns = passRows.map((r) => r.pass_reason_cat);

  // Compute days-since-last-contact in JS rather than SQL to avoid timezone issues
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
