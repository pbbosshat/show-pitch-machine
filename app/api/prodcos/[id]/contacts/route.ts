/**
 * GET /api/prodcos/[id]/contacts
 *   Returns all named contacts for a prodco, owners first then alphabetical.
 *   Response: { data: ProdcoContact[] }
 *
 * POST /api/prodcos/[id]/contacts
 *   Creates a new contact row linked to the prodco.
 *   Body: { name, title?, email?, phone?, linkedin_url?, outreach_status?, is_owner?, notes? }
 *   Response: { data: { id } }
 *
 * Called by: prodco detail page, spreadsheet import job
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import type { ProdcoContact } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<ProdcoContact>(
      `SELECT * FROM prodco_contacts WHERE prodco_id = ? ORDER BY is_owner DESC, name ASC`,
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
    const { id } = await params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const contactId = crypto.randomUUID();
    const now = Date.now();

    run(
      `INSERT INTO prodco_contacts
        (id, prodco_id, name, title, email, phone, linkedin_url, outreach_status, is_owner, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contactId,
        id,
        body.name.trim(),
        body.title ?? null,
        body.email ?? null,
        body.phone ?? null,
        body.linkedin_url ?? null,
        body.outreach_status ?? null,
        body.is_owner !== undefined ? body.is_owner : 1,
        body.notes ?? null,
        now,
      ]
    );

    return NextResponse.json({ data: { id: contactId } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
