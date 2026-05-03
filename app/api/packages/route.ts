/**
 * GET /api/packages
 *   Returns all packages with IP title and buyer contact/company.
 *   Response: { data: Array<Package & { ip_title, buyer_name, company_name }> }
 *
 * POST /api/packages
 *   Creates a new pitch package at the 'proposal' pipeline stage.
 *   Body: { name, ip_id, target_contact_id?, target_company_id?, created_by? }
 *   Response: { data: { id } }
 *
 * Called by: packages list page, pipeline board, package creation modal
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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

export async function GET() {
  try {
    const rows = query<PackageRow>(
      `SELECT
        pkg.*,
        ip.title  AS ip_title,
        bc.name   AS buyer_name,
        co.name   AS company_name
       FROM packages pkg
       LEFT JOIN ip_catalog ip   ON ip.id  = pkg.ip_id
       LEFT JOIN buyer_contacts bc ON bc.id = pkg.target_contact_id
       LEFT JOIN buyer_companies co ON co.id = pkg.target_company_id
       ORDER BY pkg.created_at DESC`
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const id = uuidv4();
    const now = Date.now();

    run(
      `INSERT INTO packages
         (id, name, ip_id, target_company_id, target_contact_id, created_by,
          pipeline_stage, stage_entered_at, days_in_stage, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'proposal', ?, 0, 'active', ?, ?)`,
      [
        id,
        body.name,
        body.ip_id || null,
        body.target_company_id || null,
        body.target_contact_id || null,
        body.created_by || null,
        now,  // stage_entered_at
        now,  // created_at
        now,  // updated_at
      ]
    );

    return NextResponse.json({ data: { id } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
