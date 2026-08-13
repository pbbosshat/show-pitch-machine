/**
 * POST /api/connections/[id]/send-email
 * Auth: session (internal admin surface — middleware gates /api/connections/*).
 * Body: { to?, subject, body }   — the edited copy from the compose modal.
 * Response: 200 { ok: true, message_id, scope_used }
 *           4xx/5xx { error } with the exact reason (never a silent success).
 *
 * Why this exists separately from /api/connections/connect:
 *   /connect is the bulk path — it fans out over selected leads and both
 *   channels, and it sends whatever draft is stored on the row. The compose
 *   modal needs the opposite: ONE lead, and the copy the user just edited on
 *   screen (possibly from a template), which may differ from what is stored.
 *   Reusing /connect would have meant persisting the edit first and then
 *   sending blind.
 *
 * This route deliberately does NOT touch the LinkedIn side. LinkedIn invites
 * stay queued through /connect for the Bubba poller — nothing here changes that.
 *
 * Every attempt writes a connect_queue row before the send so that a failure is
 * still auditable (same invariant /connect relies on).
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, run } from '@/lib/db';
import { sendConnectEmail } from '@/lib/connections/send';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface LeadRow {
  id: string;
  person_name: string;
  email: string | null;
  email_status: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      to?: string;
      subject?: string;
      body?: string;
    };

    const subject = (body.subject ?? '').trim();
    const text = (body.body ?? '').trim();
    if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    if (!text) return NextResponse.json({ error: 'Email body is required' }, { status: 400 });

    const lead = await queryOne<LeadRow>(
      'SELECT id, person_name, email, email_status FROM connection_leads WHERE id = ?',
      [id]
    );
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    // The modal may override the address (typo fix / better address found), but
    // fall back to the stored one. Basic shape check only — Gmail is the real
    // validator and its error is surfaced verbatim below.
    const to = (body.to ?? lead.email ?? '').trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: `Not a valid recipient address: "${to || '(empty)'}"` }, { status: 400 });
    }

    const qid = randomUUID();
    await run(
      `INSERT INTO connect_queue (id, lead_id, channel, payload, status, queued_at)
       VALUES (?, ?, 'email', ?, 'pending', ?)`,
      [qid, id, JSON.stringify({ subject, body: text, to }), Date.now()]
    );

    // Local/preview escape hatch. Lets the compose flow be demoed end-to-end on
    // localhost, where the Google service-account key is not present. NEVER set
    // this on Railway — production must really send or really fail.
    if (process.env.CONNECTIONS_EMAIL_DRY_RUN === '1') {
      await run(
        `UPDATE connect_queue SET status = 'sent', result_detail = ?, completed_at = ? WHERE id = ?`,
        ['DRY RUN — not actually sent', Date.now(), qid]
      );
      await run(`UPDATE connection_leads SET status = 'sent', updated_at = ? WHERE id = ?`, [Date.now(), id]);
      return NextResponse.json({ ok: true, message_id: 'dry-run', scope_used: 'dry-run', dry_run: true });
    }

    try {
      const result = await sendConnectEmail(to, subject, text);
      await run(
        `UPDATE connect_queue SET status = 'sent', result_detail = ?, completed_at = ? WHERE id = ?`,
        [`gmail:${result.id}`, Date.now(), qid]
      );
      await run(`UPDATE connection_leads SET status = 'sent', updated_at = ? WHERE id = ?`, [Date.now(), id]);
      return NextResponse.json({ ok: true, message_id: result.id, scope_used: result.scopeUsed });
    } catch (err) {
      const msg = (err as Error).message;
      await run(
        `UPDATE connect_queue SET status = 'failed', result_detail = ?, completed_at = ? WHERE id = ?`,
        [msg, Date.now(), qid]
      );
      await run(`UPDATE connection_leads SET status = 'failed', updated_at = ? WHERE id = ?`, [Date.now(), id]);
      // 502: we reached Google and Google refused — not the caller's fault.
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
