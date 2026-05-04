'use client';
// NetworkIntelClient — displays network buying intelligence rankings.
// Props come from the server page (DB query); no hardcoded network data here.
// market_score (external research) and relationship_score (live from DB) are
// combined into combined_score = market × 0.60 + relationship × 0.40.
// Networks without market_score data are shown as "Unrated" at the bottom.

import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BudgetSignal = 'expanding' | 'stable' | 'contracting' | 'frozen';
type SignalFilter = 'all' | 'hot' | 'active' | 'watch' | 'unrated';

export interface NetworkIntelRow {
  id: string;
  name: string;
  type: string | null;
  tier: string | null;
  hq_city: string | null;
  // External market intel — null = not yet researched
  market_score: number | null;
  budget_signal: BudgetSignal | null;
  key_buyer: string | null;
  genres: string[];
  intel_notes: string | null;
  intel_updated_at: number | null;
  // Live from DB
  contact_count: number;
  deal_count: number;
  active_pitches: number;
  relationship_score: number;
  combined_score: number | null;  // null when market_score is null
  last_touch_date: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 7)  return 'var(--accent)';
  if (score >= 5)  return '#F5A623';
  if (score >= 3)  return 'var(--text-secondary)';
  return 'var(--text-muted)';
}

function scoreBg(score: number): string {
  if (score >= 7)  return 'color-mix(in srgb, var(--accent) 18%, transparent)';
  if (score >= 5)  return 'color-mix(in srgb, #F5A623 18%, transparent)';
  return 'color-mix(in srgb, var(--text-muted) 12%, transparent)';
}

function relativeTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1)  return 'today';
  if (days < 7)  return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatIntelDate(ts: number | null | undefined): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const BUDGET_STYLES: Record<BudgetSignal, { label: string; color: string; bg: string }> = {
  expanding:   { label: 'Expanding',   color: '#22c55e', bg: 'color-mix(in srgb, #22c55e 15%, transparent)' },
  stable:      { label: 'Stable',      color: 'var(--text-secondary)', bg: 'color-mix(in srgb, var(--text-muted) 15%, transparent)' },
  contracting: { label: 'Contracting', color: '#F5A623', bg: 'color-mix(in srgb, #F5A623 15%, transparent)' },
  frozen:      { label: 'Frozen',      color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 15%, transparent)' },
};

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  return (
    <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', width: '100%' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${Math.min(100, (score / max) * 100)}%`,
        background: scoreColor(score),
        borderRadius: 3,
        transition: 'width 400ms ease',
      }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { networks: NetworkIntelRow[]; }

