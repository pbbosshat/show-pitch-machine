/**
 * POST /api/auth/reset-password
 * Called by: Reset-password form linked from the forgot-password email (browser)
 * Auth: none — authenticated by the one-time reset token in the request body
 * Body: { token: string; newPassword: string }
 * Response: { ok: true } on success, { error } with 400 on invalid/expired token
 *
 * Validates the 6-hour single-use token, updates the password hash, and
 * immediately clears the token to prevent reuse. Does NOT issue a session —
 * the user is redirected to login after a successful reset.
 */

import { NextResponse } from 'next/server';
import { validateResetToken, clearResetToken, createPasswordHash, ensureAuthSchema } from '@/lib/auth';
import { run } from '@/lib/db';

export async function POST(request: Request) {
  await ensureAuthSchema();

  const body = await request.json().catch(() => ({}));
  const { token, newPassword } = body as { token?: string; newPassword?: string };

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'token and newPassword are required' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await validateResetToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 });
  }

  await run(
    'UPDATE team_users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [createPasswordHash(newPassword), Date.now(), user.id]
  );
  await clearResetToken(user.id);

  return NextResponse.json({ ok: true });
}
