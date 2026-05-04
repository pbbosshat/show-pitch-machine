// /network-intel — Network buying intelligence dashboard.
// Rankings combine external market buying activity (trades research) with
// MYE's internal pitch relationship score. Updated quarterly.

import NetworkIntelClient from '@/components/networks/NetworkIntelClient';

export const metadata = { title: 'Network Intel — Show Pitch Machine' };

export default function NetworkIntelPage() {
  return (
    <div className="p-6 space-y-5">

      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Network Buying Intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Who&apos;s buying right now — ranked by external market activity + MYE relationship score
          </p>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'color-mix(in srgb, #F5A623 15%, transparent)',
            color: '#F5A623',
            border: '1px solid color-mix(in srgb, #F5A623 30%, transparent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            alignSelf: 'flex-start',
            marginTop: 4,
          }}
        >
          Updated May 2026
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Networks Tracked', value: '16' },
          { label: 'Hot Buyers (7.0+)',  value: '1',  accent: true },
          { label: 'Active (5.0–6.9)',   value: '5',  amber: true },
          { label: 'No MYE Relationship', value: '9', muted: true },
        ].map(({ label, value, accent, amber, muted }) => (
          <div
            key={label}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "'Barlow Condensed', sans-serif",
                lineHeight: 1,
                color: accent ? 'var(--accent)' : amber ? '#F5A623' : muted ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <NetworkIntelClient />
    </div>
  );
}
