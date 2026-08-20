/**
 * GET /api/connections/lookup-queue?limit=5
 * Auth: Bearer INGEST_API_KEY — polled by the SPM LinkedIn lookup worker on
 *       Bang, which has no browser session. Same auth as the invite queue.
 * Response: { items: [ { queue_id, lead_id, name, company, reason }] }
 *
 * Hands out exec-tier leads that still have no LinkedIn profile so the worker
 * can search for one as Shawn and post the URL back to ./result.
 *
 * Mirrors /api/connections/queue deliberately: same table, same auth, same
 * hand-out-then-mark-picked shape. The invite consumer has run this pattern in
 * production since 2026-08-13, so there is no reason to invent a second one.
 *
 * Reuses connect_queue with channel='linkedin_lookup' rather than adding a
 * table: it already carries status/picked_at/completed_at/result_detail, and a
 * row per attempt is exactly the audit trail we want. No migration needed.
 *
 * A lead is only handed out ONCE — any existing lookup row (pending, picked or
 * completed) excludes it. Without that, a lead nobody can find would be
 * re-searched on every poll forever, burning LinkedIn searches on Shawn's
 * account for a guaranteed miss. Re-searching later is a deliberate act:
 * delete its queue row.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { query, run } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Small by default. Each item costs a LinkedIn search on the account that also
// sends the outreach, and burst searching is what gets accounts rate-limited.
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 15;

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
  const limit = Math.min(Number(searchParams.get('limit')) || DEFAULT_LIMIT, MAX_LIMIT);

  const rows = await query<{
    lead_id: string;
    name: string;
    company: string | null;
    reason: string | null;
  }>(
    `SELECT cl.id AS lead_id, cl.person_name AS name, cl.company, cl.reason
       FROM connection_leads cl
      WHERE cl.tier <= 2
        AND cl.linkedin_url IS NULL
        AND cl.status NOT IN ('sent', 'skipped')
        AND NOT EXISTS (
              SELECT 1 FROM connect_queue q
               WHERE q.lead_id = cl.id AND q.channel = 'linkedin_lookup'
            )
      ORDER BY cl.tier ASC, cl.lead_date DESC
      LIMIT ?`,
    [limit]
  );

  // Claim each one before handing it out, so two overlapping polls cannot
  // search the same person twice.
  const now = Date.now();
  const items = [];
  for (const r of rows) {
    const qid = randomUUID();
    await run(
      `INSERT INTO connect_queue (id, lead_id, channel, payload, status, queued_at, picked_at)
       VALUES (?, ?, 'linkedin_lookup', ?, 'picked', ?, ?)`,
      [qid, r.lead_id, JSON.stringify({ name: r.name, company: r.company }), now, now]
    );
    items.push({ queue_id: qid, ...r });
  }

  return NextResponse.json({ items });
}
