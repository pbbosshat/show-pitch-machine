/**
 * GET /api/intelligence/exec-moves
 * Called by: dashboard intelligence panel — exec moves feed
 * Auth: none
 * Response: { data: Array<BuyerContact & { company_name }> }
 *
 * Returns buyer contacts whose records were updated in the last 30 days.
 * This surfaces exec moves scraped from trade publications (Deadline, Variety, THR).
 * The company_history field is populated by the scraper when a job change is detected.
 *
 * For MVP: any contact with updated_at in the last 30 days is included.
 * The company_history field contains a human-readable description of the move.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ExecMoveRow {
  id: string;
  name: string;
  title: string | null;
  company_id: string | null;
  activity_status: string;
  company_history: string | null;
  updated_at: number | null;
  company_name: string | null;
  company_type: string | null;
}

export async function GET() {
  try {
    // 30 days in milliseconds — wide enough to catch weekly scrape cycles
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const rows = query<ExecMoveRow>(
      `SELECT
        bc.id,
        bc.name,
        bc.title,
        bc.company_id,
        bc.activity_status,
        bc.company_history,
        bc.updated_at,
        co.name AS company_name,
        co.type AS company_type
       FROM buyer_contacts bc
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       WHERE bc.updated_at > ?
       ORDER BY bc.updated_at DESC`,
      [thirtyDaysAgo]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
