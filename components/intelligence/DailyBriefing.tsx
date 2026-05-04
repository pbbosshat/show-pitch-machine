'use client';
/**
 * DailyBriefing — the full trade feed for the dashboard.
 *
 * Pulls all actionable trade_articles (greenlits, cancellations, exec moves,
 * mandates) sorted relevance-first: Tier 1 (MYE lane) → execs/mandates → Tier 2.
 * Not-relevant noise is hidden by default and unlocked via toggle.
 *
 * Filters: type (Shows / People / Mandates) and source (per-scraper pill).
 * Both filters are client-side — one fetch, zero extra round-trips.
 *
 * Feedback: each row has a dropdown to flag the item with an exclusion reason.
 * Flags POST to /api/intelligence/briefing/feedback for filter tuning review.
 */

import useSWR from 'swr';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { BriefingItem } from '@/app/api/intelligence/briefing/route';

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'greenlit' | 'exec-move' | 'mandate' | 'cancelled';
type SourceFilter = Set<string>; // empty = show all

interface BriefingResponse {
  data: BriefingItem[];
  window: 'today' | '7days';
  sources: string[];
  total: number;
  skip_count: number;
}

interface EnrichmentData {
  brief: string | null;
  production_company: string | null;
  buyer_name: string | null;
  buyer_company: string | null;
}

// ─── Feedback reasons ─────────────────────────────────────────────────────────

const FEEDBACK_REASONS = [
  { value: 'not_relevant', label: 'Not Relevant',       color: '#4A5D80' },
  { value: 'scripted',     label: 'Scripted Content',   color: '#9B59B6' },
  { value: 'wrong_genre',  label: 'Wrong Genre',        color: '#E67E22' },
  { value: 'in_pipeline',  label: 'Already In Pipeline', color: '#27AE60' },
  { value: 'duplicate',    label: 'Duplicate',           color: '#95A5A6' },
] as const;

type FeedbackReason = (typeof FEEDBACK_REASONS)[number]['value'];

function reasonLabel(reason: FeedbackReason): string {
  return FEEDBACK_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

// ─── Signal Badge Config ──────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  'freed-budget': { label: 'FREED BUDGET', bg: 'rgba(245,166,35,0.18)',  color: '#F5A623' },
  'mandate':      { label: 'MANDATE',      bg: 'rgba(204,18,44,0.18)',   color: '#CC1C2C' },
  'greenlit':     { label: 'GREENLIT',     bg: 'rgba(34,197,94,0.18)',   color: '#22C55E' },
  'renewed':      { label: 'RENEWED',      bg: 'rgba(96,165,250,0.18)',  color: '#60A5FA' },
  'noise':        { label: 'SCRIPTED',     bg: 'rgba(74,93,128,0.15)',   color: '#4A5D80' },
};

const ITEM_TYPE_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  'exec-move':         { label: 'EXEC MOVE', bg: 'rgba(167,139,250,0.18)', color: '#A78BFA' },
  'mandate-statement': { label: 'MANDATE',   bg: 'rgba(204,18,44,0.18)',   color: '#CC1C2C' },
  'cancelled':         { label: 'CANCELLED', bg: 'rgba(245,166,35,0.18)',  color: '#F5A623' },
  'greenlit':          { label: 'GREENLIT',  bg: 'rgba(34,197,94,0.18)',   color: '#22C55E' },
};

