// Google Analytics 4 Data API client — server-side only.
// Property: myentertainment.tv (GA4_PROPERTY_ID=486537975, GA4_ACCOUNT_ID=352948949)
// Uses OAuth token.json (analytics.readonly scope). Returns null gracefully on any failure.

import fs from 'node:fs';

const TOKEN_PATH = 'C:/Users/pb/.claude/google/token.json';

interface GACredentials {
  token: string;
  refresh_token: string;
  token_uri: string;
  client_id: string;
  client_secret: string;
  scopes: string[];
}

interface DimensionValue { value: string; }
interface MetricValue   { value: string; }
interface GARow { dimensionValues: DimensionValue[]; metricValues: MetricValue[]; }

export interface GASummary {
  propertyId:       string;
  sessions:         number;
  users:            number;
  pageviews:        number;
  newUsers:         number;
  bounceRate:       number;      // 0–100
  avgSessionSecs:   number;
  engagementRate:   number;      // 0–100
  engagedSessions:  number;
  topPages:         { page: string; views: number }[];
  topSources:       { source: string; sessions: number }[];
  topCountries:     { country: string; sessions: number }[];
  deviceBreakdown:  { device: string; sessions: number }[];
  dailyTrend:       { date: string; sessions: number }[]; // YYYYMMDD, last 14 days
  dateRange:        string;
}

async function getAccessToken(creds: GACredentials): Promise<string> {
  const res = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.statusText}`);
  const data = await res.json();
  return data.access_token as string;
}

async function runReport(propertyId: string, token: string, body: object): Promise<{ rows?: GARow[] }> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function fetchGAData(propertyId: string): Promise<GASummary | null> {
  if (!propertyId) return null;

  let creds: GACredentials;
  try {
    creds = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')) as GACredentials;
  } catch {
    return null;
  }

  if (!creds.scopes?.some(s => s.includes('analytics'))) return null;

  let token: string;
  try {
    token = await getAccessToken(creds);
  } catch {
    return null;
  }

  const dateRange30 = { startDate: '30daysAgo', endDate: 'today' };

  // Excludes bot/crawler sessions (0 engagement time) from all breakdown queries.
  // Singapore crawler had 441 sessions with 0s avg duration and 0 engaged sessions.
  const engagedOnly = {
    metricFilter: {
      filter: {
        fieldName: 'engagedSessions',
        numericFilter: { operation: 'GREATER_THAN', value: { int64Value: '0' } },
      },
    },
  };

  try {
    const [overview, pages, sources, countries, devices, trend] = await Promise.all([
      // Core metrics: sessions, users, pageviews, new users, bounce rate, avg duration, engagement rate, engaged sessions
      runReport(propertyId, token, {
        dateRanges: [dateRange30],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'newUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
          { name: 'engagedSessions' },
        ],
      }),
      // Top 10 pages by views — engaged sessions only
      runReport(propertyId, token, {
        dateRanges: [dateRange30],
        dimensions: [{ name: 'pagePath' }],
        metrics:    [{ name: 'screenPageViews' }],
        orderBys:   [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
        ...engagedOnly,
      }),
      // Top 8 traffic sources — engaged sessions only
      runReport(propertyId, token, {
        dateRanges: [dateRange30],
        dimensions: [{ name: 'sessionSource' }],
        metrics:    [{ name: 'engagedSessions' }],
        orderBys:   [{ metric: { metricName: 'engagedSessions' }, desc: true }],
        limit: 8,
        ...engagedOnly,
      }),
      // Top 8 countries — engaged sessions only
      runReport(propertyId, token, {
        dateRanges: [dateRange30],
        dimensions: [{ name: 'country' }],
        metrics:    [{ name: 'engagedSessions' }],
        orderBys:   [{ metric: { metricName: 'engagedSessions' }, desc: true }],
        limit: 8,
        ...engagedOnly,
      }),
      // Device category — engaged sessions only
      runReport(propertyId, token, {
        dateRanges: [dateRange30],
        dimensions: [{ name: 'deviceCategory' }],
        metrics:    [{ name: 'engagedSessions' }],
        orderBys:   [{ metric: { metricName: 'engagedSessions' }, desc: true }],
        ...engagedOnly,
      }),
      // 14-day daily engaged sessions for trend bars
      runReport(propertyId, token, {
        dateRanges: [{ startDate: '13daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics:    [{ name: 'engagedSessions' }],
        orderBys:   [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),
    ]);

    const ov = overview.rows?.[0]?.metricValues ?? [];

    return {
      propertyId,
      sessions:        parseInt(ov[0]?.value ?? '0'),
      users:           parseInt(ov[1]?.value ?? '0'),
      pageviews:       parseInt(ov[2]?.value ?? '0'),
      newUsers:        parseInt(ov[3]?.value ?? '0'),
      bounceRate:      parseFloat((parseFloat(ov[4]?.value ?? '0') * 100).toFixed(1)),
      avgSessionSecs:  Math.round(parseFloat(ov[5]?.value ?? '0')),
      engagementRate:  parseFloat((parseFloat(ov[6]?.value ?? '0') * 100).toFixed(1)),
      engagedSessions: parseInt(ov[7]?.value ?? '0'),
      topPages:        (pages.rows ?? []).map(r => ({ page: r.dimensionValues[0].value, views: parseInt(r.metricValues[0].value) })),
      topSources:      (sources.rows ?? []).map(r => ({ source: r.dimensionValues[0].value, sessions: parseInt(r.metricValues[0].value) })),
      topCountries:    (countries.rows ?? []).map(r => ({ country: r.dimensionValues[0].value, sessions: parseInt(r.metricValues[0].value) })),
      deviceBreakdown: (devices.rows ?? []).map(r => ({ device: r.dimensionValues[0].value, sessions: parseInt(r.metricValues[0].value) })),
      dailyTrend:      (trend.rows ?? []).map(r => ({ date: r.dimensionValues[0].value, sessions: parseInt(r.metricValues[0].value) })),
      dateRange:       'Last 30 Days',
    };
  } catch (err) {
    console.error('[GA] fetchGAData error:', err);
    return null;
  }
}
