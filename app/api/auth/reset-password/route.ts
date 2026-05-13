// POST /api/auth/reset-password — set a new password using a valid reset token.
// Body: { token: string; newPassword: string }
// Tokens are 6-hour single-use; consumed on success.

import { NextResponse } from 'next/server';
import { validateResetToken, clearResetToken, createPasswordHash, ensureAuthSchema } from '@/lib/auth';
import { run } from '@/lib/db';

export async function POST(request: Request) {
  ensureAuthSchema();

  const body = await request.json().catch(() => ({}));
  const { token, newPassword } = body as { token?: string; newPassword?: string };

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'token and newPassword are required' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = validateResetToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 });
  }

  await run(
    'UPDATE team_users SET password_hash = ?, updated_at = ? WHERE id = ?',
    [createPasswordHash(newPassword), Date.now(), user.id]
  );
  clearResetToken(user.id);

  return NextResponse.json({ ok: true });
}