function signalStyle(item: BriefingItem): { label: string; bg: string; color: string } {
  if (item.item_type === 'exec-move') return ITEM_TYPE_STYLES['exec-move'];
  if (item.signal_type && SIGNAL_STYLES[item.signal_type]) return SIGNAL_STYLES[item.signal_type];
  if (item.item_type && ITEM_TYPE_STYLES[item.item_type]) return ITEM_TYPE_STYLES[item.item_type];
  return { label: 'UPDATE', bg: 'rgba(74,93,128,0.15)', color: '#4A5D80' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemMatchesType(item: BriefingItem, filter: TypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'greenlit') return item.item_type === 'greenlit' && item.relevance_tier !== '3-skip';
  if (filter === 'exec-move') return item.item_type === 'exec-move';
  if (filter === 'mandate') return item.item_type === 'mandate-statement' && item.relevance_tier !== '3-skip';
  if (filter === 'cancelled') return item.item_type === 'cancelled';
  return true;
}

function formatSource(src: string): string {
  const map: Record<string, string> = {
    'deadline': 'Deadline',
    'variety': 'Variety',
    'thr': 'THR',
    'tvline': 'TVLine',
    'realscreen': 'Realscreen',
    'cynopsis': 'Cynopsis',
    'c21': 'C21',
    'indiewire': 'IndieWire',
    'bc': 'B&C',
    'production-weekly': 'Prod Weekly',
    'cynopsis.com': 'Cynopsis',
    'worldscreen.com': 'World Screen',
    'mediapost.com': 'MediaPost',
    'tvnewscheck.com': 'TVNewsCheck',
    'senalnews.com': 'Señal News',
    'broadbandtvnews.com': 'BBTVN',
    'nexttv.com': 'NextTV',
    'playbackonline.ca': 'Playback',
  };
  return map[src] ?? src;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Filter Pill ──────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-semibold tracking-wide uppercase transition-colors"
      style={{
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// ─── Source Dropdown ──────────────────────────────────────────────────────────

function SourceDropdown({
  sources,
  selected,
  counts,
  onChange,
}: {
  sources: string[];
  selected: SourceFilter;
  counts: Record<string, number>;
  onChange: (next: SourceFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allSelected = selected.size === 0;

  function toggleSource(src: string) {
    const next = new Set(selected);
    if (next.has(src)) next.delete(src);
    else next.add(src);
    onChange(next);
  }

  function selectAll() { onChange(new Set()); }
  function clearAll() { onChange(new Set(sources)); }

  // Button label
  let label: string;
  if (allSelected) {
    label = 'All Sources';
  } else if (selected.size === 1) {
    label = formatSource([...selected][0]);
  } else {
    label = `${sources.length - selected.size} Sources`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold tracking-wide uppercase transition-colors"
        style={{
          background: !allSelected ? 'var(--accent)' : 'var(--bg-elevated)',
          color: !allSelected ? '#fff' : 'var(--text-secondary)',
          border: !allSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-1 rounded-lg border shadow-xl"
          style={{
            top: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            minWidth: '160px',
          }}
        >
          {/* Select All / Clear All */}
          <div className="flex gap-0 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={selectAll}
              className="flex-1 px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-left transition-colors"
              style={{ color: allSelected ? 'var(--accent)' : 'var(--text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="flex-1 px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-right transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              Clear All
            </button>
          </div>

          {/* Source list */}
          {sources.map((src) => {
            const checked = !selected.has(src);
            return (
              <button
                key={src}
                onClick={() => toggleSource(src)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left"
                style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    border: checked ? '2px solid var(--accent)' : '2px solid var(--border-strong)',
                    background: checked ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {checked && (
                    <svg viewBox="0 0 10 8" width="8" height="7" style={{ position: 'absolute', top: '1px', left: '1px', fill: '#fff' }}>
                      <path d="M0 4l3 3L10 0" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="flex-1">{formatSource(src)}</span>
                {counts[src] != null && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}>
                    {counts[src]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Feedback Dropdown ────────────────────────────────────────────────────────

function FeedbackButton({
  articleId,
  headline,
  source,
  currentFeedback,
  onFeedback,
}: {
  articleId: string;
  headline: string | null;
  source: string | null;
  currentFeedback: FeedbackReason | null;
  onFeedback: (articleId: string, reason: FeedbackReason | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleSelect(reason: FeedbackReason) {
    setOpen(false);
    setSaving(true);
    try {
      await fetch('/api/intelligence/briefing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, reason, headline, source }),
      });
      onFeedback(articleId, reason);
    } catch {
      // silent — feedback is best-effort; don't interrupt the user's flow
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setOpen(false);
    setSaving(true);
    try {
      await fetch('/api/intelligence/briefing/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      });
      onFeedback(articleId, null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const hasFeedback = !!currentFeedback;

  return (
    <div ref={ref} className="relative shrink-0 self-center">
      <button
        onClick={() => setOpen((v) => !v)}
        title={hasFeedback ? `Flagged: ${reasonLabel(currentFeedback!)}` : 'Flag this item'}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all"
        style={{
          background: hasFeedback ? 'rgba(74,93,128,0.18)' : 'transparent',
          color: hasFeedback ? 'var(--text-secondary)' : 'var(--text-muted)',
          border: hasFeedback ? '1px solid var(--border-subtle)' : '1px solid transparent',
          opacity: saving ? 0.5 : 1,
          cursor: saving ? 'wait' : 'pointer',
          minWidth: '22px',
        }}
      >
        {hasFeedback ? (
          // Show abbreviated reason when flagged
          <span style={{ maxWidth: '72px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reasonLabel(currentFeedback!)}
          </span>
        ) : (
          <span style={{ fontSize: '14px', lineHeight: 1 }}>⋯</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 rounded-lg border shadow-xl"
          style={{
            top: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            minWidth: '170px',
          }}
        >
          <div
            className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase border-b"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
          >
            Flag as…
          </div>
          {FEEDBACK_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => handleSelect(r.value)}
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{
                color: currentFeedback === r.value ? r.color : 'var(--text-primary)',
                background: currentFeedback === r.value ? 'var(--bg-elevated)' : 'transparent',
                fontWeight: currentFeedback === r.value ? 600 : 400,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = currentFeedback === r.value ? 'var(--bg-elevated)' : 'transparent'; }}
            >
              {currentFeedback === r.value ? '✓ ' : ''}{r.label}
            </button>
          ))}
          {/* Clear option — only shown when item is already flagged */}
          {currentFeedback && (
            <>
              <div className="mx-3 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
              <button
                onClick={handleClear}
                className="w-full text-left px-3 py-2 text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                ✕ Remove flag
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Feed Row ─────────────────────────────────────────────────────────────────

function BriefingRow({
  item,
  enrichment,
  feedback,
  onFeedback,
}: {
  item: BriefingItem;
  enrichment: EnrichmentData | null;
  feedback: FeedbackReason | null;
  onFeedback: (articleId: string, reason: FeedbackReason | null) => void;
}) {
  const sig = signalStyle(item);
  const hasLink = !!item.url;
  const isFlagged = !!feedback;

  // Resolve enrichment: prefer DB-stored values, fall back to live enrichment state
  const brief = enrichment?.brief ?? item.brief;
  const productionCompany = enrichment?.production_company ?? item.production_company;
  const buyerName = enrichment?.buyer_name ?? item.buyer_name;
  const buyerCompany = enrichment?.buyer_company ?? item.buyer_company;

  // Fall back to body snippet if LLM brief isn't ready yet
  const briefText = brief ?? item.body_snippet?.split(/[.!?]\s/)[0]?.trim() ?? null;

  // Collect context chips (non-null entity fields)
  const contextChips = [productionCompany, buyerName, buyerCompany].filter(Boolean) as string[];

  const headline = (
    <span
      className="text-sm font-medium leading-snug"
      style={{
        color: hasLink ? 'var(--text-primary)' : 'var(--text-secondary)',
        textDecoration: isFlagged ? 'line-through' : undefined,
        opacity: isFlagged ? 0.5 : 1,
      }}
    >
      {item.headline}
    </span>
  );

  return (
    <div
      className="flex items-start gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0 group"
      style={{ opacity: isFlagged ? 0.65 : 1, transition: 'opacity 0.2s' }}
    >
      {/* Signal badge — top-aligned */}
      <span
        className="shrink-0 mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase w-[108px] justify-center"
        style={{ background: sig.bg, color: sig.color }}
      >
        {sig.label}
      </span>

      {/* Headline + brief + entity chips */}
      <div className="flex-1 min-w-0">
        {hasLink ? (
          <a href={item.url!} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-[var(--border-strong)]">
            {headline}
          </a>
        ) : (
          headline
        )}

        {/* One-sentence brief */}
        {briefText && (
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
            {briefText.length > 160 ? briefText.slice(0, 157) + '…' : briefText}
          </p>
        )}

        {/* Entity chips: production company · buyer name · buyer company */}
        {contextChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
            {contextChips.map((chip, i) => (
              <span key={i} className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {i > 0 && <span style={{ color: 'var(--border-strong)', marginRight: '0.375rem' }}>·</span>}
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source + date */}
      <div
        className="shrink-0 flex flex-col items-end gap-0.5 text-right"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {item.source && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {formatSource(item.source)}
          </span>
        )}
        {item.scraped_at && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            {formatDistanceToNow(new Date(item.scraped_at), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Feedback dropdown — visible on row hover, always accessible once flagged */}
      <div className={`transition-opacity ${isFlagged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <FeedbackButton
          articleId={item.id}
          headline={item.headline}
          source={item.source}
          currentFeedback={feedback}
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyBriefing() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedSources, setSelectedSources] = useState<SourceFilter>(new Set());
  const [hideNotRelevant, setHideNotRelevant] = useState(true);
  const [showFlagged, setShowFlagged] = useState(false);

  // In-session feedback map: article_id → reason. Persists across SWR refreshes.
  const [feedbackMap, setFeedbackMap] = useState<Map<string, FeedbackReason>>(new Map());
  // Enrichment overlay: article_id → live enrichment result (merged on top of DB values)
  const [enrichMap, setEnrichMap] = useState<Map<string, EnrichmentData>>(new Map());
  // Track which IDs have been submitted to the enrich endpoint to avoid duplicate calls
  const enrichedIds = useRef<Set<string>>(new Set());

  const handleFeedback = useCallback((articleId: string, reason: FeedbackReason | null) => {
    setFeedbackMap((prev) => {
      const next = new Map(prev);
      if (reason === null) next.delete(articleId);
      else next.set(articleId, reason);
      return next;
    });
  }, []);

  const apiUrl = `/api/intelligence/briefing${hideNotRelevant ? '' : '?include_skip=1'}`;

  const { data, isLoading, error } = useSWR<BriefingResponse>(apiUrl, fetcher, {
    refreshInterval: 60_000,
  });

  const allItems = data?.data ?? [];
  const sources   = data?.sources ?? [];
  const skipCount = data?.skip_count ?? 0;
  const window    = data?.window;

  // Count articles per source from the current API response (respects not-relevant toggle)
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      if (item.source) counts[item.source] = (counts[item.source] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  // Background enrichment: when briefing loads, enrich any items missing a brief
  useEffect(() => {
    if (allItems.length === 0) return;

    const toEnrich = allItems
      .filter((item) => item.brief === null && !enrichedIds.current.has(item.id))
      .slice(0, 10)
      .map((item) => item.id);

    if (toEnrich.length === 0) return;

    toEnrich.forEach((id) => enrichedIds.current.add(id));

    fetch('/api/intelligence/briefing/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_ids: toEnrich }),
    })
      .then((r) => r.json())
      .then((res: { enriched?: Record<string, EnrichmentData> }) => {
        if (!res.enriched) return;
        setEnrichMap((prev) => {
          const next = new Map(prev);
          for (const [id, data] of Object.entries(res.enriched!)) {
            next.set(id, data);
          }
          return next;
        });
      })
      .catch(() => {/* silent — enrichment is best-effort */});
  }, [allItems]);

  const { filtered, flaggedItems } = useMemo(() => {
    const visible: BriefingItem[] = [];
    const flagged: BriefingItem[] = [];
    for (const item of allItems) {
      if (!itemMatchesType(item, typeFilter)) continue;
      // selectedSources empty = show all; otherwise exclude sources not in the set
      if (selectedSources.size > 0 && !selectedSources.has(item.source ?? '')) continue;
      if (feedbackMap.has(item.id)) {
        flagged.push(item);
      } else {
        visible.push(item);
      }
    }
    return { filtered: visible, flaggedItems: flagged };
  }, [allItems, typeFilter, selectedSources, feedbackMap]);

  const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'greenlit',  label: 'Greenlits' },
    { key: 'exec-move', label: 'Exec Moves' },
    { key: 'mandate',   label: 'Mandates' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2
            className="text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'var(--text-muted)' }}
          >
            Intelligence
          </h2>
          {window === '7days' && (
            <span
              className="text-[11px] px-2 py-0.5 rounded"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              No scrapes today — showing last 7 days
            </span>
          )}
          {filtered.length > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle — reveal items you flagged this session so you can undo */}
          {flaggedItems.length > 0 && (
            <button
              onClick={() => setShowFlagged((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] transition-colors"
              style={{ color: showFlagged ? 'var(--text-secondary)' : 'var(--text-muted)' }}
            >
              <span
                className="inline-block w-7 h-4 rounded-full relative transition-colors"
                style={{ background: showFlagged ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                  style={{
                    background: showFlagged ? '#fff' : 'var(--text-muted)',
                    left: showFlagged ? '14px' : '2px',
                  }}
                />
              </span>
              {showFlagged ? `Hiding ${flaggedItems.length} flagged` : `Flagged (${flaggedItems.length})`}
            </button>
          )}

          {/* Toggle — hides tier-3 items classified as not relevant */}
          {skipCount > 0 && (
            <button
              onClick={() => setHideNotRelevant((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] transition-colors"
              style={{ color: hideNotRelevant ? 'var(--text-secondary)' : 'var(--text-muted)' }}
            >
              <span
                className="inline-block w-7 h-4 rounded-full relative transition-colors"
                style={{ background: hideNotRelevant ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                  style={{
                    background: hideNotRelevant ? '#fff' : 'var(--text-muted)',
                    left: hideNotRelevant ? '14px' : '2px',
                  }}
                />
              </span>
              {hideNotRelevant ? `Not relevant (${skipCount})` : 'Show not relevant'}
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_FILTERS.map(({ key, label }) => (
          <Pill key={key} label={label} active={typeFilter === key} onClick={() => setTypeFilter(key)} />
        ))}

        {sources.length > 0 && (
          <>
            <span className="h-4 w-px mx-1" style={{ background: 'var(--border-subtle)' }} />
            <SourceDropdown
              sources={sources}
              selected={selectedSources}
              counts={sourceCounts}
              onChange={setSelectedSources}
            />
          </>
        )}
      </div>

      {/* Feed */}
      <div
        className="rounded-lg border border-[var(--border-subtle)] px-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        {error && (
          <p className="py-6 text-sm text-center" style={{ color: 'var(--status-pass)' }}>
            {error.message ?? 'Failed to load briefing'}
          </p>
        )}

        {isLoading && (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0 animate-pulse"
              >
                <div className="h-5 w-28 rounded shrink-0" style={{ background: 'var(--bg-elevated)' }} />
                <div className="h-4 rounded flex-1" style={{ background: 'var(--bg-elevated)', maxWidth: '70%' }} />
                <div className="h-4 w-16 rounded shrink-0" style={{ background: 'var(--bg-elevated)' }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && !(showFlagged && flaggedItems.length > 0) && (
          <p className="py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            {allItems.length === 0
              ? "No briefing items yet — run scrapers to pull today's trade data"
              : flaggedItems.length > 0
                ? `All ${flaggedItems.length} item${flaggedItems.length !== 1 ? 's' : ''} flagged — toggle above to review`
                : 'No items match the current filter'}
          </p>
        )}

        {!isLoading && !error && (filtered.length > 0 || (showFlagged && flaggedItems.length > 0)) && (
          <div>
            {filtered.map((item) => (
              <BriefingRow
                key={item.id}
                item={item}
                enrichment={enrichMap.get(item.id) ?? null}
                feedback={null}
                onFeedback={handleFeedback}
              />
            ))}

            {/* Flagged items — shown only when toggle is on, so user can review/undo */}
            {showFlagged && flaggedItems.length > 0 && (
              <>
                {filtered.length > 0 && (
                  <div
                    className="flex items-center gap-2 py-2"
                    style={{ borderTop: '1px dashed var(--border-subtle)' }}
                  >
                    <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                      Flagged — click ⋯ to remove flag
                    </span>
                  </div>
                )}
                {flaggedItems.map((item) => (
                  <BriefingRow
                    key={item.id}
                    item={item}
                    enrichment={enrichMap.get(item.id) ?? null}
                    feedback={feedbackMap.get(item.id) ?? null}
                    onFeedback={handleFeedback}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
