/**
 * GET /api/dev-session
 * Called by: Local development only — browser shortcut or test script
 * Auth: none — disabled in production (returns 404 when NODE_ENV === 'production')
 * Query params: email (default: patrickbryant@gototeam.com), redirect (default: /decks)
 * Response: HTTP redirect to `redirect` with spm_session cookie set
 *
 * Creates a real session for the specified user without requiring a password —
 * eliminates the login round-trip during local development. Hard-gated by
 * NODE_ENV so it cannot be activated on Railway even if the route file ships.
 * Uses x-forwarded-host to redirect through Caddy (mye.local) rather than
 * the raw Next.js port, keeping the session cookie's domain correct.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE } from '@/lib/auth';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 'patrickbryant@gototeam.com';
  const redirect = searchParams.get('redirect') || '/decks';

  const user = await queryOne<{ id: string }>('SELECT id FROM team_users WHERE lower(email) = lower(?)', [email]);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const token = await createSession(user.id);
  // Use x-forwarded-host so the redirect goes back through Caddy (mye.local),
  // not the raw Next.js port (localhost:3000) which doesn't have SSL.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'mye.local';
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const response = NextResponse.redirect(`${proto}://${host}${redirect}`);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
