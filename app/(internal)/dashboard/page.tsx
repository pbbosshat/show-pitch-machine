// Dashboard — server component that fetches from multiple endpoints in parallel.
// Bento grid: Active Buyers (8 col) | Today's Greenlits (4 col) | Pipeline Status | Genre Pulse.
// The scraper banner is a client island so dismiss state stays client-side.

import { formatDistanceToNow, format } from 'date-fns';
import Badge from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import Card from '@/components/ui/Card';
import ScraperBanner from '@/components/dashboard/ScraperBanner';
import type { BuyerContact, Show, ScraperSourceStatus } from '@/types';

// Pipeline stages in display order
const PIPELINE_STAGES = ['proposal', 'sent', 'in-review', 'meeting', 'negotiating', 'greenlit', 'pass'] as const;

const STAGE_LABELS: Record<string, string> = {
  proposal:    'Proposal',
  sent:        'Sent',
  'in-review': 'In Review',
  meeting:     'Meeting',
  negotiating: 'Negotiating',
  greenlit:    'Greenlit',
  pass:        'Pass',
};

// Each fetch is resilient — returns empty array on network or parse failure
async function fetchActiveBuyers(): Promise<BuyerContact[]> {
  try {
    const res = await fetch('http://localhost:3000/api/buyers?activity_status=active', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

async function fetchGreenlitsToday(): Promise<Show[]> {
  try {
    const res = await fetch('http://localhost:3000/api/intelligence/greenlits-today', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

async function fetchPipeline(): Promise<{ pipeline_stage: string; days_in_stage: number }[]> {
  try {
    const res = await fetch('http://localhost:3000/api/pipeline', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

async function fetchScraperStatus(): Promise<ScraperSourceStatus[]> {
  try {
    const res = await fetch('http://localhost:3000/api/scraper/status', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

async function fetchAllShows(): Promise<Show[]> {
  try {
    const res = await fetch('http://localhost:3000/api/shows', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

// Build genre frequency map for the horizontal bar chart
function buildGenrePulse(shows: Show[]): { genre: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const show of shows) {
    if (show.genre) counts[show.genre] = (counts[show.genre] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export default async function DashboardPage() {
  // All data fetches fire in parallel — avoids request waterfall
  const [buyers, greenlits, pipelineItems, scraperStatuses, allShows] = await Promise.all([
    fetchActiveBuyers(),
    fetchGreenlitsToday(),
    fetchPipeline(),
    fetchScraperStatus(),
    fetchAllShows(),
  ]);

  // Count pipeline packages per stage
  const stageCounts: Record<string, number> = {};
  for (const item of pipelineItems) {
    stageCounts[item.pipeline_stage] = (stageCounts[item.pipeline_stage] ?? 0) + 1;
  }

  // Identify stages with stuck packages so we can flag them amber
  const stuckStages = new Set(
    pipelineItems.filter((p) => p.days_in_stage > 14).map((p) => p.pipeline_stage)
  );

  // Genre pulse aggregates from all shows, falls back to today's greenlits if no show DB yet
  const genrePulse = buildGenrePulse(allShows.length > 0 ? allShows : greenlits);
  const maxGenreCount = genrePulse[0]?.count ?? 1;

  // Sources that have never run — shown in the warning banner
  const pendingSources = scraperStatuses.filter((s) => !s.last_run_at);

  return (
    <div className="p-6 space-y-5">
      {/* Client island: scraper warning banner with dismiss button */}
      {pendingSources.length > 0 && <ScraperBanner sources={pendingSources} />}

      {/* Page header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Top bento row */}
      <div className="grid grid-cols-12 gap-5">

        {/* Active Buyers — 8 columns, 2-col card grid */}
        <section className="col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              Active Buyers
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {buyers.length} contacts
            </span>
          </div>

          {buyers.length === 0 ? (
            <Card>
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No active buyers found
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {buyers.slice(0, 8).map((buyer) => (
                <a key={buyer.id} href={`/buyers/${buyer.id}`}>
                  <Card hoverable>
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {buyer.name}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {buyer.title ?? 'Executive'}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      <StatusDot status={buyer.activity_status} />
                      {buyer.last_greenlit_date
                        ? <span>greenlit {formatDistanceToNow(new Date(buyer.last_greenlit_date), { addSuffix: true })}</span>
                        : null}
                      <span>{buyer.orders_last_90_days} orders/90d</span>
                    </div>

                    {buyer.last_mye_contact_date && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Last contact: {formatDistanceToNow(new Date(buyer.last_mye_contact_date), { addSuffix: true })}
                      </p>
                    )}

                    {buyer.mandate_statement && (
                      <p className="text-xs mt-2 italic truncate" style={{ color: 'var(--text-secondary)' }}>
                        {buyer.mandate_statement}
                      </p>
                    )}
                  </Card>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Today's Greenlits — 4 columns */}
        <section className="col-span-4 space-y-3">
          <h2
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Today&apos;s Greenlits
          </h2>

          <div className="space-y-2">
            {greenlits.length === 0 ? (
              <Card>
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  No greenlits today yet
                </p>
              </Card>
            ) : (
              greenlits.slice(0, 10).map((show) => (
                <Card key={show.id} hoverable>
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
                  >
                    {show.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {show.network ?? 'Network TBD'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {show.genre && <Badge label={show.genre} variant="muted" />}
                    {show.episode_count && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {show.episode_count} eps
                      </span>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Bottom bento row */}
      <div className="grid grid-cols-12 gap-5">

        {/* Pipeline Status */}
        <section className="col-span-6 space-y-3">
          <h2
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Pipeline Status
          </h2>
          <Card>
            {pipelineItems.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No packages in pipeline
              </p>
            ) : (
              <div className="space-y-0">
                {PIPELINE_STAGES.map((stage) => {
                  const count = stageCounts[stage] ?? 0;
                  const stuck = stuckStages.has(stage);
                  return (
                    <div
                      key={stage}
                      className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <span
                        className="text-sm"
                        style={{ color: stuck ? 'var(--status-inreview)' : 'var(--text-secondary)' }}
                      >
                        {STAGE_LABELS[stage]}
                        {stuck && (
                          <span className="ml-1.5 text-xs" style={{ color: 'var(--status-inreview)' }}>
                            ⚠ stuck {'>'}14d
                          </span>
                        )}
                      </span>
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Genre Pulse — horizontal bar chart, plain divs */}
        <section className="col-span-6 space-y-3">
          <h2
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Genre Pulse — Last 30 Days
          </h2>
          <Card>
            {genrePulse.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No genre data yet
              </p>
            ) : (
              <div className="space-y-3">
                {genrePulse.map(({ genre, count }) => (
                  <div key={genre}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {genre}
                      </span>
                      <span
                        className="text-xs tabular-nums"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
                      >
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxGenreCount) * 100}%`,
                          background: 'var(--accent)',
                          opacity: 0.65,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
