// /dashboard — Intelligence feed.
// This is the logo-click landing page: a live trade feed of market intelligence.
// The production command center lives at /production (SHOWS button).

import { format } from 'date-fns';
import ScraperBanner from '@/components/dashboard/ScraperBanner';
import DailyBriefing from '@/components/intelligence/DailyBriefing';
import type { ScraperSourceStatus } from '@/types';

async function fetchScraperStatus(): Promise<ScraperSourceStatus[]> {
  try {
    const res = await fetch('http://localhost:3000/api/scraper/status', { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

export default async function DashboardPage() {
  const scraperStatuses = await fetchScraperStatus();
  const pendingSources = scraperStatuses.filter((s) => !s.last_run_at);

  return (
    <div className="p-6 space-y-5">
      {pendingSources.length > 0 && <ScraperBanner sources={pendingSources} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
          Intelligence
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <DailyBriefing />
    </div>
  );
}
