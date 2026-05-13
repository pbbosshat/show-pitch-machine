// POST /api/auth/setup-account — consume a 72-hour invite token, set name + password,
// and auto-log the user in by issuing a session cookie.
//
// Body: { token: string; name?: string; password: string }
// On success: sets spm_session cookie + returns { ok: true }
// On failure: returns { error } with 4xx status.

import { NextResponse } from 'next/server';
import {
  validateInviteToken,
  clearInviteToken,
  createPasswordHash,
  createSession,
  ensureAuthSchema,
  SESSION_COOKIE,
} from '@/lib/auth';
import { run } from '@/lib/db';

export async function POST(request: Request) {
  await ensureAuthSchema();

  const body = await request.json().catch(() => ({})) as {
    token?: string;
    name?: string;
    password?: string;
  };

  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await validateInviteToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invite link is invalid or has expired' }, { status: 400 });
  }

  const name = body.name?.trim() || user.name;

  await run(
    'UPDATE team_users SET name = ?, password_hash = ?, updated_at = ? WHERE id = ?',
    [name, createPasswordHash(password), Date.now(), user.id]
  );
  await clearInviteToken(user.id);

  // Issue a session so the user lands directly on the dashboard
  const sessionToken = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
