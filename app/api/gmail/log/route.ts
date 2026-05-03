/**
 * GET /api/gmail/log
 * Called by: dashboard Gmail log panel, email audit view
 * Auth: none
 * Query params: limit (default 50, max 500)
 * Response: { data: Array<PackageEmail & { package_name }> }
 * Sorted by received_at DESC.
 *
 * Returns recent inbound emails with their Groq classification signal,
 * stage transition, and the package name they were matched to.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface EmailLogRow {
  id: string;
  package_id: string | null;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
  stage_moved_to: string | null;
  processed_at: number | null;
  package_name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(1, rawLimit), 500);

    const rows = query<EmailLogRow>(
      `SELECT
        pe.id,
        pe.package_id,
        pe.gmail_thread_id,
        pe.subject,
        pe.sender,
        pe.received_at,
        pe.grok_signal,
        pe.stage_moved_to,
        pe.processed_at,
        pkg.name AS package_name
       FROM package_emails pe
       LEFT JOIN packages pkg ON pkg.id = pe.package_id
       ORDER BY pe.received_at DESC NULLS LAST
       LIMIT ?`,
      [limit]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
