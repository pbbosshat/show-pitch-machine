'use client';
// NetworkIntelClient — Market buying intelligence ranking for TV networks.
// Data is research-derived (May 2026) and hardcoded here; update quarterly.
// Scoring: Combined = (Market × 0.60) + (Relationship × 0.40)
// Market score = external buying activity from trades (Deadline/Variety/THR/Realscreen).
// Relationship score = normalized from MYE internal pitch thread outcomes (max raw = 27 → 10).

import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BudgetSignal = 'expanding' | 'stable' | 'contracting' | 'frozen';
type SignalFilter = 'all' | 'hot' | 'active' | 'watch';

export interface NetworkIntelItem {
  rank: number;
  name: string;
  shortName: string;
  type: string;
  marketScore: number;
  relationshipScore: number;
  combinedScore: number;
  budgetSignal: BudgetSignal;
  genres: string[];
  keyBuyer: string;
  myeActive: string[];   // active MYE pitches / shows at this network
  notes: string;
  dataDate: string;
}

// ─── Static intelligence data — update quarterly ──────────────────────────────

const INTEL: NetworkIntelItem[] = [
  {
    rank: 1,
    name: 'NBCUniversal / Bravo / Peacock',
    shortName: 'NBCU',
    type: 'Broadcast + Streaming',
    marketScore: 8.0,
    relationshipScore: 10.0,
    combinedScore: 8.8,
    budgetSignal: 'expanding',
    genres: ['Housewives extensions', 'Celebrity docuseries', 'Competitive reality', 'True crime'],
    keyBuyer: 'Frances Berwick (Chairman), Rachel Smith (EVP)',
    myeActive: ['Pokémon Crime Wave', 'Gone Viral', 'Star Witness'],
    notes: 'Strongest combined signal. Peacock is NBCU growth engine; Rachel Smith actively seeking "fresh ideas."',
    dataDate: 'May 2026',
  },
  {
    rank: 2,
    name: 'Fox Entertainment',
    shortName: 'Fox',
    type: 'Broadcast',
    marketScore: 9.0,
    relationshipScore: 1.5,
    combinedScore: 6.0,
    budgetSignal: 'expanding',
    genres: ['Competition formats', 'Game shows', 'Culinary / Gordon Ramsay', 'House reality'],
    keyBuyer: 'Sophie Leonard (EVP Unscripted)',
    myeActive: ['Pros vs Joes'],
    notes: 'Hottest market buyer on broadcast. Fear Factor hit 16.5M. Big gap: MYE has one show, no development relationship.',
    dataDate: 'May 2026',
  },
  {
    rank: 3,
    name: 'A+E Global Media',
    shortName: 'A+E',
    type: 'Cable',
    marketScore: 5.0,
    relationshipScore: 7.0,
    combinedScore: 5.8,
    budgetSignal: 'contracting',
    genres: ['Talent-anchored history', 'True crime', 'Law enforcement docu-reality', 'WWE / sports'],
    keyBuyer: 'Paul Buccieri (Chair), Jordan Harman (dev)',
    myeActive: ['Heirloom Hunters', 'A&E development deal'],
    notes: 'Warmest relationship (shared building, Buccieri contact). Market dampened by Disney/Hearst sale process.',
    dataDate: 'May 2026',
  },
  {
    rank: 4,
    name: 'Netflix',
    shortName: 'Netflix',
    type: 'Streaming',
    marketScore: 8.0,
    relationshipScore: 1.1,
    combinedScore: 5.2,
    budgetSignal: 'expanding',
    genres: ['Dating / relationship formats', 'Korean variety', 'Sports docs', 'Social experiments'],
    keyBuyer: 'Jeff Gaspin (VP Unscripted), Jenny Falkoff',
    myeActive: ['Reza Farahan / Shahs', 'Storm Chasing', 'Gone Viral'],
    notes: 'Gaspin greenlit 18 reality + 14 docs for 2026. Strong market; MYE has 3 acknowledged threads but zero greenlits.',
    dataDate: 'May 2026',
  },
  {
    rank: 5,
    name: 'Paramount+',
    shortName: 'P+',
    type: 'Streaming',
    marketScore: 5.0,
    relationshipScore: 4.4,
    combinedScore: 4.8,
    budgetSignal: 'expanding',
    genres: ['Dating / relationship reality', 'True crime docs', 'Celebrity reality'],
    keyBuyer: 'Jane Wiseman (Head Originals), Damla Dogan (unscripted)',
    myeActive: ['Trial of Brian Walshe', 'Sandy Shaw', 'Snooki project (In Production)'],
    notes: 'Just woke up post-Skydance freeze. First greenlit March 2026. Dogan is already in MYE\'s contact database.',
    dataDate: 'May 2026',
  },
  {
    rank: 6,
    name: 'Warner Bros. Discovery',
    shortName: 'WBD',
    type: 'Cable',
    marketScore: 4.0,
    relationshipScore: 5.2,
    combinedScore: 4.5,
    budgetSignal: 'contracting',
    genres: ['Franchise extensions', 'Lifestyle / home reno', 'Premium true crime docs'],
    keyBuyer: 'Channing Dungey (Chairman), Howard Lee (CCO)',
    myeActive: ['Ghost Adventures (In Production)', 'Programming 2026/27 conversation'],
    notes: 'Prefer franchise renewals over new IP. HGTV cut 7 shows. Best play: GA renewal + upsell into new season.',
    dataDate: 'May 2026',
  },
  {
    rank: 7,
    name: 'Amazon Prime Video',
    shortName: 'Amazon',
    type: 'Streaming',
    marketScore: 7.0,
    relationshipScore: 0.0,
    combinedScore: 4.2,
    budgetSignal: 'expanding',
    genres: ['IP-backed competition', 'Massive-prize formats', 'Sports docs'],
    keyBuyer: 'Post-Falkoff team (Falkoff moved to Netflix)',
    myeActive: [],
    notes: 'Beast Games S2/S3 already ordered. Fallout: Shelter in production. No MYE relationship — build one.',
    dataDate: 'May 2026',
  },
  {
    rank: 8,
    name: 'Hulu',
    shortName: 'Hulu',
    type: 'Streaming',
    marketScore: 7.0,
    relationshipScore: 0.0,
    combinedScore: 4.2,
    budgetSignal: 'stable',
    genres: ['Celebrity docu-reality', 'Lifestyle competition', 'Personality-driven reality'],
    keyBuyer: 'Hulu Originals unscripted team',
    myeActive: [],
    notes: 'Get Real House event signals active buying. Secret Lives, Kardashian-adjacent formats converting. No MYE relationship.',
    dataDate: 'May 2026',
  },
  {
    rank: 9,
    name: 'Investigation Discovery',
    shortName: 'ID',
    type: 'Cable',
    marketScore: 7.0,
    relationshipScore: 0.0,
    combinedScore: 4.2,
    budgetSignal: 'stable',
    genres: ['Premium true crime docs', 'Serial killer docs', 'Cold case investigative'],
    keyBuyer: 'Jason Sarlanis (President, ID/TNT/TBS)',
    myeActive: [],
    notes: 'Docbuster strategy = fewer but bigger true crime docs. Highest-volume true crime buyer in industry. MYE has Sandy/Walshe-type IP.',
    dataDate: 'May 2026',
  },
  {
    rank: 10,
    name: 'Hallmark',
    shortName: 'Hallmark',
    type: 'Cable',
    marketScore: 6.0,
    relationshipScore: 0.0,
    combinedScore: 3.6,
    budgetSignal: 'expanding',
    genres: ['Baking competition', 'Home renovation', '"Reality with Heart" formats'],
    keyBuyer: 'Hallmark Originals unscripted team',
    myeActive: [],
    notes: 'New entrant to unscripted (April 2025 initiative). Strict brand filter: joy/warmth/family only. Growing but thin slate.',
    dataDate: 'May 2026',
  },
  {
    rank: 11,
    name: 'Channel 4 (co-pro)',
    shortName: 'C4',
    type: 'International / Co-Pro',
    marketScore: 6.0,
    relationshipScore: 0.0,
    combinedScore: 3.6,
    budgetSignal: 'expanding',
    genres: ['Factual entertainment', 'Returnable formats', 'International adaptation'],
    keyBuyer: 'Channel 4 Unscripted Development Fund team',
    myeActive: [],
    notes: 'New dev fund launched April 2026 targeting formats with global adaptation potential. 35% indie quota increasing. Co-pro angle.',
    dataDate: 'May 2026',
  },
  {
    rank: 12,
    name: 'Apple TV+',
    shortName: 'Apple',
    type: 'Streaming',
    marketScore: 6.0,
    relationshipScore: 0.0,
    combinedScore: 3.6,
    budgetSignal: 'stable',
    genres: ['Sports docs (elite access)', 'Premium true crime', 'Prestige documentary'],
    keyBuyer: 'Kim Rozenfeld (unscripted)',
    myeActive: [],
    notes: 'Very selective — 1-2 tentpole unscripted/year. Budget not the filter; brand quality is. Not a volume buyer.',
    dataDate: 'May 2026',
  },
  {
    rank: 13,
    name: 'AMC / All Reality',
    shortName: 'AMC',
    type: 'Cable + Streaming',
    marketScore: 6.0,
    relationshipScore: 0.0,
    combinedScore: 3.6,
    budgetSignal: 'stable',
    genres: ['Love After Lockup', 'Relationship reality', 'Family reality'],
    keyBuyer: 'AMC Networks Originals team',
    myeActive: [],
    notes: 'All Reality streaming service launched Nov 2025 (2,500 hrs). Primarily a library play; limited new commissions.',
    dataDate: 'May 2026',
  },
  {
    rank: 14,
    name: 'HBO / Max',
    shortName: 'HBO',
    type: 'Streaming',
    marketScore: 5.0,
    relationshipScore: 0.4,
    combinedScore: 3.1,
    budgetSignal: 'stable',
    genres: ['Investigative docs', 'Prestige documentary', 'Sports docs'],
    keyBuyer: 'HBO Documentary Films team',
    myeActive: ['Sports Doc (Bentley Weiner, acknowledged)'],
    notes: 'Zizians doc greenlit April 2026. Small volume, high prestige. Journalism-anchored true crime is the lane.',
    dataDate: 'May 2026',
  },
  {
    rank: 15,
    name: 'Disney+ / NatGeo',
    shortName: 'Disney+',
    type: 'Streaming',
    marketScore: 4.0,
    relationshipScore: 0.0,
    combinedScore: 2.4,
    budgetSignal: 'stable',
    genres: ['Nature documentary', 'Prestige brand-adjacent', 'Celebrity nature docs'],
    keyBuyer: 'National Geographic Documentary team',
    myeActive: [],
    notes: 'Not a general unscripted buyer. Reality/competition routes through Hulu. NatGeo = nature/prestige docs only.',
    dataDate: 'May 2026',
  },
  {
    rank: 16,
    name: 'Reelz',
    shortName: 'Reelz',
    type: 'Cable',
    marketScore: 3.0,
    relationshipScore: 0.4,
    combinedScore: 1.9,
    budgetSignal: 'contracting',
    genres: ['Celebrity true crime', 'Music docs', 'Sports / NFL'],
    keyBuyer: 'Rob Swartz (development)',
    myeActive: ['NFL / Go To Team collab (acknowledged)'],
    notes: 'Small cable buyer with contracting budget. Active relationship but low volume and niche mandate.',
    dataDate: 'May 2026',
  },
];

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

