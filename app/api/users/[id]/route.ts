// DELETE /api/users/[id] — remove a team member (owner/admin only)
//
// Rules enforced server-side:
//   • Caller must be owner or admin
//   • Caller cannot remove themselves
//   • Only an owner can remove another owner (admins cannot)
// Also deletes all active sessions for the removed user.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, ensureAuthSchema, SESSION_COOKIE } from '@/lib/auth';
import { run, queryOne } from '@/lib/db';

function isPrivileged(role: string | null): boolean {
  return role === 'owner' || role === 'admin';
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureAuthSchema();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const caller = token ? getSessionUser(token) : null;
  if (!caller || !isPrivileged(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: targetId } = await params;

  if (targetId === caller.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
  }

  const target = await queryOne<{ id: string; name: string; role: string | null }>(
    'SELECT id, name, role FROM team_users WHERE id = ?',
    [targetId]
  );
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Admins cannot remove owners — only owners can remove owners
  if (target.role === 'owner' && caller.role !== 'owner') {
    return NextResponse.json({ error: 'Only an Owner can remove another Owner' }, { status: 403 });
  }

  // CASCADE on sessions table handles session cleanup automatically
  await run('DELETE FROM team_users WHERE id = ?', [targetId]);

  return NextResponse.json({ data: { id: targetId, name: target.name } });
}
