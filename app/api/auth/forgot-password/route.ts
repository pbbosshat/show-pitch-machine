// POST /api/auth/forgot-password — generate a password-reset token for the given email.
// This is an internal local tool; we return the reset URL directly in the response
// so an admin can copy and share it (no external email server is configured for user auth).
// Body: { email: string }
// Response: { ok: true, resetUrl?: string }  — resetUrl present only when email matches a user

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { createResetToken, ensureAuthSchema } from '@/lib/auth';

export async function POST(request: Request) {
  ensureAuthSchema();

  const body = await request.json().catch(() => ({}));
  const { email } = body as { email?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = queryOne<{ id: string }>(
    'SELECT id FROM team_users WHERE lower(email) = lower(?)',
    [email.trim()]
  );

  if (!user) {
    // Always return 200 to prevent email enumeration
    return NextResponse.json({ ok: true });
  }

  const token = createResetToken(user.id);
  return NextResponse.json({ ok: true, resetUrl: `/reset-password?token=${token}` });
}
