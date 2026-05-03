'use client';
// Intelligence page — needs interactivity for the "Scrape All Now" button.
// Shows scraper status bar, today's greenlit feed (large cards), and exec moves right rail.
// SWR provides live refresh of all three data sections.

import useSWR from 'swr';
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Show, BuyerContact, ScraperSourceStatus } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Format a location string from show fields
function formatLocation(show: Show): string | null {
  if (!show.location_type) return null;
  const parts = [show.location_type.toUpperCase()];
  if (show.filming_states) parts.push(show.filming_states);
  return parts.join(' · ');
}

export default function IntelligencePage() {
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);

  const { data: scraperData } = useSWR<{ data: ScraperSourceStatus[] }>('/api/scraper/status', fetcher, { refreshInterval: 30000 });
  const { data: greenlitData, isLoading: greenlitLoading, error: greenlitError } = useSWR<{ data: Show[] }>('/api/intelligence/greenlits-today', fetcher, { refreshInterval: 60000 });
  const { data: execData } = useSWR<{ data: BuyerContact[] }>('/api/intelligence/exec-moves', fetcher, { refreshInterval: 60000 });

  const scraperStatuses: ScraperSourceStatus[] = scraperData?.data ?? [];
  const greenlits: Show[] = greenlitData?.data ?? [];
  const execMoves: BuyerContact[] = execData?.data ?? [];

  const handleScrapeAll = async () => {
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await fetch('/api/scraper/run', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        setScrapeMsg(`Error: ${text}`);
      } else {
        const json = await res.json();
        const n = json.queued?.length ?? 0;
        setScrapeMsg(`${n} source${n !== 1 ? 's' : ''} queued`);
      }
    } catch (err) {
      setScrapeMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header row with "Scrape All Now" button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Trade activity, greenlits, and exec moves
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            variant="primary"
            size="md"
            onClick={handleScrapeAll}
            disabled={scraping}
          >
            {scraping ? 'Scraping…' : 'Scrape All Now'}
          </Button>
          {scrapeMsg && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {scrapeMsg}
            </span>
          )}
        </div>
      </div>

      {/* Scraper status bar — compact source-by-source status row */}
      {scraperStatuses.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg border border-[var(--border-subtle)] text-xs"
          style={{ background: 'var(--bg-surface)', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {scraperStatuses.map((s) => {
            const ran = !!s.last_run_at;
            const time = s.last_run_at
              ? format(new Date(s.last_run_at), 'h:mma').toLowerCase()
              : null;
            return (
              <span key={s.source} className="flex items-center gap-1.5">
                <span style={{ color: ran ? 'var(--status-greenlit)' : 'var(--status-pass)' }}>
                  {ran ? '✓' : '✗'}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {(s.display_name ?? s.source).toUpperCase()}
                </span>
                {time ? (
                  <span style={{ color: 'var(--text-muted)' }}>{time} · {s.last_items}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>NOT RUN</span>
                )}
                {s.consecutive_failures > 0 && (
                  <span style={{ color: 'var(--status-pass)' }}>
                    {s.consecutive_failures} fail{s.consecutive_failures !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Main content: greenlits feed + exec moves rail */}
      <div className="grid grid-cols-12 gap-5">

        {/* Today's Greenlits — large cards */}
        <section className="col-span-8 space-y-3">
          <h2
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Today&apos;s Greenlits
          </h2>

          {greenlitError && (
            <p className="text-sm" style={{ color: 'var(--status-pass)' }}>
              {greenlitError.message}
            </p>
          )}

          {greenlitLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : greenlits.length === 0 ? (
            <Card>
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                No greenlits today — run scrapers to pull fresh data
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {greenlits.map((show) => (
                <Card key={show.id}>
                  {/* Source + date header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge label="Greenlit" variant="greenlit" />
                    {show.source && (
                      <span
                        className="text-xs capitalize"
                        style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {show.source}
                      </span>
                    )}
                    {show.greenlit_date && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        · {formatDistanceToNow(new Date(show.greenlit_date), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  {/* Show title — prominent Barlow Condensed */}
                  <h3
                    className="text-xl font-bold leading-tight"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
                  >
                    &ldquo;{show.title}&rdquo;
                    {show.season_number && show.season_number > 1
                      ? ` — Season ${show.season_number}`
                      : show.season_number === 1
                      ? ' — Season 1'
                      : ''}
                  </h3>

                  {/* Network · genre · episodes */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {show.network && (
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {show.network}
                      </span>
                    )}
                    {show.genre && (
                      <>
                        <span style={{ color: 'var(--border-strong)' }}>·</span>
                        <Badge label={show.genre} variant="muted" />
                      </>
                    )}
                    {show.format && (
                      <>
                        <span style={{ color: 'var(--border-strong)' }}>·</span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{show.format}</span>
                      </>
                    )}
                    {show.episode_count != null && (
                      <>
                        <span style={{ color: 'var(--border-strong)' }}>·</span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {show.episode_count} episodes
                        </span>
                      </>
                    )}
                  </div>

                  {/* Production company */}
                  {show.production_company && (
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Production: </span>
                      {show.production_company}
                    </p>
                  )}

                  {/* Location */}
                  {formatLocation(show) && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Location: </span>
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: 'var(--status-greenlit)',
                          }}
                        />
                        {formatLocation(show)}
                      </span>
                    </p>
                  )}

                  {/* Order type */}
                  {show.order_type && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Order: </span>
                      {show.order_type}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                    {show.source_url && (
                      <a
                        href={show.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]"
                        style={{ color: 'var(--text-secondary)', transition: 'background var(--motion-base) var(--ease)' }}
                      >
                        View Article
                      </a>
                    )}
                    {show.buyer_contact_id && (
                      <a
                        href={`/buyers/${show.buyer_contact_id}`}
                        className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]"
                        style={{ color: 'var(--text-secondary)', transition: 'background var(--motion-base) var(--ease)' }}
                      >
                        View Buyer
                      </a>
                    )}
                    <a
                      href={`/shows/${show.id}`}
                      className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]"
                      style={{ color: 'var(--text-secondary)', transition: 'background var(--motion-base) var(--ease)' }}
                    >
                      View in Show DB
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Exec Moves right rail */}
        <section className="col-span-4 space-y-3">
          <h2
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Exec Moves Today
          </h2>

          {execMoves.length === 0 ? (
            <Card>
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No exec moves today
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {execMoves.map((exec) => (
                <a key={exec.id} href={`/buyers/${exec.id}`}>
                  <Card hoverable>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {exec.name}
                    </p>
                    {exec.title && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {exec.title}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {exec.last_mye_contact_date
                        ? `Last MYE: ${formatDistanceToNow(new Date(exec.last_mye_contact_date), { addSuffix: true })}`
                        : 'No MYE history'}
                    </p>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
