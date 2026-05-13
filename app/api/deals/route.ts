/**
 * GET /api/deals
 *   Returns deals filtered by any combination of buyer_id, prodco_id, network_id,
 *   genre, deal_type. All filters are additive (AND). Sort: deal_date DESC NULLS LAST.
 *   Query params: buyer_id, prodco_id, network_id, genre, deal_type, limit (default 100)
 *   Response: { data: Deal[] }
 *
 * POST /api/deals
 *   Creates a new deal. Looks up denormalized name fields from their FK tables when only
 *   the ID is provided, so callers don't have to pre-fetch names.
 *   Body: { show_title?, show_id?, network_id?, network_name?, buyer_id?, buyer_name?,
 *           prodco_id?, prodco_name?, deal_type?, genre?, format?, deal_date?,
 *           source?, source_url?, notes? }
 *   Response: { data: { id } }
 *
 * Called by: deal list page, import pipeline, scraper post-processing
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';
import type { Deal } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyer_id');
    const prodcoId = searchParams.get('prodco_id');
    const networkId = searchParams.get('network_id');
    const genre = searchParams.get('genre');
    const dealType = searchParams.get('deal_type');
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (buyerId) { conditions.push('buyer_id = ?'); values.push(buyerId); }
    if (prodcoId) { conditions.push('prodco_id = ?'); values.push(prodcoId); }
    if (networkId) { conditions.push('network_id = ?'); values.push(networkId); }
    if (genre) { conditions.push('genre = ?'); values.push(genre); }
    if (dealType) { conditions.push('deal_type = ?'); values.push(dealType); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit);

    const rows = await query<Deal>(
      `SELECT * FROM deals ${where} ORDER BY deal_date DESC NULLS LAST LIMIT ?`,
      values
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Resolve denormalized name fields from their FK tables when only the ID was supplied
    let buyerName = body.buyer_name ?? null;
    if (body.buyer_id && !buyerName) {
      const bc = await queryOne<{ name: string }>('SELECT name FROM buyer_contacts WHERE id = ?', [body.buyer_id]);
      buyerName = bc?.name ?? null;
    }

    let prodcoName = body.prodco_name ?? null;
    if (body.prodco_id && !prodcoName) {
      const pc = await queryOne<{ name: string }>('SELECT name FROM production_companies WHERE id = ?', [body.prodco_id]);
      prodcoName = pc?.name ?? null;
    }

    let networkName = body.network_name ?? null;
    if (body.network_id && !networkName) {
      const co = await queryOne<{ name: string }>('SELECT name FROM buyer_companies WHERE id = ?', [body.network_id]);
      networkName = co?.name ?? null;
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    await run(
      `INSERT INTO deals
        (id, show_id, show_title, network_id, network_name, buyer_id, buyer_name,
         prodco_id, prodco_name, deal_type, genre, format, deal_date,
         source, source_url, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.show_id ?? null,
        body.show_title ?? null,
        body.network_id ?? null,
        networkName,
        body.buyer_id ?? null,
        buyerName,
        body.prodco_id ?? null,
        prodcoName,
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

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
