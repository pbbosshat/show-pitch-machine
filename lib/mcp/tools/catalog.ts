// MCP tool handler for IP catalog detail queries.
// Returns the full IP record with related pitch history, attached talent, and partners
// so Claude can generate a complete pitch package context in one call.
//
// Phase 1B: made async, added await to query/queryOne calls.

import { query, queryOne } from '../../db';
import type { IpCatalog, Pitch, Talent, ContentPartner } from '../../../types';

/**
 * Return full detail for an IP catalog entry: the record itself, complete pitch
 * history across all buyers, attached talent with their per-IP role, and content
 * partner relationships.
 *
 * Caller: MCP tool 'get_ip_detail' via lib/mcp/server.ts
 * Auth: none
 *
 * @param ipId  ip_catalog.id
 * @returns     { ip, pitchHistory, talent, contentPartners }
 *              ip is undefined when the id doesn't exist
 */
export async function getIpDetail(ipId: string): Promise<{
  ip: IpCatalog | undefined;
  pitchHistory: Array<Pitch & { buyer_name: string | null; company_name: string | null }>;
  talent: Array<Talent & { role: string | null }>;
  contentPartners: Array<ContentPartner & { notes: string | null }>;
}> {
  const ip = await queryOne<IpCatalog>(
    'SELECT * FROM ip_catalog WHERE id = ?',
    [ipId]
  );

  // Full pitch history for this IP across all buyers — reveals what's already been shopped.
  // Sorted newest-first so the most recent activity is at the top.
  const pitchHistory = await query<Pitch & { buyer_name: string | null; company_name: string | null }>(
    `SELECT p.*,
            bc_contact.name  AS buyer_name,
            bc_company.name  AS company_name
     FROM pitches p
     LEFT JOIN buyer_contacts bc_contact ON bc_contact.id = p.buyer_contact_id
     LEFT JOIN buyer_companies bc_company ON bc_company.id = p.buyer_company_id
     WHERE p.ip_id = ?
     ORDER BY p.pitch_date DESC NULLS LAST`,
    [ipId]
  );

  // Attached talent with their role on this specific IP (may differ from primary_role)
  const talent = await query<Talent & { role: string | null }>(
    `SELECT t.*, it.role
     FROM talent t
     JOIN ip_talent it ON it.talent_id = t.id
     WHERE it.ip_id = ?`,
    [ipId]
  );

  // Content partners whose assets/access enable this IP (e.g. Daily Mail for archive)
  const contentPartners = await query<ContentPartner & { notes: string | null }>(
    `SELECT cp.*, icp.notes
     FROM content_partners cp
     JOIN ip_content_partners icp ON icp.partner_id = cp.id
     WHERE icp.ip_id = ?`,
    [ipId]
  );

  return { ip, pitchHistory, talent, contentPartners };
}
