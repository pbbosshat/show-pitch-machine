// GET /api/me — returns the current authenticated user from the session cookie.
// Returns 401 if no valid session exists (middleware will have already redirected
// the browser, but API callers need the status code).

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, ensureAuthSchema, SESSION_COOKIE } from '@/lib/auth';

export async function GET(request: NextRequest) {
  ensureAuthSchema();
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = getSessionUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  return NextResponse.json({ data: user });
}
