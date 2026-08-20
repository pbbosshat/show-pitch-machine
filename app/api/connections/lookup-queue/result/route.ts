/**
 * POST /api/connections/lookup-queue/result
 * Auth: Bearer INGEST_API_KEY.
 * Body: { queue_id, lead_id, linkedin_url?, status?: 'found'|'not_found'|'failed', detail? }
 * Response: { ok: true, applied: boolean }
 *
 * The Bang LinkedIn worker reports back here after searching as Shawn. Mirrors
 * /api/connections/queue/result — same auth, same close-the-row shape.
 *
 * Writing the profile URL onto the lead is the entire point: once it lands, the
 * lead becomes queueable for a real invite through the existing /connect path,
 * with no further human step.
 */
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

export const runtime = 'nodejs';

// Same shape the PATCH route enforces, for the same reason: a bad value here
// would be written straight onto a lead and later handed to the invite sender.
const LINKEDIN_URL = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/]+/i;

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

  try {
    const body = (await request.json()) as {
      queue_id?: string;
      lead_id?: string;
      linkedin_url?: string | null;
      status?: string;
      detail?: string | null;
    };

    const queueId = (body.queue_id ?? '').trim();
    const leadId = (body.lead_id ?? '').trim();
    if (!queueId || !leadId) {
      return NextResponse.json({ error: 'queue_id and lead_id are required' }, { status: 400 });
    }

    const url = (body.linkedin_url ?? '').trim();
    const found = !!url;

    if (found && !LINKEDIN_URL.test(url)) {
      return NextResponse.json(
        { error: `Not a LinkedIn profile URL: "${url.slice(0, 80)}"` },
        { status: 400 }
      );
    }

    let applied = false;
    if (found) {
      // Never overwrite a profile already on the lead — a human may have pasted
      // one, or an earlier enrichment found it, and either beats a search guess.
      // Same rule as enrichment: only ever ADD.
      const lead = await queryOne<{ linkedin_url: string | null }>(
        'SELECT linkedin_url FROM connection_leads WHERE id = ?',
        [leadId]
      );
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

      if (!lead.linkedin_url) {
        await run(
          'UPDATE connection_leads SET linkedin_url = ?, updated_at = ? WHERE id = ?',
          [url, Date.now(), leadId]
        );
        applied = true;
      }
    }

    const status = found ? 'sent' : body.status === 'failed' ? 'failed' : 'not_found';
    const detail = found
      ? `linkedin: ${url}`
      : (body.detail ?? 'no confident profile match').slice(0, 240);

    await run(
      `UPDATE connect_queue SET status = ?, result_detail = ?, completed_at = ?
        WHERE id = ? AND channel = 'linkedin_lookup'`,
      [status, detail, Date.now(), queueId]
    );

    return NextResponse.json({ ok: true, applied });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
