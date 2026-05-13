// MCP tool handlers for pipeline and pitch history queries.
// The pipeline view is the primary dashboard for daily MYE operations —
// it surfaces every active deal with its current stage and staleness.
//
// Phase 1B: made functions async, added await to all query() calls.

import { query } from '../../db';
import type { Package, Pitch } from '../../../types';

/**
 * Return the full pipeline with denormalized buyer + IP names for dashboard rendering.
 *
 * Sorted by stage priority (negotiating → meeting → in-review → sent → proposal →
 * greenlit → pass → other) then by days_in_stage descending so the stalest
 * deals surface first within each stage.
 *
 * Caller: MCP tool 'get_pipeline' via lib/mcp/server.ts
 * Auth: none
 */
export async function getPipeline(): Promise<Array<
  Package & {
    ip_title: string | null;
    buyer_name: string | null;
    company_name: string | null;
  }
>> {
  // CASE WHEN keeps the stage ordering without a separate sort table
  return query(
    `SELECT p.*,
            ic.title         AS ip_title,
            bc_contact.name  AS buyer_name,
            bc_company.name  AS company_name
     FROM packages p
     LEFT JOIN ip_catalog ic             ON ic.id = p.ip_id
     LEFT JOIN buyer_contacts bc_contact ON bc_contact.id = p.target_contact_id
     LEFT JOIN buyer_companies bc_company ON bc_company.id = p.target_company_id
     WHERE p.status != 'archived'
     ORDER BY
       CASE p.pipeline_stage
         WHEN 'negotiating' THEN 1
         WHEN 'meeting'     THEN 2
         WHEN 'in-review'   THEN 3
         WHEN 'sent'        THEN 4
         WHEN 'proposal'    THEN 5
         WHEN 'greenlit'    THEN 6
         WHEN 'pass'        THEN 7
         ELSE 8
       END,
       p.days_in_stage DESC`
  );
}

/**
 * Return the full pitch history for a buyer contact — used in briefing generation
 * and competitive analysis. Sorted newest-first so the most recent activity is
 * immediately visible.
 *
 * Caller: MCP tool 'get_pitch_history'
 * Auth: none
 *
 * @param contactId  buyer_contacts.id
 */
export async function getPitchHistory(contactId: string): Promise<Array<
  Pitch & { ip_title: string | null; company_name: string | null }
>> {
  return query(
    `SELECT p.*,
            ic.title         AS ip_title,
            bc.name          AS company_name
     FROM pitches p
     LEFT JOIN ip_catalog ic      ON ic.id = p.ip_id
     LEFT JOIN buyer_companies bc ON bc.id = p.buyer_company_id
     WHERE p.buyer_contact_id = ?
     ORDER BY p.pitch_date DESC NULLS LAST`,
    [contactId]
  );
}
