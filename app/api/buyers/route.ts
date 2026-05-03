/**
 * GET /api/buyers
 * Called by: buyer list page, package creation modal, targeting search
 * Auth: none
 * Query params:
 *   search         — LIKE match on buyer_contacts.name
 *   activity_status — filter by 'active' | 'quiet' | 'unknown'
 *   company        — filter by buyer_companies.name (LIKE)
 * Response: { data: Array<BuyerContact & { company_name, company_type, company_tier }> }
 * Sorted by last_greenlit_date DESC NULLS LAST so most-active buyers surface first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface BuyerRow {
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
  created_at: number | null;
  updated_at: number | null;
  company_name: string | null;
  company_type: string | null;
  company_tier: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const activityStatus = searchParams.get('activity_status') || '';
    const company = searchParams.get('company') || '';

    // Build WHERE clauses dynamically — only add conditions for non-empty params
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('bc.name LIKE ?');
      params.push(`%${search}%`);
    }

    if (activityStatus) {
      conditions.push('bc.activity_status = ?');
      params.push(activityStatus);
    }

    if (company) {
      conditions.push('co.name LIKE ?');
      params.push(`%${company}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = query<BuyerRow>(
      `SELECT
        bc.*,
        co.name  AS company_name,
        co.type  AS company_type,
        co.tier  AS company_tier
       FROM buyer_contacts bc
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       ${whereClause}
       ORDER BY bc.last_greenlit_date DESC NULLS LAST`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
