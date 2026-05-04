// tools/buyers.ts — MCP tool handlers for buyer intelligence queries.
//
// Ported from lib/mcp/tools/buyers.ts (SQLite/sync) to async Postgres.
// All ? placeholders replaced with $1, $2, etc.
// Functions return Promises instead of synchronous values.

import { query, queryOne } from '../db';

// ── Type definitions ──────────────────────────────────────────────────────────
// Mirrors the SQLite schema + all ALTER TABLE additions from migrations 003–006.

interface BuyerContact {
  id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  title: string | null;
  mandate_statement: string | null;
  mandate_source: string | null;
  mandate_source_url: string | null;
  mandate_date: number | null;
  last_greenlit_date: number | null;
  orders_last_90_days: number;
  orders_last_365_days: number;
  activity_status: string;
  last_mye_contact_date: number | null;
  last_mye_contact_outcome: string | null;
  mye_pitch_count: number;
  company_history: string | null;
  notes: string | null;
  region: string | null;
  is_former: number;
  phone: string | null;
  coverage_notes: string | null;
  linkedin_url: string | null;
  former_role: string | null;
  outreach_priority: number;
  role_type: string;
  is_buyer_seat: number;
  production_type_focus: string;
  mandate_data_source: string | null;
  created_at: number | null;
  updated_at: number | null;
}

interface BuyerCompany {
  id: string;
  name: string;
  type: string | null;
  tier: string | null;
  hq_city: string | null;
  notes: string | null;
  created_at: number | null;
  updated_at: number | null;
}

interface MandateUpdate {
  id: string;
  contact_id: string | null;
  statement: string;
  source: string | null;
  source_url: string | null;
  stated_date: number | null;
  scraped_at: number | null;
}

interface Pitch {
  id: string;
  ip_id: string | null;
  buyer_company_id: string | null;
  buyer_contact_id: string | null;
  pitch_date: number | null;
  format_pitched: string | null;
  outcome: string | null;
  pass_reason: string | null;
  pass_reason_cat: string | null;
  thread_id: string | null;
  notes: string | null;
  created_at: number | null;
  ip_title?: string | null;
}

// ── Tool functions ────────────────────────────────────────────────────────────

/**
 * Active buyers sorted by recency of greenlit — the most actionable targets first.
 * "Active" means activity_status = 'active'; staleness is surfaced by date ordering.
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
 * Full buyer profile: contact record + company + mandate history + recent pitches.
 * Returns all four in a single call so Claude doesn't need to chain tool calls
 * just to build a basic briefing.
 */
export async function getBuyerProfile(contactId: string): Promise<{
  contact: BuyerContact | undefined;
  company: BuyerCompany | undefined;
  mandateHistory: MandateUpdate[];
  recentPitches: Pitch[];
}> {
  const contact = await queryOne<BuyerContact>(
    'SELECT * FROM buyer_contacts WHERE id = $1',
    [contactId]
  );

  // Only query company if the contact has one — avoids a wasted round-trip
  const company = contact?.company_id
    ? await queryOne<BuyerCompany>('SELECT * FROM buyer_companies WHERE id = $1', [contact.company_id])
    : undefined;

  // Return mandate history most-recent-first so Claude sees the current mandate at top
  const mandateHistory = await query<MandateUpdate>(
    `SELECT * FROM mandate_updates
     WHERE contact_id = $1
     ORDER BY stated_date DESC NULLS LAST, scraped_at DESC`,
    [contactId]
  );

  // Last 20 MYE pitches — enough context without overwhelming the context window
  const recentPitches = await query<Pitch>(
    `SELECT p.*, ic.title AS ip_title
     FROM pitches p
     LEFT JOIN ip_catalog ic ON ic.id = p.ip_id
     WHERE p.buyer_contact_id = $1
     ORDER BY p.pitch_date DESC NULLS LAST
     LIMIT 20`,
    [contactId]
  );

  return { contact, company, mandateHistory, recentPitches };
}

/**
 * Structured briefing snapshot — optimized for "who should we pitch this week" queries.
 * Surfaces the current mandate, recent greenlits (evidence > stated preference),
 * pass patterns (what consistently doesn't land), and days since last MYE contact.
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
    'SELECT * FROM buyer_contacts WHERE id = $1',
    [contactId]
  );

  const companyRow = contact?.company_id
    ? await queryOne<{ name: string }>('SELECT name FROM buyer_companies WHERE id = $1', [contact.company_id])
    : undefined;
  const companyName = companyRow?.name ?? null;

  // Most recent mandate statement — what the buyer is actively looking for right now
  const latestMandate = await queryOne<MandateUpdate>(
    `SELECT * FROM mandate_updates
     WHERE contact_id = $1
     ORDER BY stated_date DESC NULLS LAST, scraped_at DESC
     LIMIT 1`,
    [contactId]
  );

  // Greenlits are evidence of what actually gets bought; more predictive than stated mandate
  const recentGreenlits = await query<{ title: string; outcome: string; pitch_date: number | null }>(
    `SELECT ic.title, p.outcome, p.pitch_date
     FROM pitches p
     LEFT JOIN ip_catalog ic ON ic.id = p.ip_id
     WHERE p.buyer_contact_id = $1
       AND p.outcome IN ('greenlit', 'in-production', 'meeting')
     ORDER BY p.pitch_date DESC
     LIMIT 5`,
    [contactId]
  );

  // Distinct pass reason categories — surfaces buyer blind spots / topic fatigue
  const passRows = await query<{ pass_reason_cat: string }>(
    `SELECT DISTINCT pass_reason_cat
     FROM pitches
     WHERE buyer_contact_id = $1
       AND outcome = 'pass'
       AND pass_reason_cat IS NOT NULL`,
    [contactId]
  );
  const passPatterns = passRows.map((r) => r.pass_reason_cat);

  const daysSinceLastContact = contact?.last_mye_contact_date
    ? Math.floor((Date.now() - contact.last_mye_contact_date) / 86_400_000)
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
