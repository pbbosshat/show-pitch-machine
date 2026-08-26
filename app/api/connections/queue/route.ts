/**
 * GET /api/connections/queue?status=pending&channel=linkedin
 * Auth: Bearer INGEST_API_KEY (same key Bang uses). NOT session — this is polled
 *       by the Shawn LinkedIn engine on Bubba, which has no browser session.
 * Response: { items: [ { queue_id, lead_id, name, linkedin_url, note, email, queued_at } ] }
 *
 * Returns pending LinkedIn queue rows and marks them 'picked' so a second poll
 * does not hand the same invite out twice.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { capLiNote } from '@/lib/connections/li-note';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function checkBearer(req: NextRequest): boolean {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === key;
}

export async function GET(request: NextRequest) {
  if (!checkBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  const channel = searchParams.get('channel') || 'linkedin';

  const rows = await query<{
    queue_id: string;
    lead_id: string;
    name: string;
    linkedin_url: string | null;
    note: string | null;
    email: string | null;
    queued_at: number | null;
  }>(
    `SELECT cq.id AS queue_id, cq.lead_id, cl.person_name AS name, cl.linkedin_url,
            cl.draft_li_note AS note, cl.email, cq.queued_at
       FROM connect_queue cq
       JOIN connection_leads cl ON cl.id = cq.lead_id
      WHERE cq.status = ? AND cq.channel = ?
      ORDER BY cq.queued_at ASC`,
    [status, channel]
  );

  // Only flip rows we actually handed out (status still 'pending') to 'picked'.
  const now = Date.now();
  for (const r of rows) {
    await run(`UPDATE connect_queue SET status = 'picked', picked_at = ? WHERE id = ? AND status = 'pending'`, [now, r.queue_id]);
  }

  // Last gate before the note leaves for the LinkedIn sender. draft_li_note is
  // read live here (not from the queued payload), so rows drafted before the
  // 200-char policy still go out shortened rather than over-length.
  const items = rows.map((r) => ({ ...r, note: r.note ? capLiNote(r.note) : r.note }));

  return NextResponse.json({ items });
}
