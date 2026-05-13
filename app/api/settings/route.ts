// GET   /api/settings          — return all settings as Record<string, string> (auth required)
// GET   /api/settings?key=foo  — return a single setting by key (auth required)
// PATCH /api/settings          — upsert a setting (auth required)
//
// GET response:  { data: Record<string, string> } or { data: { key, value } }
// PATCH body:    { key: string; value: string }
// PATCH response: { data: { key, value } }

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';

interface SettingRow {
  key: string;
  value: string;
}

function requireAuth(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(token) : null;
}

export async function GET(request: NextRequest) {
  if (!requireAuth(request)) {
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
  if (!requireAuth(request)) {
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
