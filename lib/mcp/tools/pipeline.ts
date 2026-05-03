// MCP tool handlers for pipeline and pitch history queries.
// The pipeline view is the primary dashboard for daily MYE operations —
// it surfaces every active deal with its current stage and staleness.

import { query } from '../../db';
import type { Package, Pitch } from '../../../types';

// Full pipeline with denormalized buyer + IP names for dashboard rendering
export function getPipeline(): Array<
  Package & {
    ip_title: string | null;
    buyer_name: string | null;
    company_name: string | null;
  }
> {
  return query(
    `SELECT p.*,
            ic.title         AS ip_title,
            bc_contact.name  AS buyer_name,
            bc_company.name  AS company_name
     FROM packages p
     LEFT JOIN ip_catalog ic           ON ic.id = p.ip_id
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

// Full pitch history for a contact — used in briefing generation and comp analysis
export function getPitchHistory(contactId: string): Array<
  Pitch & { ip_title: string | null; company_name: string | null }
> {
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
