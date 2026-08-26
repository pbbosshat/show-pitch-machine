/**
 * POST /api/connections/connect
 * Auth: session.
 * Body: { lead_ids: string[], channels: ('email'|'linkedin')[] }
 * Response: { results: { lead_id, channel, status, detail }[] }
 *
 * Guards: email requires email_status='verified'; linkedin requires linkedin_url.
 * Email is attempted inline (Gmail API as sm@gototeam.com). gmail.send is not yet
 * granted for this client, so the send throws unauthorized_client, which we catch
 * and report exactly (status 'failed'), never a silent success. LinkedIn rows are
 * left 'pending' in connect_queue for the Bubba poller to pick up.
 */
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { queryOne, run } from '@/lib/db';
import { sendConnectEmail } from '@/lib/connections/send';
import { capLiNote } from '@/lib/connections/li-note';

export const runtime = 'nodejs';

/** email_status values the send gate accepts. See the gate below for rationale. */
const TRUSTED_EMAIL_SOURCES = new Set(['verified', 'manual', 'gmail', 'calendar', 'contact_book']);
export const maxDuration = 120;

interface LeadRow {
  id: string;
  person_name: string;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
  draft_email_subject: string | null;
  draft_email_body: string | null;
  draft_li_note: string | null;
}

type Result = { lead_id: string; channel: string; status: string; detail: string | null };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lead_ids?: string[]; channels?: ('email' | 'linkedin')[] };
    const leadIds = Array.isArray(body.lead_ids) ? body.lead_ids : [];
    const channels = Array.isArray(body.channels) ? body.channels : [];
    if (leadIds.length === 0 || channels.length === 0) {
      return NextResponse.json({ error: 'lead_ids and channels are required' }, { status: 400 });
    }

    const results: Result[] = [];

    for (const leadId of leadIds) {
      const lead = await queryOne<LeadRow>('SELECT * FROM connection_leads WHERE id = ?', [leadId]);
      if (!lead) {
        results.push({ lead_id: leadId, channel: '', status: 'failed', detail: 'lead not found' });
        continue;
      }

      for (const channel of channels) {
        const now = Date.now();

        if (channel === 'email') {
          // Send gate: verified emails only.
          // Trusted address sources. 'verified' is Apollo's own confirmation;
          // the rest are at least as strong and all beat an inferred guess:
          //   manual       - a human typed it in deliberately
          //   gmail        - taken from a real thread between Shawn and them
          //   calendar     - taken from a meeting they attended
          //   contact_book - curated by hand in buyer_contacts
          // Apollo's 'extrapolated'/'guessed' stay excluded: those are patterns,
          // not confirmations, and bouncing hurts sender reputation.
          if (!lead.email || !TRUSTED_EMAIL_SOURCES.has(lead.email_status ?? '')) {
            results.push({
              lead_id: leadId,
              channel: 'email',
              status: 'skipped',
              detail: `no verified email (status=${lead.email_status ?? 'none'})`,
            });
            continue;
          }
          // Draft gate: never send a blank email. A lead can hold a verified
          // address but no draft yet (e.g. Apollo backfilled the email after the
          // draft pass). Skip with a clear, actionable reason instead of firing an
          // empty subject/body.
          if (!lead.draft_email_subject?.trim() || !lead.draft_email_body?.trim()) {
            results.push({
              lead_id: leadId,
              channel: 'email',
              status: 'skipped',
              detail: 'no email draft yet — enrich or redraft this lead before sending',
            });
            continue;
          }
          const qid = randomUUID();
          await run(
            `INSERT INTO connect_queue (id, lead_id, channel, payload, status, queued_at)
             VALUES (?, ?, 'email', ?, 'pending', ?)`,
            [qid, leadId, JSON.stringify({ subject: lead.draft_email_subject, body: lead.draft_email_body }), now]
          );
          try {
            await sendConnectEmail(lead.email, lead.draft_email_subject ?? '', lead.draft_email_body ?? '');
            await run(`UPDATE connect_queue SET status = 'sent', completed_at = ? WHERE id = ?`, [Date.now(), qid]);
            await run(`UPDATE connection_leads SET status = 'sent', updated_at = ? WHERE id = ?`, [Date.now(), leadId]);
            results.push({ lead_id: leadId, channel: 'email', status: 'sent', detail: null });
          } catch (err) {
            const msg = (err as Error).message;
            await run(`UPDATE connect_queue SET status = 'failed', result_detail = ?, completed_at = ? WHERE id = ?`, [msg, Date.now(), qid]);
            await run(`UPDATE connection_leads SET status = 'failed', updated_at = ? WHERE id = ?`, [Date.now(), leadId]);
            results.push({ lead_id: leadId, channel: 'email', status: 'failed', detail: msg });
          }
        } else if (channel === 'linkedin') {
          if (!lead.linkedin_url) {
            results.push({ lead_id: leadId, channel: 'linkedin', status: 'skipped', detail: 'no linkedin_url' });
            continue;
          }
          // Draft gate: never queue a blank LinkedIn note. Same reason as email —
          // a lead may carry a linkedin_url but no drafted note yet.
          if (!lead.draft_li_note?.trim()) {
            results.push({ lead_id: leadId, channel: 'linkedin', status: 'skipped', detail: 'no LinkedIn note yet — enrich or redraft this lead before sending' });
            continue;
          }
          const qid = randomUUID();
          await run(
            `INSERT INTO connect_queue (id, lead_id, channel, payload, status, queued_at)
             VALUES (?, ?, 'linkedin', ?, 'pending', ?)`,
            [
              qid,
              leadId,
              JSON.stringify({ note: capLiNote(lead.draft_li_note), email: lead.email, linkedin_url: lead.linkedin_url, name: lead.person_name }),
              now,
            ]
          );
          await run(`UPDATE connection_leads SET status = 'queued', updated_at = ? WHERE id = ?`, [Date.now(), leadId]);
          results.push({ lead_id: leadId, channel: 'linkedin', status: 'pending', detail: 'queued for Bubba' });
        } else {
          results.push({ lead_id: leadId, channel: String(channel), status: 'failed', detail: 'unknown channel' });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
