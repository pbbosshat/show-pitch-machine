/**
 * GET   /api/marketing/content
 * PATCH /api/marketing/content
 * Called by: Marketing CMS content editor page (browser, admin session)
 * Auth: spm_session cookie (marketing layout enforces auth)
 * PATCH body: { key: string, value: string }
 * GET response: { data: SiteContentRow[] }
 * PATCH response: { ok: true }
 *
 * Manages the site_content key-value store — homepage copy, GA4 property ID,
 * and other configurable text that editors need to update without a deploy.
 * PATCH is an upsert: creates the key if it doesn't exist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
  try {
    const data = await query('SELECT * FROM site_content ORDER BY key ASC');
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    await run('INSERT INTO site_content (key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at', [key, value, now]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
