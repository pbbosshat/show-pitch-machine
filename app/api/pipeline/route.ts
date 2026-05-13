/**
 * GET /api/pipeline
 * Called by: Kanban pipeline board page, pipeline summary widget
 * Auth: none
 * Response: { data: Array<Package & { ip_title, buyer_name, company_name, days_in_stage,
 *             buyer_orders_90d, buyer_mandate, buyer_last_contact }> }
 * Sorted by stage_entered_at ASC (longest-waiting packages surface first within each stage).
 *
 * days_in_stage is computed fresh on each request from stage_entered_at so it
 * doesn't require a background job to keep it current.
 *
 * buyer_orders_90d, buyer_mandate, buyer_last_contact are enrichment fields from
 * migration 017 — all three are optional/nullable so the board degrades gracefully
 * when enrichment hasn't run yet on a given contact.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PipelineRow {
  id: string;
  name: string;
  ip_id: string | null;
  target_company_id: string | null;
  target_contact_id: string | null;
  pipeline_stage: string;
  stage_entered_at: number | null;
  days_in_stage: number;
  status: string;
  ask_format: string | null;
  ask_episode_count: number | null;
  created_at: number | null;
  updated_at: number | null;
  ip_title: string | null;
  buyer_name: string | null;
  company_name: string | null;
  // Enrichment fields added by migration 017 — all optional, may be null
  buyer_orders_90d: number | null;
  buyer_mandate: string | null;
  buyer_last_contact: number | null;
}

export async function GET() {
  try {
    const rows = await query<PipelineRow>(
      `SELECT
        pkg.id,
        pkg.name,
        pkg.ip_id,
        pkg.target_company_id,
        pkg.target_contact_id,
        pkg.pipeline_stage,
        pkg.stage_entered_at,
        pkg.days_in_stage,
        pkg.status,
        pkg.ask_format,
        pkg.ask_episode_count,
        pkg.created_at,
        pkg.updated_at,
        ip.title                       AS ip_title,
        bc.name                        AS buyer_name,
        co.name                        AS company_name,
        bc.orders_last_90_days         AS buyer_orders_90d,
        bc.mandate_statement           AS buyer_mandate,
        bc.last_mye_contact_date       AS buyer_last_contact
       FROM packages pkg
       LEFT JOIN ip_catalog ip     ON ip.id  = pkg.ip_id
       LEFT JOIN buyer_contacts bc ON bc.id  = pkg.target_contact_id
       LEFT JOIN buyer_companies co ON co.id = pkg.target_company_id
       WHERE pkg.status != 'archived'
       ORDER BY pkg.stage_entered_at ASC NULLS LAST`
    );

    // Compute live days_in_stage from stage_entered_at so the board is always current
    const nowMs = Date.now();
    const MS_PER_DAY = 86400000;

    const data = rows.map((row) => ({
      ...row,
      days_in_stage: row.stage_entered_at
        ? Math.floor((nowMs - row.stage_entered_at) / MS_PER_DAY)
        : 0,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
