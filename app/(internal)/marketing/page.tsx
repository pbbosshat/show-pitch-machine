// Marketing Dashboard — Website Analytics for myentertainment.tv
// GA4 property 486537975 (account 352948949).
// Property ID falls back to GA4_PROPERTY_ID env var if not stored in site_content DB.

import { queryOne } from '@/lib/db';
import { fetchGAData, type GASummary } from '@/lib/ga';

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricTile({ label, value, sub, highlight }: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div
        className="text-2xl font-bold leading-tight"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, total }: { label: string; value: number; max: number; total?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const share = total && total > 0 ? Math.round((value / total) * 100) : null;
  const displayLabel = label === '/' ? '(home)' : label;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }} title={label}>
          {displayLabel}
        </span>
        <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--text-primary)' }}>
          {value.toLocaleString()}
          {share !== null && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({share}%)</span>
          )}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
      </div>
    </div>
  );
}

function TrendBars({ data }: { data: { date: string; sessions: number }[] }) {
  const max = Math.max(...data.map(d => d.sessions), 1);
  const total = data.reduce((s, d) => s + d.sessions, 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;
  return (
    <div className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          14-Day Engaged Sessions
        </p>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          avg {avg.toLocaleString()}/day · peak {max.toLocaleString()}
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height: 56 }}>
        {data.map(({ date, sessions }) => {
          const barH = Math.max(3, Math.round((sessions / max) * 56));
          const mm = date.slice(4, 6);
          const dd = date.slice(6, 8);
          return (
            <div
              key={date}
              title={`${mm}/${dd}: ${sessions.toLocaleString()} sessions`}
              className="flex-1 rounded-sm"
              style={{ height: barH, background: 'var(--accent)', opacity: 0.8 }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        {data[0] && (
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            {data[0].date.slice(4, 6)}/{data[0].date.slice(6, 8)}
          </span>
        )}
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Today</span>
      </div>
    </div>
  );
}

function DeviceBreakdown({ data }: { data: { device: string; sessions: number }[] }) {
  const total = data.reduce((s, d) => s + d.sessions, 0);
  const colors: Record<string, string> = { desktop: 'var(--accent)', mobile: '#f59e0b', tablet: '#8b5cf6' };
  return (
    <div className="space-y-2.5">
      {data.map(({ device, sessions }) => {
        const pct = total > 0 ? Math.round((sessions / total) * 100) : 0;
        const color = colors[device.toLowerCase()] ?? 'var(--text-muted)';
        return (
          <div key={device} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{device}</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {pct}%
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({sessions.toLocaleString()})</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getGA(): Promise<{ data: GASummary | null; propertyId: string }> {
  const row = queryOne<{ value: string }>('SELECT value FROM site_content WHERE key = ?', ['site.ga4_id']);
  // DB value wins; GA4_PROPERTY_ID env var is the authoritative fallback (486537975)
  const propertyId = row?.value?.trim() || process.env.GA4_PROPERTY_ID || '';
  if (!propertyId) return { data: null, propertyId: '' };
  const data = await fetchGAData(propertyId);
  return { data, propertyId };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MarketingDashboard() {
  const { data: ga, propertyId } = await getGA();
  const returnRate = ga && ga.users > 0 ? Math.round(((ga.users - ga.newUsers) / ga.users) * 100) : 0;

  const topPageMax    = ga?.topPages[0]?.views ?? 1;
  const topSourceMax  = ga?.topSources[0]?.sessions ?? 1;
  const topCountryMax = ga?.topCountries[0]?.sessions ?? 1;
  const totalPageViews = ga?.topPages.reduce((s, p) => s + p.views, 0) ?? 0;
  const totalSourceSessions = ga?.topSources.reduce((s, p) => s + p.sessions, 0) ?? 0;
  const totalCountrySessions = ga?.topCountries.reduce((s, p) => s + p.sessions, 0) ?? 0;

  return (
    <div className="p-8" style={{ maxWidth: 1100 }}>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
            Website Analytics
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            myentertainment.tv — Last 30 Days
            {propertyId && (
              <span style={{ color: 'var(--text-muted)' }}> · Property {propertyId}</span>
            )}
          </p>
        </div>
        {ga && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded"
            style={{ background: 'color-mix(in srgb, var(--status-greenlit) 15%, transparent)', color: 'var(--status-greenlit)' }}
          >
            GA4 Live
          </span>
        )}
      </div>

      {/* No property configured */}
      {!propertyId ? (
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start gap-4">
            <div className="text-2xl shrink-0">📊</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Connect Google Analytics 4
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Set GA4_PROPERTY_ID in .env or add the numeric property ID to Site Content → key{' '}
                <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3 }}>site.ga4_id</code>
              </p>
              <div className="text-xs space-y-1.5 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                <p>1. In analytics.google.com open the myentertainment.tv property</p>
                <p>2. Admin → Property Access Management → Add user: <strong>patrickbryant@gototeam.com</strong> (Viewer)</p>
                <p>3. Property ID is already set: <strong>GA4_PROPERTY_ID=486537975</strong> in .env</p>
              </div>
            </div>
          </div>
        </div>

      /* Property set but fetch failed */
      ) : !ga ? (
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            GA4 property <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>{propertyId}</code> is configured but returned no data.
            Verify the OAuth token has <code style={{ background: 'var(--bg-elevated)', padding: '1px 4px', borderRadius: 3 }}>analytics.readonly</code> scope and{' '}
            <strong>patrickbryant@gototeam.com</strong> has Viewer access to this property.
          </p>
        </div>

      /* Live data */
      ) : (
        <div className="space-y-4">

          {/* 8 metric tiles — 4 columns. Engaged Sessions leads; raw Sessions shown for reference. */}
          <div className="grid grid-cols-4 gap-3">
            <MetricTile label="Engaged Sessions" value={ga.engagedSessions} sub="real visitors, bots excluded" highlight />
            <MetricTile label="Total Users"      value={ga.users} sub={`${ga.newUsers.toLocaleString()} new`} />
            <MetricTile label="Page Views"       value={ga.pageviews} />
            <MetricTile label="Sessions (total)" value={ga.sessions} sub="incl. crawlers" />
            <MetricTile label="Engagement Rate"  value={`${ga.engagementRate}%`} />
            <MetricTile label="Avg Session"      value={fmtDuration(ga.avgSessionSecs)} />
            <MetricTile label="Bounce Rate"      value={`${ga.bounceRate}%`} />
            <MetricTile label="Return Rate"      value={`${returnRate}%`} sub="returning visitors" />
          </div>

          {/* 14-day trend — engaged sessions only (bots excluded) */}
          {ga.dailyTrend.length > 0 && <TrendBars data={ga.dailyTrend} />}

          {/* 4-column detail grid */}
          <div className="grid grid-cols-4 gap-4">

            {/* Top Pages */}
            <div className="col-span-1 rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Top Pages</p>
              <div className="space-y-2.5">
                {ga.topPages.map(({ page, views }) => (
                  <BarRow key={page} label={page} value={views} max={topPageMax} total={totalPageViews} />
                ))}
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="col-span-1 rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Traffic Sources</p>
              <div className="space-y-2.5">
                {ga.topSources.map(({ source, sessions }) => (
                  <BarRow key={source} label={source} value={sessions} max={topSourceMax} total={totalSourceSessions} />
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="col-span-1 rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Top Countries</p>
              <div className="space-y-2.5">
                {ga.topCountries.map(({ country, sessions }) => (
                  <BarRow key={country} label={country} value={sessions} max={topCountryMax} total={totalCountrySessions} />
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="col-span-1 rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Device Breakdown</p>
              {ga.deviceBreakdown.length > 0 ? (
                <DeviceBreakdown data={ga.deviceBreakdown} />
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No device data</p>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
