/**
 * GET /api/connections?date=YYYY-MM-DD
 * Auth: session.
 * Response: { data: ConnectionLead[] (joined with article headline+url), counts }
 *
 * Lists the leads for a build day (default today), tier-ordered. The client
 * recomputes tier counts, but we return them too for convenience.
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
    const date = searchParams.get('date') || todayLocalISO();

    const rows = await query<JoinedLead>(
      `SELECT cl.*, ta.headline AS article_headline, ta.url AS article_url
         FROM connection_leads cl
         LEFT JOIN trade_articles ta ON ta.id = cl.article_id
        WHERE cl.lead_date = ?
        ORDER BY cl.tier ASC, cl.created_at DESC`,
      [date]
    );

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
