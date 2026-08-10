// /connections — Daily Connections tab.
//
// Thin server wrapper that mounts the client component, mirroring how
// /dashboard mounts DailyBriefing (app/(internal)/dashboard/page.tsx). All
// data fetching (leads, build, enrich, connect) happens client-side inside
// DailyConnections via SWR — this wrapper just renders the page chrome
// (heading + subhead) so the pattern matches the rest of the (internal)
// route group.
//
// Auth: no whitelisting needed — middleware.ts session-gates every path not
// in PUBLIC_PATHS/PUBLIC_PREFIXES, and /connections isn't listed there
// (see docs/daily-connections-prd.html §2.2).

import DailyConnections from '@/components/connections/DailyConnections';

export default function ConnectionsPage() {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Connections
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          People worth connecting with from today&apos;s trades, tiered, deduped against Gmail
          and Calendar, and drafted in Shawn&apos;s voice.
        </p>
      </div>

      <DailyConnections />
    </div>
  );
}
