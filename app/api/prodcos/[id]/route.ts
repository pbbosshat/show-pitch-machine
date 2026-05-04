/**
 * GET /api/prodcos/[id]
 *   Returns full prodco row plus deal_count and contact_count scalars.
 *   Response: { data: ProductionCompany & { deal_count: number; contact_count: number } }
 *
 * PUT /api/prodcos/[id]
 *   Updates editable fields. If name changes, also recomputes name_normalized.
 *   Body: { name?, ownership_type?, parent_company?, genres?, strategic_tag?, notes?, website?,
 *           hq_city?, email?, phone?, country?, region?, bio?, linkedin_url?, twitter_url?,
 *           youtube_url?, facebook_url?, organization_type?, contact_status?, contacted_detail?,
 *           current_shows?, current_networks?, employee_count? }
 *   Response: { data: { changes: number } }
 *
 * Called by: prodco detail page, inline edit components, spreadsheet import job
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import type { ProductionCompany } from '@/types';

type ProdcoWithStats = ProductionCompany & { deal_count: number; contact_count: number };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Inline subqueries for deal_count and contact_count avoid extra round-trips
    const row = queryOne<ProdcoWithStats>(
      `SELECT
        pc.*,
        (SELECT COUNT(*) FROM deals d WHERE d.prodco_id = pc.id) AS deal_count,
        (SELECT COUNT(*) FROM prodco_contacts WHERE prodco_id = pc.id) AS contact_count
       FROM production_companies pc
       WHERE pc.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Production company not found' }, { status: 404 });
    }

    return NextResponse.json({ data: row });
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

    const allowed = [
      'name',
      'ownership_type',
      'parent_company',
      'genres',
      'strategic_tag',
      'notes',
      'website',
      'hq_city',
      'email',
      'phone',
      'country',
      'region',
      'bio',
      'linkedin_url',
      'twitter_url',
      'youtube_url',
      'facebook_url',
      'organization_type',
      'contact_status',
      'contacted_detail',
      'current_shows',
      'current_networks',
      'employee_count',
    ];

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key]);

        // Keep name_normalized in sync whenever the display name changes
        if (key === 'name' && typeof body.name === 'string') {
          fields.push('name_normalized = ?');
          values.push(body.name.trim().toLowerCase());
        }
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const result = run(
      `UPDATE production_companies SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Production company not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
