// tools/catalog.ts — MCP tool handler for IP catalog detail queries.
//
// Ported from lib/mcp/tools/catalog.ts (SQLite/sync) to async Postgres.
// Returns the full IP record with pitch history, attached talent, and content partners
// so Claude can generate a complete pitch package context in one call.

import { query, queryOne } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IpCatalog {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  genre: string | null;
  subgenre: string | null;
  episode_count: number | null;
  status: string | null;
  rights_status: string | null;
  rights_expiry: number | null;
  seasons_count: number | null;
  is_library: number;
  notes: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  created_at: number | null;
  updated_at: number | null;
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
  notes: string | null;
}

interface Talent {
  id: string;
  name: string;
  primary_role: string | null;
  mye_relationship: string | null;
  talent_tier: string | null;
  genre_fit: string | null;
}

interface ContentPartner {
  id: string;
  name: string;
  type: string | null;
  access_description: string | null;
  genres_unlocked: string | null;
  agency: string | null;
}

// ── Tool function ─────────────────────────────────────────────────────────────

/**
 * Full IP detail: catalog record + pitch history across all buyers + attached
 * talent + content partners.
 *
 * Returns everything Claude needs to draft a pitch package in one shot — avoids
 * forcing multiple tool calls just to understand what's been shopped and to whom.
 */
export async function getIpDetail(ipId: string): Promise<{
  ip: IpCatalog | undefined;
  pitchHistory: Array<Pitch & { buyer_name: string | null; company_name: string | null }>;
  talent: Array<Talent & { role: string | null }>;
  contentPartners: Array<ContentPartner & { notes: string | null }>;
}> {
  const ip = await queryOne<IpCatalog>(
    'SELECT * FROM ip_catalog WHERE id = $1',
    [ipId]
  );

  // Full pitch history for this IP across all buyers — reveals what's already been shopped
  const pitchHistory = await query<Pitch & { buyer_name: string | null; company_name: string | null }>(
    `SELECT p.*,
            bc_contact.name  AS buyer_name,
            bc_company.name  AS company_name
     FROM pitches p
     LEFT JOIN buyer_contacts bc_contact  ON bc_contact.id = p.buyer_contact_id
     LEFT JOIN buyer_companies bc_company ON bc_company.id = p.buyer_company_id
     WHERE p.ip_id = $1
     ORDER BY p.pitch_date DESC NULLS LAST`,
    [ipId]
  );

  // Attached talent with their role on this specific IP (may differ from primary_role)
  const talent = await query<Talent & { role: string | null }>(
    `SELECT t.*, it.role
     FROM talent t
     JOIN ip_talent it ON it.talent_id = t.id
     WHERE it.ip_id = $1`,
    [ipId]
  );

  // Content partners whose assets/access enable this IP (e.g. Daily Mail for archive)
  const contentPartners = await query<ContentPartner & { notes: string | null }>(
    `SELECT cp.*, icp.notes
     FROM content_partners cp
     JOIN ip_content_partners icp ON icp.partner_id = cp.id
     WHERE icp.ip_id = $1`,
    [ipId]
  );

  return { ip, pitchHistory, talent, contentPartners };
}
