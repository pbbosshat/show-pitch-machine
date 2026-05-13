/**
 * POST /api/auth/setup-account
 * Called by: Account setup form at /setup-account?token=... (browser, unauthenticated)
 * Auth: none — authenticated by the one-time 72-hour invite token in the request body
 * Body: { token: string; name?: string; password: string }
 * Response: { ok: true } + sets httpOnly spm_session cookie on success;
 *           { error } with 400/401 on bad token or validation failure
 *
 * Consumes the invite token (clears it to prevent reuse), sets the user's name
 * and password, then immediately issues a session so the user lands on the
 * dashboard without a separate login step.
 */

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
