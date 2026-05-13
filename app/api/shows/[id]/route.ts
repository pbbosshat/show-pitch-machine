/**
 * GET /api/shows/[id]
 * Called by: show detail modal, comp show detail view
 * Auth: none
 * Response: { data: Show }
 *
 * PUT /api/shows/[id]
 *   Updates human-editable fields on a show record.
 *   Body: { title?, network?, genre?, format?, episode_count?, status?, production_company?,
 *           location_type?, notes?, air_status?, is_our_show?, total_seasons?, schedule?, off_air_date? }
 *   Response: { data: { changes: number } }
 *
 * Called by: show edit modal in market/shows page, dashboard greenlits
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';
import type { Show } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Full show row with joined network company name and both prodco names
    const row = await queryOne<Show & {
      network_company_name: string | null;
      network_company_type: string | null;
      network_company_tier: string | null;
      prodco_name: string | null;
      prodco_2_name: string | null;
    }>(
      `SELECT
         s.*,
         bc.name  AS network_company_name,
         bc.type  AS network_company_type,
         bc.tier  AS network_company_tier,
         pc.name  AS prodco_name,
         pc2.name AS prodco_2_name
       FROM shows s
       LEFT JOIN buyer_companies    bc  ON bc.id  = s.network_id
       LEFT JOIN production_companies pc  ON pc.id  = s.prodco_id
       LEFT JOIN production_companies pc2 ON pc2.id = s.prodco_2_id
       WHERE s.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Active buyer contacts at this show's network — the people who actually commission shows there
    const buyers = row.network_id ? await query<{
      id: string; name: string; title: string | null;
      activity_status: string; orders_last_365_days: number;
    }>(
      `SELECT id, name, title, activity_status, orders_last_365_days
       FROM buyer_contacts
       WHERE company_id = ? AND is_buyer_seat = 1
       ORDER BY orders_last_365_days DESC, activity_status ASC
       LIMIT 5`,
      [row.network_id]
    ) : [];

    // Deal records connecting this show to buyers and prodcos (from trade scraping)
    const deals = await query<{
      id: string; deal_type: string | null; deal_date: number | null;
      buyer_name: string | null; prodco_name: string | null; source: string | null; source_url: string | null;
    }>(
      `SELECT d.id, d.deal_type, d.deal_date, d.buyer_name, d.prodco_name, d.source, d.source_url
       FROM deals d
       WHERE d.show_id = ?
       ORDER BY d.deal_date DESC NULLS LAST
       LIMIT 10`,
      [id]
    );

    return NextResponse.json({ data: { ...row, buyers, deals } });
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

    // Only allow updating human-editable fields — scraped/computed fields are read-only via this endpoint.
    // Fields added in migration 011 (air_status, is_our_show, total_seasons, schedule, off_air_date)
    // are included here so the Show DB edit modal can update lifecycle and scheduling metadata.
    const allowed = [
      'title',
      'network',
      'genre',
      'format',
      'episode_count',
      'status',
      'production_company',
      'location_type',
      'notes',
      'air_status',
      'is_our_show',
      'total_seasons',
      'schedule',
      'off_air_date',
    ];
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

    // Always stamp updated_at so we can track when human edits last occurred
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const result = await run(
      `UPDATE shows SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
