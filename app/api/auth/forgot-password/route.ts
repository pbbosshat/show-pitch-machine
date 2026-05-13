/**
 * POST /api/auth/forgot-password
 * Called by: Forgot-password form on the login page (browser)
 * Auth: none — intentionally public so unauthenticated users can request a reset
 * Body: { email: string }
 * Response: { ok: true } — always 200 to prevent email enumeration; resetUrl
 *   is included in the response body only when the email matches a known user
 *   (no external email server — admin copies the URL and shares it manually).
 *
 * Generates a 6-hour single-use password-reset token and returns the reset URL
 * inline. The deliberately sparse 200 response on unknown-email prevents an
 * attacker from enumerating which email addresses have accounts.
 */

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { createResetToken, ensureAuthSchema } from '@/lib/auth';

export async function POST(request: Request) {
  await ensureAuthSchema();

  const body = await request.json().catch(() => ({}));
  const { email } = body as { email?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = await queryOne<{ id: string }>(
    'SELECT id FROM team_users WHERE lower(email) = lower(?)',
    [email.trim()]
  );

  if (!user) {
    // Always return 200 to prevent email enumeration
    return NextResponse.json({ ok: true });
  }

  // createResetToken is async — must await so we get the raw token string, not a Promise.
  // Without await the reset URL becomes `/reset-password?token=[object Promise]`.
  const token = await createResetToken(user.id);
  return NextResponse.json({ ok: true, resetUrl: `/reset-password?token=${token}` });
}
