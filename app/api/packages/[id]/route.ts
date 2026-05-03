/**
 * GET /api/packages/[id]
 *   Returns full package record with IP title and buyer info.
 *   Response: { data: Package & { ip_title, buyer_name, company_name } }
 *
 * PUT /api/packages/[id]
 *   Updates editable package fields.
 *   Body: { narrative?, comp_show_ids?, ask_format?, ask_episode_count?, ask_deal_structure?, status? }
 *   comp_show_ids must be a JSON-encoded array string: '["id1","id2"]'
 *   Response: { data: { changes: number } }
 *
 * Called by: package editor page, pitch portal builder
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

interface PackageRow {
  id: string;
  name: string;
  ip_id: string | null;
  target_company_id: string | null;
  target_contact_id: string | null;
  created_by: string | null;
  pipeline_stage: string;
  stage_entered_at: number | null;
  days_in_stage: number;
  status: string;
  narrative: string | null;
  comp_show_ids: string | null;
  ask_format: string | null;
  ask_episode_count: number | null;
  ask_deal_structure: string | null;
  created_at: number | null;
  updated_at: number | null;
  ip_title: string | null;
  buyer_name: string | null;
  company_name: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<PackageRow>(
      `SELECT
        pkg.*,
        ip.title  AS ip_title,
        bc.name   AS buyer_name,
        co.name   AS company_name
       FROM packages pkg
       LEFT JOIN ip_catalog ip    ON ip.id  = pkg.ip_id
       LEFT JOIN buyer_contacts bc ON bc.id = pkg.target_contact_id
       LEFT JOIN buyer_companies co ON co.id = pkg.target_company_id
       WHERE pkg.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
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
      'narrative',
      'comp_show_ids',
      'ask_format',
      'ask_episode_count',
      'ask_deal_structure',
      'status',
    ];

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = ?`);
        // Serialize comp_show_ids array to JSON string if caller passes an array
        if (key === 'comp_show_ids' && Array.isArray(body[key])) {
          values.push(JSON.stringify(body[key]));
        } else {
          values.push(body[key]);
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
      `UPDATE packages SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
