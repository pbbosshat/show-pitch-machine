/**
 * GET /api/prodcos
 *   Returns production companies, optionally filtered by several params.
 *   Query params: search (LIKE on name), strategic_tag (exact), ownership_type (exact),
 *                 country (exact), contact_status (exact 'Y'/'N'),
 *                 organization_type (LIKE %value%)
 *   Response: { data: ProductionCompany[] }
 *
 * POST /api/prodcos
 *   Creates a new production company record.
 *   Body: { name, ownership_type?, parent_company?, genres?, strategic_tag?, notes?, website?, hq_city? }
 *   Response: { data: { id } }
 *
 * Called by: prodco list page, prodco create form, spreadsheet import job
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import type { ProductionCompany } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const strategicTag = searchParams.get('strategic_tag');
    const ownershipType = searchParams.get('ownership_type');
    const country = searchParams.get('country');
    const contactStatus = searchParams.get('contact_status');
    const organizationType = searchParams.get('organization_type');

    const conditions: string[] = [];
    const values: unknown[] = [];

    // Each filter is additive — all supplied params must match
    if (search) {
      conditions.push('name LIKE ?');
      values.push(`%${search}%`);
    }
    if (strategicTag) {
      conditions.push('strategic_tag = ?');
      values.push(strategicTag);
    }
    if (ownershipType) {
      conditions.push('ownership_type = ?');
      values.push(ownershipType);
    }
    if (country) {
      conditions.push('country = ?');
      values.push(country);
    }
    if (contactStatus) {
      conditions.push('contact_status = ?');
      values.push(contactStatus);
    }
    // LIKE match so partial strings work (e.g. 'Production' matches 'Production (crew, equipment, facilities)')
    if (organizationType) {
      conditions.push('organization_type LIKE ?');
      values.push(`%${organizationType}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<ProductionCompany>(
      `SELECT * FROM production_companies ${where} ORDER BY name ASC`,
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

    // name is the only required field — everything else is optional context
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const nameNormalized = body.name.trim().toLowerCase();

    try {
      await run(
        `INSERT INTO production_companies
          (id, name, name_normalized, ownership_type, parent_company, genres, strategic_tag, notes, website, hq_city, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.name.trim(),
          nameNormalized,
          body.ownership_type ?? null,
          body.parent_company ?? null,
          body.genres ?? null,
          body.strategic_tag ?? null,
          body.notes ?? null,
          body.website ?? null,
          body.hq_city ?? null,
          now,
          now,
        ]
      );
    } catch (insertErr) {
      // SQLite UNIQUE constraint error code — treat as duplicate name
      const msg = (insertErr as Error).message ?? '';
      if (msg.includes('UNIQUE constraint failed')) {
        return NextResponse.json({ error: 'Production company already exists' }, { status: 409 });
      }
      throw insertErr;
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
