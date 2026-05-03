/**
 * POST /api/gmail/poll
 * Called by: dashboard "Poll Now" button, cron job, curl
 * Auth: none
 * Response: { data: { processed: number, moved: number } }
 *
 * Manually triggers the Gmail pipeline email poller.
 * Imports pollPipelineEmails from @/lib/email-poller dynamically to avoid
 * loading googleapis at Next.js startup on every request.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Dynamic import keeps google-auth-library out of the startup bundle
    const { pollPipelineEmails } = await import('@/lib/email-poller');
    const result = await pollPipelineEmails();

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