const BUDGET_STYLES: Record<BudgetSignal, { label: string; color: string; bg: string }> = {
  expanding:   { label: 'Expanding',   color: '#22c55e', bg: 'color-mix(in srgb, #22c55e 15%, transparent)' },
  stable:      { label: 'Stable',      color: 'var(--text-secondary)', bg: 'color-mix(in srgb, var(--text-muted) 15%, transparent)' },
  contracting: { label: 'Contracting', color: '#F5A623', bg: 'color-mix(in srgb, #F5A623 15%, transparent)' },
  frozen:      { label: 'Frozen',      color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 15%, transparent)' },
};

function signalLabel(filter: SignalFilter): string {
  if (filter === 'hot')    return 'Hot (7.0+)';
  if (filter === 'active') return 'Active (4.0–6.9)';
  if (filter === 'watch')  return 'Watch (<4.0)';
  return 'All Networks';
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div
      style={{
        height: 5,
        borderRadius: 3,
        background: 'var(--bg-elevated)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          background: scoreColor(score),
          borderRadius: 3,
          transition: 'width 400ms ease',
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NetworkIntelClient() {
  const [search, setSearch]             = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const [sortCol, setSortCol]           = useState<'combined' | 'market' | 'relationship'>('combined');
  const [sortDir, setSortDir]           = useState<'desc' | 'asc'>('desc');
  const [showMethod, setShowMethod]     = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return INTEL.filter((n) => {
      if (signalFilter === 'hot'    && n.combinedScore < 7)   return false;
      if (signalFilter === 'active' && (n.combinedScore < 4 || n.combinedScore >= 7)) return false;
      if (signalFilter === 'watch'  && n.combinedScore >= 4)  return false;
      if (!q) return true;
      return (
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.genres.some(g => g.toLowerCase().includes(q)) ||
        n.keyBuyer.toLowerCase().includes(q)
      );
    });
  }, [search, signalFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortCol === 'combined' ? a.combinedScore : sortCol === 'market' ? a.marketScore : a.relationshipScore;
      const bv = sortCol === 'combined' ? b.combinedScore : sortCol === 'market' ? b.marketScore : b.relationshipScore;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [filtered, sortCol, sortDir]);

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const dataDate = INTEL[0]?.dataDate ?? 'May 2026';

  return (
    <div className="space-y-5">

      {/* Controls ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Search */}
        <div style={{ flex: 1, maxWidth: 300 }}>
          <div style={{ position: 'relative' }}>
            <svg
              width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search networks, genres, buyers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-alt)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Signal filter chips */}
        {(['all', 'hot', 'active', 'watch'] as SignalFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setSignalFilter(prev => prev === f ? 'all' : f)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: signalFilter === f ? scoreColor(f === 'hot' ? 8 : f === 'active' ? 5 : 2) : 'var(--border-subtle)',
              background: signalFilter === f ? scoreBg(f === 'hot' ? 8 : f === 'active' ? 5 : 2) : 'transparent',
              color: signalFilter === f ? scoreColor(f === 'hot' ? 8 : f === 'active' ? 5 : 2) : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            {signalLabel(f)}
          </button>
        ))}

        {/* Sort buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: 'var(--text-muted)' }}>Sort:</span>
          {(['combined', 'market', 'relationship'] as const).map(col => (
            <button
              key={col}
              onClick={() => toggleSort(col)}
              style={{
                padding: '5px 10px',
                borderRadius: 5,
                border: '1px solid var(--border-subtle)',
                background: sortCol === col ? 'var(--bg-surface-alt)' : 'transparent',
                color: sortCol === col ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: sortCol === col ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {col === 'combined' ? 'Combined' : col === 'market' ? 'Market' : 'Relationship'}
              {sortCol === col && (sortDir === 'desc' ? ' ↓' : ' ↑')}
            </button>
          ))}
        </div>

        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sorted.length} of {INTEL.length}
        </span>
      </div>

      {/* Score key */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Score key:</span>
        {[
          { label: '7.0+ Hot',      color: 'var(--accent)' },
          { label: '5.0–6.9 Active', color: '#F5A623' },
          { label: '3.0–4.9 Watch',  color: 'var(--text-secondary)' },
          { label: '<3.0 Low',       color: 'var(--text-muted)' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Ranking rows ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {sorted.map((n) => {
          const budget = BUDGET_STYLES[n.budgetSignal];
          const hasMye = n.myeActive.length > 0;
          return (
            <div
              key={n.name}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: '36px 1fr 260px',
                gap: 16,
                alignItems: 'start',
              }}
            >
              {/* Rank */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: n.combinedScore >= 7 ? 'var(--accent)' : 'var(--text-muted)',
                  lineHeight: 1,
                  paddingTop: 2,
                }}
              >
                {n.rank}
              </div>

              {/* Main content */}
              <div className="space-y-2 min-w-0">
                {/* Network name + type + budget badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: '0.02em',
                    }}
                  >
                    {n.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: 'var(--bg-surface-alt)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {n.type}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: budget.bg,
                      color: budget.color,
                    }}
                  >
                    {budget.label}
                  </span>
                </div>

                {/* Notes */}
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {n.notes}
                </p>

                {/* Genre tags */}
                <div className="flex flex-wrap gap-1.5">
                  {n.genres.map(g => (
                    <span
                      key={g}
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Key buyer */}
                <div className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.keyBuyer}</span>
                </div>

                {/* MYE active pitches */}
                {hasMye && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>MYE active:</span>
                    {n.myeActive.map(p => (
                      <span
                        key={p}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                          color: 'var(--accent)',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Score panel */}
              <div
                style={{
                  background: 'var(--bg-surface-alt)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Combined score — large */}
                <div>
                  <div className="flex items-end gap-1.5 mb-1.5">
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 800,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        color: scoreColor(n.combinedScore),
                        lineHeight: 1,
                      }}
                    >
                      {n.combinedScore.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>/10</span>
                  </div>
                  <ScoreBar score={n.combinedScore} />
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Combined Score
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', gap: 12 }}>
                  {/* Market score */}
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: scoreColor(n.marketScore) }}>
                        {n.marketScore.toFixed(1)}
                      </span>
                    </div>
                    <ScoreBar score={n.marketScore} />
                  </div>

                  {/* Relationship score */}
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rel.</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: scoreColor(n.relationshipScore) }}>
                        {n.relationshipScore.toFixed(1)}
                      </span>
                    </div>
                    <ScoreBar score={n.relationshipScore} />
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Scoring methodology ──────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setShowMethod(m => !m)}
          style={{
            width: '100%',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Scoring Methodology
          </span>
          <svg
            width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showMethod ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showMethod && (
          <div
            style={{
              padding: '0 18px 16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            <div>
              <p className="text-xs mt-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Combined Score</strong> = (Market × 0.60) + (Relationship × 0.40)
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Market Score</strong> (1–10): External buying activity researched from Deadline, Variety, THR, Realscreen, C21, and Cynopsis. Factors: order volume, budget trajectory, genre openness, structural stability, pitch accessibility.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Relationship Score</strong> (1–10): Normalized from MYE internal pitch thread outcomes. Raw score (max 27) computed as: Greenlit/Deal × 3 + In Production × 3 + Under Review × 2 + Meeting Scheduled × 2 + Acknowledged × 1. Normalized to 10-point scale.
              </p>
            </div>
            <div>
              <p className="text-xs mt-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>To score a new network</strong>, research these five factors and weight equally:
              </p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>① Order volume (10+ shows = 10, 6–10 = 7, 3–5 = 5, 1–2 = 2, freeze = 0)</li>
                <li>② Budget trajectory (expanding = 10, stable = 6, contracting = 3, frozen = 0)</li>
                <li>③ Genre fit for MYE (direct match = 10, 2–3 lanes = 6, minimal = 2)</li>
                <li>④ Structural stability (stable team = 10, minor churn = 6, layoffs = 3)</li>
                <li>⑤ Pitch accessibility (open door = 10, needs agent = 6, invite-only = 2)</li>
              </ul>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Data current as of <strong style={{ color: 'var(--text-secondary)' }}>{dataDate}</strong>. Refresh quarterly against trade press.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
