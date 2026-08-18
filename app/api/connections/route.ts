/**
 * GET /api/connections?date=YYYY-MM-DD
 * GET /api/connections?mode=pending
 * Auth: session.
 * Response: { data: ConnectionLead[] (joined with article headline+url), counts }
 *
 * Lists the leads for a build day (default today), tier-ordered. The client
 * recomputes tier counts, but we return them too for convenience.
 *
 * mode=pending — rolling 14-day uncleared stack. Returns all leads where status is
 * still actionable (not yet sent/skipped/failed), from the last 14 days, ordered by
 * tier ASC then lead_date DESC so today's highest-tier leads float to the top.
 * This is the "All Pending" view Shawn sees by default so he doesn't have to
 * manually flip the date picker to catch up on backlogged leads.
 */
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { todayLocalISO, type ConnectionLeadRow } from '@/lib/connections/build';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type JoinedLead = ConnectionLeadRow & {
  article_headline: string | null;
  article_url: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    let rows: JoinedLead[];

    if (mode === 'pending') {
      // Rolling uncleared stack — all leads from the past 14 days that are still
      // actionable. 'queued' is included because Bubba hasn't resolved them yet
      // and Shawn may want to see their state. 'failed' is excluded — those need
      // investigation, not another send attempt.
      rows = await query<JoinedLead>(
        `SELECT cl.*, ta.headline AS article_headline, ta.url AS article_url
           FROM connection_leads cl
           LEFT JOIN trade_articles ta ON ta.id = cl.article_id
          WHERE cl.status IN ('new', 'enriching', 'ready', 'queued')
            AND cl.lead_date >= to_char(CURRENT_DATE - INTERVAL '14 days', 'YYYY-MM-DD')
          ORDER BY cl.tier ASC, cl.lead_date DESC, cl.created_at DESC`,
        []
      );
    } else {
      // Default: single-day view keyed by ?date= (backward-compatible)
      const date = searchParams.get('date') || todayLocalISO();
      rows = await query<JoinedLead>(
        `SELECT cl.*, ta.headline AS article_headline, ta.url AS article_url
           FROM connection_leads cl
           LEFT JOIN trade_articles ta ON ta.id = cl.article_id
          WHERE cl.lead_date = ?
          ORDER BY cl.tier ASC, cl.created_at DESC`,
        [date]
      );
    }

    const counts = { tier1: 0, tier2: 0, tier3: 0 };
    for (const r of rows) {
      if (r.tier === 1) counts.tier1++;
      else if (r.tier === 2) counts.tier2++;
      else counts.tier3++;
    }

    return NextResponse.json({ data: rows, counts });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
