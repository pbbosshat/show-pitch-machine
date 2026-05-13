/**
 * GET /api/marketing/analytics
 * Called by: /marketing dashboard server component
 * Auth: server-side OAuth token from token.json (analytics.readonly scope) — no user auth required
 * Response: { data: GASummary } | { data: null, reason: 'no_property_id' | 'fetch_failed' }
 *
 * Returns GA4 metrics for the configured property. Property ID is read from
 * site_content (key: site.ga4_id) with fallback to GA4_PROPERTY_ID env var.
 * Returns { data: null } with a reason code rather than an error so the dashboard
 * degrades gracefully when GA credentials are not configured.
 */

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { fetchGAData } from '@/lib/ga';

export async function GET() {
  try {
    // Look up the GA4 property ID — DB value wins; fall back to GA4_PROPERTY_ID env var
    const row = await queryOne<{ value: string }>('SELECT value FROM site_content WHERE key = ?', ['site.ga4_id']);
    const propertyId = row?.value?.trim() || process.env.GA4_PROPERTY_ID || '';

    if (!propertyId) {
      return NextResponse.json({ data: null, reason: 'no_property_id' });
    }

    const data = await fetchGAData(propertyId);
    if (!data) {
      return NextResponse.json({ data: null, reason: 'fetch_failed' });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
