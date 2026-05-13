/**
 * GET /api/emails/search
 *   Full-text and field search across unattached package_emails (deck_id IS NULL).
 *   Supports filtering by free-text query, sender, and date range, plus pagination.
 *
 *   Query params:
 *     q        — text match against subject OR sender (LIKE %q%)
 *     sender   — filter by sender address (LIKE %sender%)
 *     dateFrom — unix ms lower bound for received_at (inclusive)
 *     dateTo   — unix ms upper bound for received_at (inclusive)
 *     limit    — max rows to return (default 50)
 *     offset   — pagination offset (default 0)
 *
 *   Response: { data: { results: EmailRow[], total: number } }
 *
 * Called by: deck editor email attachment drawer, admin bots
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// Shape of a package_emails row returned to the client.
// Intentionally omits grok_raw (large) and internal processing columns.
interface EmailRow {
  id: string;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q        = searchParams.get('q')        ?? '';
    const sender   = searchParams.get('sender')   ?? '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo   = searchParams.get('dateTo');
    const limit    = Math.max(1, Math.min(500, Number(searchParams.get('limit')  ?? '50')));
    const offset   = Math.max(0,               Number(searchParams.get('offset') ?? '0'));

    // Build WHERE conditions dynamically so we only add clauses that have values.
    // All emails returned here must be unattached (deck_id IS NULL).
    const conditions: string[] = ['deck_id IS NULL'];
    const params: unknown[]    = [];

    if (q) {
      // Match q against subject or sender — covers "I'm looking for something about X"
      conditions.push('(subject LIKE ? OR sender LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (sender) {
      // Separate sender filter lets the UI show "all emails from @netflix.com"
      conditions.push('sender LIKE ?');
      params.push(`%${sender}%`);
    }

    if (dateFrom) {
      const from = Number(dateFrom);
      if (!Number.isNaN(from)) {
        conditions.push('received_at >= ?');
        params.push(from);
      }
    }

    if (dateTo) {
      const to = Number(dateTo);
      if (!Number.isNaN(to)) {
        conditions.push('received_at <= ?');
        params.push(to);
      }
    }

    const where = conditions.join(' AND ');

    // COUNT query uses the same WHERE so the client knows how many pages there are
    const countRow = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM package_emails WHERE ${where}`,
      params
    );

    const total = countRow?.total ?? 0;

    // Main SELECT — append limit/offset as positional params after the WHERE params
    const results = await query<EmailRow>(
      `SELECT id, gmail_thread_id, subject, sender, received_at, grok_signal
         FROM package_emails
        WHERE ${where}
        ORDER BY received_at DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ data: { results, total } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
