/**
 * PATCH /api/connections/[id]
 * Auth: session.
 * Body: partial lead — any of draft_email_subject, draft_email_body,
 *       draft_li_note, tier, status.
 * Response: the updated lead row.
 *
 * Used by inline draft edits (on blur) and tier/skip changes. Only whitelisted
 * columns are writable so a client cannot rewrite dedup/enrichment fields.
 */
import { NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

export const runtime = 'nodejs';

const EDITABLE = ['draft_email_subject', 'draft_email_body', 'draft_li_note', 'tier', 'status'] as const;

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const key of EDITABLE) {
      if (key in body) {
        let v = body[key];
        // Enforce the LinkedIn note hard cap server-side too, not just in the UI.
        if (key === 'draft_li_note' && typeof v === 'string' && v.length > 200) {
          v = v.slice(0, 200);
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
