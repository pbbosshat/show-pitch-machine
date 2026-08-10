/**
 * POST /api/connections/[id]/enrich
 * Auth: session.
 * Response: the enriched lead row.
 *
 * Runs dedup (Gmail + Calendar), Apollo (email + LinkedIn URL), and Shawn-voice
 * draft generation for one lead. Also the Tier 3 "Add to connect list"
 * promotion path: a Tier 3 lead is bumped to Tier 2 before enriching.
 */
import { NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { enrichLead } from '@/lib/connections/build';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const lead = await queryOne<{ tier: number }>('SELECT tier FROM connection_leads WHERE id = ?', [id]);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // Tier 3 promotion: bump to Tier 2 so it renders in the main table after enrich.
    if (Number(lead.tier) === 3) {
      await run(
        `UPDATE connection_leads SET tier = 2, tier_reason = 'Promoted by user (Add to connect list).', updated_at = ? WHERE id = ?`,
        [Date.now(), id]
      );
    }

    const updated = await enrichLead(id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
