/**
 * GET /api/settings
 * Called by: Settings page in admin UI (browser, authenticated);
 *   contact/route.ts reads leads_email at POST time
 * Auth: spm_session cookie required — returns 401 if missing or expired
 * Response: { data: Record<string, string> } (all settings) or
 *           { data: { key, value } } when ?key=<name> is supplied
 *
 * requireAuth MUST be async and awaited at every callsite. getSessionUser returns
 * a Promise — a sync requireAuth would always return a truthy value (the Promise
 * object itself), bypassing auth and exposing all settings including leads_email.
 */

/**
 * PATCH /api/settings
 * Called by: Settings page in admin UI (browser, authenticated)
 * Auth: spm_session cookie required — returns 401 if missing or expired
 * Body: { key: string; value: string }
 * Response: { data: { key, value } }
 *
 * Upserts a single setting. Same auth bypass risk as GET — requireAuth must be
 * awaited or any request with any cookie can overwrite leads_email and other
 * site-wide settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';

interface SettingRow {
  key: string;
  value: string;
}

// requireAuth must be async because getSessionUser returns Promise<SessionUser | null>.
// A sync wrapper would return the Promise object itself — always truthy — meaning
// `if (!await requireAuth(request))` would never fire and auth would be silently skipped.
async function requireAuth(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? await getSessionUser(token) : null;
}

export async function GET(request: NextRequest) {
  if (!await requireAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key) {
    const row = await queryOne<SettingRow>('SELECT key, value FROM site_settings WHERE key = ?', [key]);
    if (!row) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }
    return NextResponse.json({ data: { key: row.key, value: row.value } });
  }

  const rows = await query<SettingRow>('SELECT key, value FROM site_settings ORDER BY key ASC');
  const data: Record<string, string> = {};
  for (const row of rows) {
    data[row.key] = row.value;
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  if (!await requireAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { key?: string; value?: string };
  const key   = body.key?.trim();
  const value = body.value?.trim();

  if (!key || value === undefined || value === '') {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  await run(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, Date.now()]
  );

  return NextResponse.json({ data: { key, value } });
}
