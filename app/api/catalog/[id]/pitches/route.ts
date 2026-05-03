/**
 * GET /api/catalog/[id]/pitches
 * Called by: IP detail page — pitch history tab
 * Auth: none
 * Response: { data: Array<Pitch & { buyer_name, company_name }> } sorted by pitch_date DESC
 *
 * Returns every time this IP was pitched, with buyer and company context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PitchRow {
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
  buyer_name: string | null;
  company_name: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<PitchRow>(
      `SELECT
        p.*,
        bc.name  AS buyer_name,
        co.name  AS company_name
       FROM pitches p
       LEFT JOIN buyer_contacts bc ON bc.id = p.buyer_contact_id
       LEFT JOIN buyer_companies co ON co.id = p.buyer_company_id
       WHERE p.ip_id = ?
       ORDER BY p.pitch_date DESC NULLS LAST`,
      [id]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
