/**
 * GET /api/buyers/[id]/mye-history
 * Called by: buyer detail page — MYE pitch history tab
 * Auth: none
 * Response: { data: Array<Pitch & { ip_title }> } sorted by pitch_date DESC
 *
 * Returns all MYE pitches to this contact, with the IP title from ip_catalog.
 * Used to show the buyer's full history with MY Entertainment.
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
  ip_title: string | null;
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
        ip.title AS ip_title
       FROM pitches p
       LEFT JOIN ip_catalog ip ON ip.id = p.ip_id
       WHERE p.buyer_contact_id = ?
       ORDER BY p.pitch_date DESC NULLS LAST`,
      [id]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
