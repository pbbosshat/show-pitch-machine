/**
 * POST /api/connections/build
 * Auth: session (middleware gates /api/connections/* on the spm_session cookie).
 * Body: { days?: number }  (default 1)
 * Response: { built, skipped, byTier }
 *
 * Pulls the briefing-default article set for the window, extracts people, tiers
 * them, upserts connection_leads (idempotent), and enriches Tier 1/2 leads.
 */
import { NextResponse } from 'next/server';
import { buildDailyConnections } from '@/lib/connections/build';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Extraction + enrichment make several LLM/API calls; give the build room.
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { days?: unknown };
    const days = Number(body?.days) || 1;
    const result = await buildDailyConnections(days);
    return NextResponse.json(result);
  } catch (err) {
    // Surface the exact error (design rule: never a generic failure message).
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