export default function NetworkIntelClient({ networks }: Props) {
  const [search, setSearch]             = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [sortCol, setSortCol]           = useState<'combined' | 'market' | 'relationship'>('combined');
  const [sortDir, setSortDir]           = useState<'desc' | 'asc'>('desc');
  const [showMethod, setShowMethod]     = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return networks.filter((n) => {
      if (signalFilter === 'hot'    && (n.combined_score == null || n.combined_score < 7))  return false;
      if (signalFilter === 'active' && (n.combined_score == null || n.combined_score < 4 || n.combined_score >= 7)) return false;
      if (signalFilter === 'watch'  && (n.combined_score == null || n.combined_score >= 4)) return false;
      if (signalFilter === 'unrated' && n.market_score != null)  return false;
      if (!q) return true;
      return (
        n.name.toLowerCase().includes(q) ||
        (n.type ?? '').toLowerCase().includes(q) ||
        (n.key_buyer ?? '').toLowerCase().includes(q) ||
        n.genres.some(g => g.toLowerCase().includes(q))
      );
    });
  }, [networks, search, signalFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Unrated always last
      const aVal = sortCol === 'combined' ? (a.combined_score ?? -1) :
                   sortCol === 'market'   ? (a.market_score ?? -1) :
                                            a.relationship_score;
      const bVal = sortCol === 'combined' ? (b.combined_score ?? -1) :
                   sortCol === 'market'   ? (b.market_score ?? -1) :
                                            b.relationship_score;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [filtered, sortCol, sortDir]);

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const filterCounts = useMemo(() => ({
    all:     networks.length,
    hot:     networks.filter(n => (n.combined_score ?? 0) >= 7).length,
    active:  networks.filter(n => (n.combined_score ?? -1) >= 4 && (n.combined_score ?? -1) < 7).length,
    watch:   networks.filter(n => n.market_score != null && (n.combined_score ?? 0) < 4).length,
    unrated: networks.filter(n => n.market_score == null).length,
  }), [networks]);

  return (
    <div className="space-y-5">

      {/* Controls ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 300 }}>
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search networks, genres, buyers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                borderRadius: 8, border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-alt)', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Signal filter chips */}
        {([
          { key: 'all',     label: 'All Networks' },
          { key: 'hot',     label: 'Hot (7.0+)' },
          { key: 'active',  label: 'Active (4–7)' },
          { key: 'watch',   label: 'Watch (<4)' },
          { key: 'unrated', label: 'Unrated' },
        ] as { key: SignalFilter; label: string }[]).map(({ key, label }) => {
          const score = key === 'hot' ? 8 : key === 'active' ? 5 : key === 'watch' ? 2 : key === 'unrated' ? -1 : 6;
          const isActive = signalFilter === key;
          return (
            <button
              key={key}
              onClick={() => setSignalFilter(prev => prev === key ? 'all' : key)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid',
                borderColor: isActive ? (score < 0 ? 'var(--border-subtle)' : scoreColor(score)) : 'var(--border-subtle)',
                background: isActive ? (score < 0 ? 'var(--bg-surface-alt)' : scoreBg(score)) : 'transparent',
                color: isActive ? (score < 0 ? 'var(--text-secondary)' : scoreColor(score)) : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >
              {label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.65 }}>
                {filterCounts[key]}
              </span>
            </button>
          );
        })}

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginRight: 4 }}>Sort:</span>
          {(['combined', 'market', 'relationship'] as const).map(col => (
            <button
              key={col}
              onClick={() => toggleSort(col)}
              style={{
                padding: '5px 10px', borderRadius: 5, border: '1px solid var(--border-subtle)',
                background: sortCol === col ? 'var(--bg-surface-alt)' : 'transparent',
                color: sortCol === col ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 11, fontWeight: sortCol === col ? 600 : 400, cursor: 'pointer',
              }}
            >
              {col === 'combined' ? 'Combined' : col === 'market' ? 'Market' : 'Relationship'}
              {sortCol === col && (sortDir === 'desc' ? ' ↓' : ' ↑')}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {sorted.length} of {networks.length}
        </span>
      </div>

      {/* Score legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Score:</span>
        {[
          { label: '7.0+ Hot',       color: 'var(--accent)' },
          { label: '5.0–6.9 Active', color: '#F5A623' },
          { label: '3.0–4.9 Watch',  color: 'var(--text-secondary)' },
          { label: '<3.0 Low',       color: 'var(--text-muted)' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Ranking rows ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {sorted.map((n, idx) => {
          const budget = n.budget_signal ? BUDGET_STYLES[n.budget_signal] : null;
          const isRated = n.market_score != null;

          return (
            <div
              key={n.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: '36px 1fr 240px',
                gap: 16,
                alignItems: 'start',
                opacity: isRated ? 1 : 0.7,
              }}
            >
              {/* Rank */}
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                fontFamily: "'Barlow Condensed', sans-serif",
                color: n.combined_score && n.combined_score >= 7 ? 'var(--accent)' : 'var(--text-muted)',
                lineHeight: 1,
                paddingTop: 2,
              }}>
                {isRated ? idx + 1 : '—'}
              </div>

              {/* Main content */}
              <div className="space-y-2 min-w-0">

                {/* Name + badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{
                    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em',
                  }}>
                    {n.name}
                  </span>
                  {n.type && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
                      background: 'var(--bg-surface-alt)', color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      {n.type}
                    </span>
                  )}
                  {budget && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                      background: budget.bg, color: budget.color,
                    }}>
                      {budget.label}
                    </span>
                  )}
                  {!isRated && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4,
                      background: 'var(--bg-surface-alt)', color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      Unrated
                    </span>
                  )}
                </div>

                {/* Notes */}
                {n.intel_notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {n.intel_notes}
                  </p>
                )}

                {/* Genre tags */}
                {n.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {n.genres.map(g => (
                      <span key={g} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                        background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Key buyer */}
                {n.key_buyer && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.key_buyer}</span>
                  </div>
                )}

                {/* Live DB metrics row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Contacts',    value: n.contact_count },
                    { label: 'Deals',       value: n.deal_count },
                    { label: 'Active pkgs', value: n.active_pitches },
                    { label: 'Last touch',  value: relativeTime(n.last_touch_date), isText: true },
                  ].map(({ label, value, isText }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                      <span style={{
                        fontSize: isText ? 11 : 13,
                        fontWeight: 600,
                        fontFamily: isText ? undefined : "'JetBrains Mono', monospace",
                        color: (isText ? false : (value as number) > 0) ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score panel */}
              <div style={{
                background: 'var(--bg-surface-alt)', borderRadius: 8, padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {isRated ? (
                  <>
                    {/* Combined score */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 32, fontWeight: 800,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          color: scoreColor(n.combined_score ?? 0),
                          lineHeight: 1,
                        }}>
                          {(n.combined_score ?? 0).toFixed(1)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>/10</span>
                      </div>
                      <ScoreBar score={n.combined_score ?? 0} />
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Combined Score
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', gap: 12 }}>
                      {/* Market score */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market</span>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: scoreColor(n.market_score ?? 0) }}>
                            {(n.market_score ?? 0).toFixed(1)}
                          </span>
                        </div>
                        <ScoreBar score={n.market_score ?? 0} />
                      </div>

                      {/* Relationship score */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rel.</span>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: scoreColor(n.relationship_score) }}>
                            {n.relationship_score.toFixed(1)}
                          </span>
                        </div>
                        <ScoreBar score={n.relationship_score} />
                      </div>
                    </div>

                    {/* Intel date */}
                    {n.intel_updated_at && (
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'right' }}>
                        Research: {formatIntelDate(n.intel_updated_at)}
                      </div>
                    )}
                  </>
                ) : (
                  /* Unrated — show only relationship score */
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 32, fontWeight: 800,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        color: scoreColor(n.relationship_score),
                        lineHeight: 1,
                      }}>
                        {n.relationship_score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>/10</span>
                    </div>
                    <ScoreBar score={n.relationship_score} />
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Relationship Only
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>
                      No market intel — add to DB to score
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Scoring methodology ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
        <button
          onClick={() => setShowMethod(m => !m)}
          style={{
            width: '100%', padding: '12px 18px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Scoring Methodology
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showMethod ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showMethod && (
          <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Combined Score</strong> = (Market × 0.60) + (Relationship × 0.40)
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Market Score</strong> (0–10): Set manually on each network record. Researched quarterly from Deadline, Variety, THR, Realscreen, and C21. Reflects order volume, budget trajectory, genre openness, and structural stability.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Relationship Score</strong> (0–10): Computed live from the database. Formula: (deals × 3) + (greenlit packages × 3) + (warm packages × 2) + (active packages × 1), normalized to 10. Updates automatically as deals and packages are added.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>To score a new network</strong>, research these five factors and set market_score on the network record:
              </p>
              <ul style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                <li>① Order volume (10+ shows = 10, 6–10 = 7, 3–5 = 5, 1–2 = 2, freeze = 0)</li>
                <li>② Budget trajectory (expanding = 10, stable = 6, contracting = 3, frozen = 0)</li>
                <li>③ Genre fit for MYE (direct match = 10, 2–3 lanes = 6, minimal = 2)</li>
                <li>④ Structural stability (stable team = 10, minor churn = 6, layoffs = 3)</li>
                <li>⑤ Pitch accessibility (open door = 10, needs agent = 6, invite-only = 2)</li>
              </ul>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Update market intel quarterly via the Networks tab (edit network → set market_score + budget_signal + key_buyer + genre_mandate).
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
