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
