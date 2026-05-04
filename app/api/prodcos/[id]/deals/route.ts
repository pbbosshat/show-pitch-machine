/**
 * GET /api/prodcos/[id]/deals
 *   Returns all deals for this prodco, with buyer name, network name, and show title.
 *   Sort: deal_date DESC NULLS LAST
 *   Response: { data: Array<Deal & { buyer_name, network_name, show_title }> }
 *
 * POST /api/prodcos/[id]/deals
 *   Creates a new deal linked to this prodco. prodco_id comes from the URL, not the body.
 *   Body: { show_title?, network_name?, buyer_name?, deal_type?, genre?, format?, deal_date?,
 *           source?, source_url?, notes?, show_id?, network_id?, buyer_id? }
 *   Response: { data: { id } }
 *
 * Called by: prodco detail page deals tab, deal create modal
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';
import type { Deal, ProductionCompany } from '@/types';

type DealWithContext = Deal & {
  buyer_name: string | null;
  network_name: string | null;
  show_title: string | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<DealWithContext>(
      `SELECT
        d.*,
        bc.name  AS buyer_name,
        co.name  AS network_name,
        s.title  AS show_title
       FROM deals d
       LEFT JOIN buyer_contacts bc ON bc.id = d.buyer_id
       LEFT JOIN buyer_companies co ON co.id = d.network_id
       LEFT JOIN shows s ON s.id = d.show_id
       WHERE d.prodco_id = ?
       ORDER BY d.deal_date DESC NULLS LAST`,
      [id]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: prodcoId } = await params;
    const body = await request.json();

    // Look up the prodco name so we can denormalize it into the deal row
    const prodco = queryOne<ProductionCompany>(
      'SELECT name FROM production_companies WHERE id = ?',
      [prodcoId]
    );
    if (!prodco) {
      return NextResponse.json({ error: 'Production company not found' }, { status: 404 });
    }

    const dealId = crypto.randomUUID();
    const now = Date.now();

    run(
      `INSERT INTO deals
        (id, show_id, show_title, network_id, network_name, buyer_id, buyer_name,
         prodco_id, prodco_name, deal_type, genre, format, deal_date,
         source, source_url, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dealId,
        body.show_id ?? null,
        body.show_title ?? null,
        body.network_id ?? null,
        body.network_name ?? null,
        body.buyer_id ?? null,
        body.buyer_name ?? null,
        prodcoId,
        prodco.name,              // always use the canonical DB name, not body
        body.deal_type ?? null,
        body.genre ?? null,
        body.format ?? null,
        body.deal_date ?? null,
        body.source ?? null,
        body.source_url ?? null,
        body.notes ?? null,
        now,
      ]
    );

    return NextResponse.json({ data: { id: dealId } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
