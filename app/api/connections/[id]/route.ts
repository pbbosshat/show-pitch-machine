/**
 * PATCH /api/connections/[id]
 * Auth: session.
 * Body: partial lead — any of draft_email_subject, draft_email_body,
 *       draft_li_note, tier, status.
 * Response: the updated lead row.
 *
 * Used by draft edits, tier/skip changes, and manual contact entry. Only
 * whitelisted columns are writable so a client cannot rewrite dedup fields.
 */
import { NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { capLiNote } from '@/lib/connections/li-note';

export const runtime = 'nodejs';

// email and linkedin_url are user-editable ON PURPOSE. Apollo resolves roughly
// 60% of exec-tier leads; before this, a lead it missed was a dead end on
// screen — no way to record a contact found by hand, so the row sat in the list
// forever. They stay separate from the dedup/enrichment columns, which remain
// read-only.
const EDITABLE = [
  'draft_email_subject',
  'draft_email_body',
  'draft_li_note',
  'tier',
  'status',
  'email',
  'linkedin_url',
] as const;

/** Statuses a client may set. Guards against a typo parking a lead in limbo. */
const VALID_STATUS = new Set(['new', 'enriching', 'ready', 'queued', 'sent', 'skipped', 'failed']);

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of EDITABLE) {
      if (key in body) {
        let v = body[key];

        // Enforce the LinkedIn note hard cap server-side too, not just in the
        // UI. Shorten, never reject — same helper the drafter uses.
        if (key === 'draft_li_note' && typeof v === 'string') {
          v = capLiNote(v);
        }

        if (key === 'status' && typeof v === 'string' && !VALID_STATUS.has(v)) {
          return NextResponse.json(
            { error: `Invalid status "${v}". Expected one of: ${[...VALID_STATUS].join(', ')}` },
            { status: 400 }
          );
        }

        // Blank means "clear it" — normalise to NULL rather than storing '' so
        // the COUNT(email)/IS NOT NULL checks elsewhere stay truthful.
        if ((key === 'email' || key === 'linkedin_url') && typeof v === 'string' && !v.trim()) {
          v = null;
        }

        if (key === 'email' && typeof v === 'string') {
          const em = v.trim();
          v = em;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
            return NextResponse.json({ error: `Not a valid email address: "${em}"` }, { status: 400 });
          }
          // A hand-entered address never came from Apollo, so it must not claim
          // 'verified'. 'manual' records where it came from and is accepted by
          // the send gate alongside 'verified'.
          sets.push('email_status = ?');
          vals.push('manual');
        }

        if (key === 'linkedin_url' && typeof v === 'string') {
          const lu = v.trim();
          v = lu;
          if (!/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/]+/i.test(lu)) {
            return NextResponse.json(
              { error: `Not a LinkedIn profile URL: "${lu}" (expected https://www.linkedin.com/in/…)` },
              { status: 400 }
            );
          }
        }

        sets.push(`${key} = ?`);
        vals.push(v);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No editable fields in body' }, { status: 400 });
    }

    sets.push('updated_at = ?');
    vals.push(Date.now());
    vals.push(id);

    await run(`UPDATE connection_leads SET ${sets.join(', ')} WHERE id = ?`, vals);

    const row = await queryOne('SELECT * FROM connection_leads WHERE id = ?', [id]);
    if (!row) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
