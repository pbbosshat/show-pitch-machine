/**
 * GET /api/buyers/[id]/mandate-history
 * Called by: buyer detail page — mandate timeline tab
 * Auth: none
 * Response: { data: MandateUpdate[] } sorted by stated_date DESC
 *
 * Returns the full mandate update history for a buyer contact, newest first.
 * Each row is a scraped or manually entered mandate statement with its source.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { MandateUpdate } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<MandateUpdate>(
      `SELECT * FROM mandate_updates
       WHERE contact_id = ?
       ORDER BY stated_date DESC NULLS LAST, scraped_at DESC NULLS LAST`,
      [id]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
