/**
 * POST /api/auth/logout
 * Called by: Logout button in the app nav (browser)
 * Auth: spm_session cookie — no error if missing, cookie is cleared regardless
 * Response: { ok: true }
 *
 * Deletes the server-side session row and instructs the browser to expire the
 * cookie. Must await deleteSession — it writes to Postgres and without await
 * the DELETE fires but the handler returns before it commits, creating a race
 * where the next request can still find the session row briefly alive.
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Await is required — deleteSession is async (writes to Postgres).
  // Without it the DELETE may not commit before the response is sent,
  // allowing a racing follow-up request to find the session still valid.
  if (token) await deleteSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}
