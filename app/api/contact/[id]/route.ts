// DELETE /api/contact/[id] — delete a contact lead by id (auth required)
//
// Response: { data: { deleted: true } } on success
//           404 if lead not found, 401 if not authenticated

import { NextRequest, NextResponse } from 'next/server';
import { initDb, queryOne, run } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';

initDb();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const caller = token ? getSessionUser(token) : null;
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = queryOne<{ id: string }>('SELECT id FROM contact_leads WHERE id = ?', [id]);
  if (!existing) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { changes } = run('DELETE FROM contact_leads WHERE id = ?', [id]);

  if (changes === 0) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
