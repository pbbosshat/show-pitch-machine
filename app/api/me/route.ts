/**
 * GET /api/me
 * Called by: App shell / nav bar on initial load (browser)
 * Auth: spm_session cookie required — returns 401 if missing or expired
 * Response: { data: { id, name, email, role } }
 *
 * Lightweight "who am I?" endpoint used to hydrate the client-side auth state
 * after a page load. Returns the full session user shape so the UI can gate
 * features on role without a separate profile fetch.
 */

/**
 * PATCH /api/me
 * Called by: Profile settings page (browser, authenticated)
 * Auth: spm_session cookie required — returns 401 if missing or expired
 * Body: { name: string }
 * Response: { ok: true }
 *
 * Updates only the display name for the currently signed-in user. Password
 * changes go through PATCH /api/me/password instead.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, ensureAuthSchema, SESSION_COOKIE } from '@/lib/auth';
import { run } from '@/lib/db';

export async function GET(request: NextRequest) {
  await ensureAuthSchema();
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
  }

  return NextResponse.json({ data: user });
}

export async function PATCH(request: NextRequest) {
  await ensureAuthSchema();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionUser = token ? await getSessionUser(token) : null;
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
