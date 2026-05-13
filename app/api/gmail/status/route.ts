/**
 * GET /api/gmail/status
 * Called by: dashboard Gmail panel, email poller health check
 * Auth: none
 * Response: {
 *   data: {
 *     last_poll_at: number | null,
 *     emails_processed_today: number,
 *     last_email_subject: string | null,
 *     poller_enabled: boolean
 *   }
 * }
 *
 * Queries package_emails for today's count and most recent entry.
 * poller_enabled reflects the GMAIL_POLL_ENABLED env var (default true).
 */

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface StatusQuery {
  emails_processed_today: number;
  last_email_subject: string | null;
  last_poll_at: number | null;
}

export async function GET() {
  try {
    // Get today's midnight timestamp for the "today" count filter
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const stats = await queryOne<StatusQuery>(
      `SELECT
        COUNT(CASE WHEN processed_at >= ? THEN 1 END) AS emails_processed_today,
        (SELECT subject FROM package_emails ORDER BY received_at DESC LIMIT 1) AS last_email_subject,
        (SELECT MAX(processed_at) FROM package_emails) AS last_poll_at
       FROM package_emails`,
      [todayMs]
    );

    const pollerEnabled = process.env.GMAIL_POLL_ENABLED !== 'false';

    return NextResponse.json({
      data: {
        last_poll_at: stats?.last_poll_at ?? null,
        emails_processed_today: stats?.emails_processed_today ?? 0,
        last_email_subject: stats?.last_email_subject ?? null,
        poller_enabled: pollerEnabled,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
