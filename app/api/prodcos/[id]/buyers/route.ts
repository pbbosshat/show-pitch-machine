/**
 * GET /api/prodcos/[id]/buyers
 *   Returns all buyers who have deals with this prodco, with aggregated stats.
 *   Genres are parsed from GROUP_CONCAT string into a string array.
 *   Response: { data: Array<{ buyer_id, buyer_name, buyer_title, buyer_network,
 *               deal_count, last_deal_date, genres: string[] }> }
 *
 * Called by: prodco detail page buyers tab, triangulation pre-filter
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface BuyerStat {
  buyer_id: string;
  buyer_name: string;
  buyer_title: string | null;
  buyer_network: string | null;
  deal_count: number;
  last_deal_date: number | null;
  genres: string | string[];  // raw string from DB, replaced with array before return
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<BuyerStat>(
      `SELECT
        bc.id           AS buyer_id,
        bc.name         AS buyer_name,
        bc.title        AS buyer_title,
        co.name         AS buyer_network,
        COUNT(d.id)     AS deal_count,
        MAX(d.deal_date) AS last_deal_date,
        GROUP_CONCAT(DISTINCT d.genre) AS genres
       FROM deals d
       JOIN buyer_contacts bc ON bc.id = d.buyer_id
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       WHERE d.prodco_id = ?
       GROUP BY bc.id, bc.name, bc.title, co.name
       ORDER BY deal_count DESC`,
      [id]
    );

    // Convert the comma-separated genre string into a proper array before sending
    const parsed = rows.map(r => ({
      ...r,
      genres: (r.genres as string ?? '').split(',').filter(Boolean),
    }));

    return NextResponse.json({ data: parsed });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
