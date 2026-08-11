/**
 * POST /api/cron/connections-build
 * Called by Bang's SPM-Connections-Build scheduled task at 7:00 AM daily
 * (after SPM-Daily-Scrape finishes at ~6:15-6:30 AM so articles are current).
 *
 * Auth: Bearer CRON_SECRET header — not a session cookie. This lets Bang
 * call it without a logged-in user. The middleware exempts /api/cron/ from
 * session enforcement; this handler enforces its own secret check.
 *
 * Idempotent: re-running the same day skips already-built leads (ON CONFLICT
 * DO NOTHING in buildDailyConnections), so it's safe if Bang fires twice.
 */
import { NextResponse } from 'next/server';
import { buildDailyConnections } from '@/lib/connections/build';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  // Validate the CRON_SECRET Bearer token before doing any work.
  const auth = request.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildDailyConnections(1);
    console.log('[cron/connections-build] done', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/connections-build] error', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
