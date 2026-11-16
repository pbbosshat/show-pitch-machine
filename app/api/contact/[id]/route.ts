/**
 * PATCH /api/contact/[id]
 * Called by: Leads table in admin UI (inline status select, Notes box)
 * Auth: spm_session cookie required — returns 401 if missing or expired.
 *   Checked inside the handler; middleware only guards cookie presence, and
 *   /api/contact/[id] is NOT on its public list (only exact /api/contact is).
 * Body (JSON): { status?: LeadStatus, notes?: string | null }
 *   - status must be one of LEAD_STATUSES (lib/lead-meta.ts)
 *   - notes is trimmed; '' or null clears it; max LEAD_NOTES_MAX characters
 *   - at least one of the two must be sent, otherwise 400
 *   - `'notes' in body` distinguishes "clear the notes" from "notes not sent"
 * Response: { data: { id, status, notes, status_changed_at, status_changed_by } }
 *           400 invalid body, 401 not authenticated, 404 lead not found
 *
 * status_changed_at / status_changed_by are stamped ONLY when the status
 * actually changes, so re-saving the same status or editing notes does not
 * overwrite who last moved the lead.
 */

/**
 * DELETE /api/contact/[id]
 * Called by: Leads table in admin UI (browser, authenticated)
 * Auth: spm_session cookie required — returns 401 if missing or expired
 * Response: { data: { deleted: true } } on success
 *           404 if lead not found, 401 if not authenticated
 *
 * Auth check MUST be awaited — getSessionUser is async and a non-awaited call
 * returns a truthy Promise regardless of session validity, making this endpoint
 * callable without a valid session (any request with any cookie passes the check).
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { LEAD_NOTES_MAX, isLeadStatus } from '@/lib/lead-meta';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Must await — see DELETE below for why a non-awaited call is an auth bypass.
  const caller = token ? await getSessionUser(token) : null;
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;

  const hasStatus = 'status' in body && body.status !== undefined;
  const hasNotes = 'notes' in body;

  if (!hasStatus && !hasNotes) {
    return NextResponse.json({ error: 'Send status and/or notes' }, { status: 400 });
  }

  let status: string | undefined;
  if (hasStatus) {
    if (!isLeadStatus(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    status = body.status;
  }

  let notes: string | null = null;
  if (hasNotes) {
    if (body.notes !== null && typeof body.notes !== 'string') {
      return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 });
    }
    const trimmed = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (trimmed.length > LEAD_NOTES_MAX) {
      return NextResponse.json(
        { error: `Notes must be ${LEAD_NOTES_MAX} characters or fewer` },
        { status: 400 }
      );
    }
    notes = trimmed === '' ? null : trimmed;
  }

  const existing = await queryOne<{ id: string; status: string }>(
    'SELECT id, status FROM contact_leads WHERE id = ?',
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  // Build the SET list dynamically — never COALESCE(?, col): an untyped NULL
  // parameter makes Postgres fail to infer the type.
  const sets: string[] = [];
  const values: unknown[] = [];

  if (status !== undefined) {
    sets.push('status = ?');
    values.push(status);
    if (status !== existing.status) {
      sets.push('status_changed_at = ?', 'status_changed_by = ?');
      values.push(Date.now(), caller.name);
    }
  }
  if (hasNotes) {
    sets.push('notes = ?');
    values.push(notes);
  }

  const updated = await queryOne<{
    id: string;
    status: string;
    notes: string | null;
    status_changed_at: number | null;
    status_changed_by: string | null;
  }>(
    `UPDATE contact_leads SET ${sets.join(', ')} WHERE id = ?
     RETURNING id, status, notes, status_changed_at, status_changed_by`,
    [...values, id]
  );
  if (!updated) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Must await — without it caller is a non-null Promise (always truthy)
  // and the !caller guard never fires, allowing unauthenticated deletes.
  const caller = token ? await getSessionUser(token) : null;
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await queryOne<{ id: string }>('SELECT id FROM contact_leads WHERE id = ?', [id]);
  if (!existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { changes } = await run('DELETE FROM contact_leads WHERE id = ?', [id]);

  if (changes === 0) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
