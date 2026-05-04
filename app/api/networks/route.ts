/**
 * GET /api/networks
 * Called by: networks list page, search, package creation targeting modal
 * Auth: none
 * Query params:
 *   q — LIKE match on buyer_companies.name (optional)
 * Response: { data: NetworkListItem[] }
 *   Flat list sorted by tier ASC NULLS LAST, name ASC.
 *   parent_id + child_count enable the UI to build an expand/collapse hierarchy.
 *   Parent rows aggregate counts from all children (done client-side).
 *
 * NetworkListItem shape:
 *   id, name, type, tier, hq_city, notes, parent_id, child_count,
 *   contact_count  — buyer_contacts rows with this company_id
 *   deal_count     — distinct deals rows with this network_id
 *   order_count    — market_orders rows with this buyer_company_id
 *   last_touch_date — most recent buyer_contact_touches timestamp for any contact at this network
 *   active_pitches  — packages targeting this network not in pass/archived stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface NetworkListItem {
  id: string;
  name: string;
  type: string | null;
  tier: string | null;
  hq_city: string | null;
  notes: string | null;
  parent_id: string | null;
  child_count: number;
  contact_count: number;
  deal_count: number;
  order_count: number;
  // Enrichment fields added in migration 017 — may be null/0 until pipeline runs
  last_touch_date: number | null;
  active_pitches: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const whereClause = q ? `WHERE bc.name LIKE ?` : '';
    const params: unknown[] = q ? [`%${q}%`] : [];

    const rows = query<NetworkListItem>(
      `SELECT
        bc.id,
        bc.name,
        bc.type,
        bc.tier,
        bc.hq_city,
        bc.notes,
        bc.parent_id,
        (SELECT COUNT(*)
         FROM buyer_companies child
         WHERE child.parent_id = bc.id)                           AS child_count,
        (SELECT COUNT(*)
         FROM buyer_contacts bcon
         WHERE bcon.company_id = bc.id)                          AS contact_count,
        (SELECT COUNT(DISTINCT d.id)
         FROM deals d
         WHERE d.network_id = bc.id)                             AS deal_count,
        (SELECT COUNT(*)
         FROM market_orders mo
         WHERE mo.buyer_company_id = bc.id)                      AS order_count,
        (SELECT MAX(bct.touch_date)
         FROM buyer_contact_touches bct
         JOIN buyer_contacts bc2 ON bc2.id = bct.contact_id
         WHERE bc2.company_id = bc.id)                           AS last_touch_date,
        (SELECT COUNT(*)
         FROM packages p
         WHERE p.target_company_id = bc.id
           AND p.pipeline_stage NOT IN ('pass', 'archived'))     AS active_pitches
       FROM buyer_companies bc
       ${whereClause}
       ORDER BY bc.tier ASC NULLS LAST, bc.name ASC`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
