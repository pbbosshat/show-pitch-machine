/**
 * POST /api/fin/auth/logout — ends the MYE Admin session and clears the cookie.
 * Always 200 (idempotent), even if not signed in.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { FIN_SESSION_COOKIE, destroyFinSession, finSessionCookieOptions } from '@/lib/fin/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(FIN_SESSION_COOKIE)?.value;
  try {
    await destroyFinSession(token);
  } catch (err) {
    console.error('[fin logout] error:', err);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FIN_SESSION_COOKIE, '', { ...finSessionCookieOptions(), maxAge: 0 });
  return res;
}
