/**
 * GET /api/pipeline/[id]/emails
 * Called by: pipeline card expanded view — email thread panel
 * Auth: none
 * Response: { data: PackageEmail[] } sorted by received_at DESC
 *
 * Returns all inbound emails matched to this package, with Groq signal
 * and stage transition info so the card can show the most recent buyer response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { PackageEmail } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = query<PackageEmail>(
      `SELECT * FROM package_emails
       WHERE package_id = ?
       ORDER BY received_at DESC NULLS LAST`,
      [id]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
