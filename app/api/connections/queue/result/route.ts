/**
 * POST /api/connections/queue/result
 * Auth: Bearer INGEST_API_KEY.
 * Body: { queue_id, status, detail?, completed_at? }
 * Response: { ok: true }
 *
 * The Bubba poller writes back the outcome of a LinkedIn invite. We update the
 * queue row and flip the parent lead's status accordingly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

export const runtime = 'nodejs';

function checkBearer(req: NextRequest): boolean {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === key;
}

export async function POST(request: NextRequest) {
  if (!checkBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    queue_id?: string;
    status?: string;
    detail?: string;
    completed_at?: number;
  };

  if (!body.queue_id || !body.status) {
    return NextResponse.json({ error: 'queue_id and status are required' }, { status: 400 });
  }

  await run(
    `UPDATE connect_queue SET status = ?, result_detail = ?, completed_at = ? WHERE id = ?`,
    [body.status, body.detail ?? null, body.completed_at ?? Date.now(), body.queue_id]
  );

  // Reflect the outcome on the parent lead so the tab shows the final state.
  const q = await queryOne<{ lead_id: string }>('SELECT lead_id FROM connect_queue WHERE id = ?', [body.queue_id]);
  if (q) {
    const leadStatus =
      ['sent', 'already_connected', 'pending_invite'].includes(body.status)
        ? 'sent'
        : body.status === 'failed'
        ? 'failed'
        : body.status === 'skipped'
        ? 'skipped'
        : 'queued';
    await run(`UPDATE connection_leads SET status = ?, updated_at = ? WHERE id = ?`, [leadStatus, Date.now(), q.lead_id]);
  }

  return NextResponse.json({ ok: true });
}
