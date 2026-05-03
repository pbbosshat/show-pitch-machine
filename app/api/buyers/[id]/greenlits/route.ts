/**
 * GET /api/buyers/[id]/greenlits
 * Called by: buyer detail page — greenlits tab
 * Auth: none
 * Response: { data: Array<MarketOrder & { show_title, show_genre, show_format }> }
 * Sorted by order_date DESC (newest greenlit first).
 *
 * Joins market_orders with shows to surface richer show details.
 * Falls back to market_orders.show_title when show row doesn't exist yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface GreenlitRow {
  id: string;
  show_id: string | null;
  show_title: string | null;
  network: string | null;
  buyer_company_id: string | null;
  buyer_contact_id: string | null;
  format: string | null;
  genre: string | null;
  episode_count: number | null;
  order_type: string | null;
  order_date: number | null;
  source: string | null;
  source_url: string | null;
  created_at: number | null;
  // from shows join
  show_genre: string | null;
  show_format: string | null;
  show_network: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<GreenlitRow>(
      `SELECT
        mo.*,
        s.genre   AS show_genre,
        s.format  AS show_format,
        s.network AS show_network
       FROM market_orders mo
       LEFT JOIN shows s ON s.id = mo.show_id
       WHERE mo.buyer_contact_id = ?
       ORDER BY mo.order_date DESC NULLS LAST`,
      [id]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
