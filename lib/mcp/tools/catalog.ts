// MCP tool handler for IP catalog detail queries.
// Returns the full IP record with related pitch history, attached talent, and partners
// so Claude can generate a complete pitch package context in one call.

import { query, queryOne } from '../../db';
import type { IpCatalog, Pitch, Talent, ContentPartner } from '../../../types';

// Full IP detail: the catalog record + everything attached to it
export function getIpDetail(ipId: string): {
  ip: IpCatalog | undefined;
  pitchHistory: Array<Pitch & { buyer_name: string | null; company_name: string | null }>;
  talent: Array<Talent & { role: string | null }>;
  contentPartners: Array<ContentPartner & { notes: string | null }>;
} {
  const ip = queryOne<IpCatalog>(
    'SELECT * FROM ip_catalog WHERE id = ?',
    [ipId]
  );

  // Full pitch history for this IP across all buyers — reveals what's already been shopped
  const pitchHistory = query<Pitch & { buyer_name: string | null; company_name: string | null }>(
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
  const talent = query<Talent & { role: string | null }>(
    `SELECT t.*, it.role
     FROM talent t
     JOIN ip_talent it ON it.talent_id = t.id
     WHERE it.ip_id = ?`,
    [ipId]
  );

  // Content partners whose assets/access enable this IP (e.g. Daily Mail for archive)
  const contentPartners = query<ContentPartner & { notes: string | null }>(
    `SELECT cp.*, icp.notes
     FROM content_partners cp
     JOIN ip_content_partners icp ON icp.partner_id = cp.id
     WHERE icp.ip_id = ?`,
    [ipId]
  );

  return { ip, pitchHistory, talent, contentPartners };
}
