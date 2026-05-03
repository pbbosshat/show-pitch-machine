/**
 * GET /api/buyers/[id]
 *   Returns full buyer_contact record with company details.
 *   Response: { data: BuyerContact & { company_name, company_type, company_tier, company_hq_city } }
 *
 * PUT /api/buyers/[id]
 *   Updates editable contact fields. Scraped/computed fields are read-only via this endpoint.
 *   Body: { title?, mandate_statement?, notes?, activity_status? }
 *   Response: { data: { changes: number } }
 *
 * Called by: buyer detail page, inline edit components
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

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
  company_hq_city: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<BuyerRow>(
      `SELECT
        bc.*,
        co.name    AS company_name,
        co.type    AS company_type,
        co.tier    AS company_tier,
        co.hq_city AS company_hq_city
       FROM buyer_contacts bc
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       WHERE bc.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating human-editable fields — scraped fields are never written via API
    const allowed = ['title', 'mandate_statement', 'notes', 'activity_status'];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    // Always update updated_at so we can track when human edits last happened
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const result = run(
      `UPDATE buyer_contacts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
