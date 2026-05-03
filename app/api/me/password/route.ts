// PATCH /api/me/password — change the current user's password.
// Requires a valid session cookie. Verifies the current password before updating.
// Body: { currentPassword?: string; newPassword: string }

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, ensureAuthSchema, verifyPassword, createPasswordHash, SESSION_COOKIE } from '@/lib/auth';
import { queryOne, run } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  ensureAuthSchema();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionUser = token ? getSessionUser(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { currentPassword, newPassword } = body as Record<string, string>;

  if (!newPassword) {
    return NextResponse.json({ error: 'newPassword is required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = queryOne<{ id: string; password_hash: string | null }>(
    'SELECT id, password_hash FROM team_users WHERE id = ?',
    [sessionUser.id]
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.password_hash) {
    if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }
  }

  run(
    'UPDATE team_users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [createPasswordHash(newPassword), Date.now(), user.id]
  );

  return NextResponse.json({ ok: true });
}
