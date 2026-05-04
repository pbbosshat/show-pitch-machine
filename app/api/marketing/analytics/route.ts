// GET /api/marketing/analytics
// Returns GA4 metrics for the configured property (site.ga4_id in site_content).
// Caller: /marketing dashboard server component
// Auth: uses server-side OAuth token from token.json (analytics.readonly scope)
// Response: { data: GASummary } | { data: null, reason: string }

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { fetchGAData } from '@/lib/ga';

export async function GET() {
  try {
    // Look up the GA4 property ID — DB value wins; fall back to GA4_PROPERTY_ID env var
    const row = queryOne<{ value: string }>('SELECT value FROM site_content WHERE key = ?', ['site.ga4_id']);
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
