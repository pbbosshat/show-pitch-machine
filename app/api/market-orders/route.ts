/**
 * GET /api/market-orders
 * Called by: market orders page, buyer detail greenlits tab, intelligence widgets
 * Auth: none
 * Query params:
 *   network     — exact match on market_orders.network
 *   genre       — exact match on market_orders.genre
 *   days_back   — how many days back to look (default 90)
 *   contact_id  — filter by specific buyer_contact_id
 * Response: { data: Array<MarketOrder & { company_name, company_type }> }
 * Sorted by order_date DESC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface MarketOrderRow {
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
  company_name: string | null;
  company_type: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || '';
    const genre = searchParams.get('genre') || '';
    const daysBack = Math.min(parseInt(searchParams.get('days_back') || '90', 10), 730);
    const contactId = searchParams.get('contact_id') || '';

    // Convert days_back to a Unix ms timestamp cutoff
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    const conditions: string[] = ['mo.order_date >= ?'];
    const params: unknown[] = [cutoff];

    if (network) { conditions.push('mo.network = ?'); params.push(network); }
    if (genre) { conditions.push('mo.genre = ?'); params.push(genre); }
    if (contactId) { conditions.push('mo.buyer_contact_id = ?'); params.push(contactId); }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const rows = query<MarketOrderRow>(
      `SELECT
        mo.*,
        co.name AS company_name,
        co.type AS company_type
       FROM market_orders mo
       LEFT JOIN buyer_companies co ON co.id = mo.buyer_company_id
       ${whereClause}
       ORDER BY mo.order_date DESC NULLS LAST`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
