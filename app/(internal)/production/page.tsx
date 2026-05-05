export const dynamic = 'force-dynamic';

// /production — Shows Command Center.
// Reached by clicking the SHOWS button in the sidebar.
// Answers the two questions that matter: how many hours are we on air,
// and do we have enough in the pipeline to sustain that number?
// Below the scoreboard: active pitches, pipeline status, buyer intelligence,
// today's market greenlits, and genre pulse.

import { format } from 'date-fns';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import DashboardBuyerCards from '@/components/dashboard/DashboardBuyerCards';
import { query, queryOne } from '@/lib/db';
import type { BuyerContact, Show } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = ['proposal', 'sent', 'in-review', 'meeting', 'negotiating', 'greenlit', 'pass'] as const;

const STAGE_LABELS: Record<string, string> = {
  proposal: 'Proposal', sent: 'Sent', 'in-review': 'In Review',
  meeting: 'Meeting', negotiating: 'Negotiating', greenlit: 'Greenlit', pass: 'Pass',
};

const STAGE_COLORS: Record<string, string> = {
  proposal: 'var(--text-muted)', sent: 'var(--text-secondary)',
  'in-review': 'var(--status-inreview)', meeting: 'var(--accent)',
  negotiating: 'var(--status-greenlit)', greenlit: 'var(--status-greenlit)',
  pass: 'var(--status-pass)',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ActivePitch {
  id: string; name: string; pipeline_stage: string; days_in_stage: number;
  ip_title: string | null; production_hours: number | null;
  buyer_name: string | null; company_name: string | null;
  ask_episode_count: number | null; ask_format: string | null;
}

interface OnAirShow { title: string; production_hours: number; }

// ── Network fetches (resilient) ───────────────────────────────────────────────

async function fetchActiveBuyers(): Promise<BuyerContact[]> {
  try {
    const res = await fetch('http://localhost:3000/api/buyers?activity_status=active', { cache: 'no-store' });
    return res.ok ? ((await res.json()).data ?? []) : [];
  } catch { return []; }
}

async function fetchAllShows(): Promise<Show[]> {
  try {
    const res = await fetch('http://localhost:3000/api/shows', { cache: 'no-store' });
    return res.ok ? ((await res.json()).data ?? []) : [];
  } catch { return []; }
}

function buildGenrePulse(shows: Show[]): { genre: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const show of shows) {
    if (show.genre) counts[show.genre] = (counts[show.genre] ?? 0) + 1;
  }
  return Object.entries(counts).map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductionPage() {
  const [buyers, allShows] = await Promise.all([
    fetchActiveBuyers(),
    fetchAllShows(),
  ]);

  // Production hours — direct DB (faster than HTTP)
  const onAirTotal = queryOne<{ total: number }>(
    "SELECT COALESCE(SUM(production_hours), 0) AS total FROM site_shows WHERE status = 'active'"
  )?.total ?? 0;

  const pipelineTotal = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(ic.production_hours), 0) AS total
     FROM ip_catalog ic
     WHERE ic.id IN (
       SELECT DISTINCT ip_id FROM packages
       WHERE pipeline_stage NOT IN ('pass') AND status != 'archived' AND ip_id IS NOT NULL
     )`
  )?.total ?? 0;

  const onAirShows = query<OnAirShow>(
    "SELECT title, production_hours FROM site_shows WHERE status = 'active' AND production_hours > 0 ORDER BY production_hours DESC"
  );

  const activePitches = query<ActivePitch>(
    `SELECT pkg.id, pkg.name, pkg.pipeline_stage, pkg.days_in_stage,
            pkg.ask_episode_count, pkg.ask_format,
            ic.title AS ip_title, ic.production_hours,
            bc.name  AS buyer_name, co.name AS company_name
     FROM packages pkg
     LEFT JOIN ip_catalog ic   ON ic.id = pkg.ip_id
     LEFT JOIN buyer_contacts bc ON bc.id = pkg.target_contact_id
     LEFT JOIN buyer_companies co ON co.id = pkg.target_company_id
     WHERE pkg.pipeline_stage NOT IN ('pass') AND pkg.status != 'archived'
     ORDER BY pkg.stage_entered_at ASC NULLS LAST
     LIMIT 30`
  );

  const stageCounts: Record<string, number> = {};
  const stuckStages = new Set<string>();
  for (const p of activePitches) {
    stageCounts[p.pipeline_stage] = (stageCounts[p.pipeline_stage] ?? 0) + 1;
    if (p.days_in_stage > 14) stuckStages.add(p.pipeline_stage);
  }

  const genrePulse = buildGenrePulse(allShows);
  const maxGenreCount = genrePulse[0]?.count ?? 1;
  const gap = onAirTotal > 0 ? Math.max(0, onAirTotal - pipelineTotal) : 0;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
            Shows
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* ── PRODUCTION HOURS SCOREBOARD ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* ON AIR */}
        <div className="rounded-xl p-6" style={{ background: 'var(--accent)', color: '#fff' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ opacity: 0.7 }}>
            On Air
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="font-bold leading-none" style={{ fontSize: 64, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {onAirTotal.toLocaleString()}
            </span>
            <span className="text-xl font-semibold mb-1" style={{ opacity: 0.8 }}>hrs / yr</span>
          </div>
          {onAirShows.length > 0 ? (
            <ul className="space-y-1">
              {onAirShows.map((s) => (
                <li key={s.title} className="flex justify-between text-xs" style={{ opacity: 0.85 }}>
                  <span className="truncate pr-2">{s.title}</span>
                  <span className="font-semibold tabular-nums shrink-0">{s.production_hours.toLocaleString()} hrs</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ opacity: 0.6 }}>
              No active shows with hours yet — assign in <Link href="/marketing/shows" style={{ color: '#fff', textDecoration: 'underline' }}>Marketing → Shows</Link>
            </p>
          )}
        </div>

        {/* IN PIPELINE */}
        <div className="rounded-xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            In Pipeline
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="font-bold leading-none" style={{ fontSize: 64, fontFamily: "'Barlow Condensed', sans-serif", color: pipelineTotal >= onAirTotal && onAirTotal > 0 ? 'var(--status-greenlit)' : 'var(--status-inreview)' }}>
              {pipelineTotal.toLocaleString()}
            </span>
            <span className="text-xl font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>hrs / yr</span>
          </div>

          {onAirTotal > 0 && (
            <div className="rounded-lg px-3 py-2 mb-3 text-xs font-medium" style={{
              background: gap === 0 ? 'color-mix(in srgb, var(--status-greenlit) 15%, transparent)' : 'color-mix(in srgb, var(--status-inreview) 15%, transparent)',
              color: gap === 0 ? 'var(--status-greenlit)' : 'var(--status-inreview)',
            }}>
              {gap === 0 ? 'Pipeline covers on-air hours' : `${gap.toLocaleString()} hrs gap — need more in pipeline`}
            </div>
          )}

          {activePitches.filter(p => p.production_hours && p.production_hours > 0).length > 0 ? (
            <ul className="space-y-1">
              {activePitches.filter(p => p.production_hours && p.production_hours > 0).slice(0, 5).map((p) => (
                <li key={p.id} className="flex justify-between text-xs">
                  <span className="truncate pr-2" style={{ color: 'var(--text-secondary)' }}>
                    {p.ip_title ?? p.name}
                    <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {STAGE_LABELS[p.pipeline_stage] ?? p.pipeline_stage}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums shrink-0" style={{ color: 'var(--text-primary)' }}>
                    {(p.production_hours ?? 0).toLocaleString()} hrs
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Assign hours to IP Catalog shows to track pipeline hours
            </p>
          )}
        </div>
      </div>

      {/* ── ACTIVE PITCHES + PIPELINE STATUS ── */}
      <div className="grid grid-cols-12 gap-5">

        <section className="col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Active Pitches
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{activePitches.length} packages</span>
          </div>
          <Card>
            {activePitches.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No active pitches — add packages in the{' '}
                <Link href="/pipeline" style={{ color: 'var(--accent)' }}>pipeline</Link>
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {activePitches.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {p.ip_title ?? p.name}
                        </span>
                        {p.production_hours != null && p.production_hours > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                            {p.production_hours.toLocaleString()} hrs
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {[p.company_name, p.buyer_name].filter(Boolean).join(' · ')}
                        {p.ask_format && ` · ${p.ask_format}`}
                        {p.ask_episode_count && ` · ${p.ask_episode_count} eps`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold" style={{ color: STAGE_COLORS[p.pipeline_stage] ?? 'var(--text-secondary)' }}>
                        {STAGE_LABELS[p.pipeline_stage] ?? p.pipeline_stage}
                      </div>
                      {p.days_in_stage > 0 && (
                        <div className="text-[10px]" style={{ color: p.days_in_stage > 14 ? 'var(--status-inreview)' : 'var(--text-muted)' }}>
                          {p.days_in_stage}d{p.days_in_stage > 14 ? ' ⚠' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="col-span-4 space-y-3">
          <h2 className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Pipeline Status
          </h2>
          <Card>
            <div className="space-y-0">
              {PIPELINE_STAGES.map((stage) => {
                const count = stageCounts[stage] ?? 0;
                const stuck = stuckStages.has(stage);
                return (
                  <div key={stage} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                    <span className="text-sm" style={{ color: stuck ? 'var(--status-inreview)' : 'var(--text-secondary)' }}>
                      {STAGE_LABELS[stage]}{stuck && <span className="ml-1.5 text-xs">⚠</span>}
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: count > 0 ? STAGE_COLORS[stage] : 'var(--text-muted)' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>

      {/* ── ACTIVE BUYERS ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>Active Buyers</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{buyers.length} contacts</span>
        </div>
        <DashboardBuyerCards initialBuyers={buyers.slice(0, 8)} />
      </section>

      {/* ── GENRE PULSE + PIPELINE HOURS BY STAGE ── */}
      <div className="grid grid-cols-2 gap-5">
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
              Genre Pulse — Last 30 Days
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Genres appearing most in scraped market orders
            </p>
          </div>
          <Card>
            {genrePulse.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No genre data yet</p>
            ) : (
              <div className="space-y-3">
                {genrePulse.map(({ genre, count }) => (
                  <div key={genre}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{genre}</span>
                      <span className="text-xs tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / maxGenreCount) * 100}%`, background: 'var(--accent)', opacity: 0.65 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Pipeline Hours by Stage
          </h2>
          <Card>
            <div className="space-y-2">
              {PIPELINE_STAGES.filter(s => s !== 'pass').map(stage => {
                const hrs = activePitches
                  .filter(p => p.pipeline_stage === stage && p.production_hours)
                  .reduce((sum, p) => sum + (p.production_hours ?? 0), 0);
                if (hrs === 0) return null;
                return (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{STAGE_LABELS[stage]}</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: STAGE_COLORS[stage] }}>
                      {hrs.toLocaleString()} hrs
                    </span>
                  </div>
                );
              })}
              {activePitches.filter(p => p.production_hours && p.production_hours > 0).length === 0 && (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No hours assigned to pipeline shows yet
                </p>
              )}
            </div>
          </Card>
        </section>
      </div>

    </div>
  );
}
