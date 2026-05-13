/**
 * GET /api/intelligence/triangulation
 *   Returns the buyer × prodco relationship matrix — how many deals each buyer has with
 *   each production company, with genre and show breakdowns.
 *   Used to identify which prodcos have the strongest existing relationships with target buyers,
 *   so MYE can pitch alongside or acquire those relationships.
 *
 *   Query params:
 *     genre      — filter deals by genre (LIKE match)
 *     network_id — filter by buyer's network
 *     min_deals  — minimum deal_count to include (default 1)
 *     buyer_id   — narrow to one buyer's relationships
 *     prodco_id  — narrow to one prodco's relationships
 *
 *   Response: { data: TriangulationRow[] }
 *
 * Called by: triangulation intelligence page, prodco/buyer detail pages
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { TriangulationRow } from '@/types';

// Raw DB row before GROUP_CONCAT strings are parsed into arrays
interface TriangulationRaw {
  buyer_id: string;
  buyer_name: string;
  buyer_title: string | null;
  buyer_network: string | null;
  prodco_id: string;
  prodco_name: string;
  prodco_strategic_tag: string | null;
  deal_count: number;
  last_deal_date: number | null;
  genres: string | null;   // raw GROUP_CONCAT output — comma-separated
  shows: string | null;    // raw GROUP_CONCAT output — comma-separated
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    const networkId = searchParams.get('network_id');
    const minDeals = parseInt(searchParams.get('min_deals') ?? '1', 10);
    const buyerId = searchParams.get('buyer_id');
    const prodcoId = searchParams.get('prodco_id');

    const conditions: string[] = [];
    const values: unknown[] = [];

    // Require both FKs so the matrix only shows meaningful buyer–prodco relationships
    conditions.push('d.buyer_id IS NOT NULL');
    conditions.push('d.prodco_id IS NOT NULL');

    if (genre) {
      conditions.push('d.genre LIKE ?');
      values.push(`%${genre}%`);
    }
    if (networkId) {
      // Filter by the buyer's home network (company), not the deal's network_id
      conditions.push('bc.company_id = ?');
      values.push(networkId);
    }
    if (buyerId) {
      conditions.push('d.buyer_id = ?');
      values.push(buyerId);
    }
    if (prodcoId) {
      conditions.push('d.prodco_id = ?');
      values.push(prodcoId);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // min_deals goes into HAVING so it applies after GROUP BY aggregation
    values.push(minDeals);

    const rows = await query<TriangulationRaw>(
      `SELECT
        bc.id                           AS buyer_id,
        bc.name                         AS buyer_name,
        bc.title                        AS buyer_title,
        co.name                         AS buyer_network,
        pc.id                           AS prodco_id,
        pc.name                         AS prodco_name,
        pc.strategic_tag                AS prodco_strategic_tag,
        COUNT(d.id)                     AS deal_count,
        MAX(d.deal_date)                AS last_deal_date,
        GROUP_CONCAT(DISTINCT d.genre)  AS genres,
        GROUP_CONCAT(DISTINCT d.show_title) AS shows
       FROM deals d
       JOIN buyer_contacts bc  ON bc.id = d.buyer_id
       JOIN production_companies pc ON pc.id = d.prodco_id
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       ${where}
       GROUP BY bc.id, pc.id
       HAVING COUNT(d.id) >= ?
       ORDER BY deal_count DESC, last_deal_date DESC NULLS LAST`,
      values
    );

    // Parse GROUP_CONCAT strings into proper arrays — null-safe split
    const parsed: TriangulationRow[] = rows.map(r => ({
      buyer_id: r.buyer_id,
      buyer_name: r.buyer_name,
      buyer_title: r.buyer_title,
      buyer_network: r.buyer_network,
      prodco_id: r.prodco_id,
      prodco_name: r.prodco_name,
      prodco_strategic_tag: r.prodco_strategic_tag,
      deal_count: r.deal_count,
      last_deal_date: r.last_deal_date,
      genres: (r.genres ?? '').split(',').filter(Boolean),
      shows: (r.shows ?? '').split(',').filter(Boolean),
    }));

    return NextResponse.json({ data: parsed });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
