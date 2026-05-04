// tools/pipeline.ts — MCP tool handlers for pipeline and pitch history queries.
//
// Ported from lib/mcp/tools/pipeline.ts (SQLite/sync) to async Postgres.
// The CASE WHEN pipeline_stage ordering is identical to the original —
// Postgres supports it identically to SQLite.

import { query } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Package {
  id: string;
  name: string;
  ip_id: string | null;
  target_company_id: string | null;
  target_contact_id: string | null;
  created_by: string | null;
  pipeline_stage: string;
  stage_entered_at: number | null;
  days_in_stage: number;
  status: string;
  narrative: string | null;
  comp_show_ids: string | null;
  ask_format: string | null;
  ask_episode_count: number | null;
  ask_deal_structure: string | null;
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
  thread_id: string | null;
  notes: string | null;
  created_at: number | null;
}

// ── Tool functions ────────────────────────────────────────────────────────────

/**
 * Full pipeline with denormalized buyer + IP names for dashboard rendering.
 * Sorted by pipeline stage priority (negotiating → meeting → ... → pass)
 * and then by days_in_stage DESC to surface stalest deals first.
 */
export async function getPipeline(): Promise<Array<
  Package & {
    ip_title: string | null;
    buyer_name: string | null;
    company_name: string | null;
  }
>> {
  return query(
    `SELECT p.*,
            ic.title           AS ip_title,
            bc_contact.name    AS buyer_name,
            bc_company.name    AS company_name
     FROM packages p
     LEFT JOIN ip_catalog ic              ON ic.id = p.ip_id
     LEFT JOIN buyer_contacts bc_contact  ON bc_contact.id = p.target_contact_id
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
 * Full pitch history for a contact — used in briefing generation and comp analysis.
 * Returns all pitches, not just recent ones, so Claude can detect patterns across
 * a long relationship (e.g. "we've pitched 12 shows and gotten 0 meetings").
 */
export async function getPitchHistory(contactId: string): Promise<Array<
  Pitch & { ip_title: string | null; company_name: string | null }
>> {
  return query(
    `SELECT p.*,
            ic.title    AS ip_title,
            bc.name     AS company_name
     FROM pitches p
     LEFT JOIN ip_catalog ic      ON ic.id = p.ip_id
     LEFT JOIN buyer_companies bc ON bc.id = p.buyer_company_id
     WHERE p.buyer_contact_id = $1
     ORDER BY p.pitch_date DESC NULLS LAST`,
    [contactId]
  );
}
