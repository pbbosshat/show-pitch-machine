// GET /api/me — returns the current authenticated user from the session cookie.
// PATCH /api/me — updates the current user's name. Body: { name: string }
// Returns 401 if no valid session exists.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, ensureAuthSchema, SESSION_COOKIE } from '@/lib/auth';
import { run } from '@/lib/db';

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

export async function PATCH(request: NextRequest) {
  ensureAuthSchema();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionUser = token ? getSessionUser(token) : null;
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name } = body as Record<string, string>;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  await run(
    'UPDATE team_users SET name = ?, updated_at = ? WHERE id = ?',
    [name.trim(), Date.now(), sessionUser.id]
  );

  return NextResponse.json({ ok: true });
}
