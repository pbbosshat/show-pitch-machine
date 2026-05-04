'use client';
// NetworksClient — search + tier filter + sortable, resizable, column-selectable table for the networks directory.
// Receives all networks as a prop (already fetched server-side) and filters/sorts in-memory.
// All UI state (sort, column visibility, widths, tier filter) is persisted to localStorage.
//
// Extended in migration 017 enrichment pass: last_touch_date and active_pitches columns
// surface MYE activity against each network.

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';

// Mirrors the shape returned by GET /api/networks — kept local to avoid
// re-exporting a type that only lives in the API route's private scope.
export interface NetworkListItem {
  id: string;
  name: string;
  type: string | null;
  tier: string | null;
  hq_city: string | null;
  notes: string | null;
  contact_count: number;
  deal_count: number;
  order_count: number;
  // Enrichment fields from migration 017 — null/0 until pipeline runs
  last_touch_date: number | null;
  active_pitches: number;
}

// ─── relativeTime helper ──────────────────────────────────────────────────────
// Converts a unix-ms timestamp to a compact relative string: "3d ago", "2w ago",
// "1m ago", "1y ago". Returns "—" for null/zero. Kept local to avoid a shared
// util dependency — identical copy exists in BuyersClient.
function relativeTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const diffMs = Date.now() - ts;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1)  return 'today';
  if (diffDays < 7)  return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}m ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

interface NetworksClientProps {
  initialNetworks: NetworkListItem[];
}

// Column definition type — drives header rendering, resize, visibility, and cell mapping.
interface ColDef { key: string; label: string; defaultWidth: number; hideable: boolean; defaultVisible: boolean; }

const COLUMN_DEFS: ColDef[] = [
  { key: 'name',           label: 'Name',       defaultWidth: 220, hideable: false, defaultVisible: true  },
  { key: 'type',           label: 'Type',       defaultWidth: 120, hideable: true,  defaultVisible: true  },
  { key: 'tier',           label: 'Tier',       defaultWidth: 65,  hideable: true,  defaultVisible: true  },
  { key: 'hq_city',        label: 'HQ',         defaultWidth: 130, hideable: true,  defaultVisible: true  },
  { key: 'contact_count',  label: 'Contacts',   defaultWidth: 80,  hideable: true,  defaultVisible: true  },
  { key: 'deal_count',     label: 'Deals',      defaultWidth: 70,  hideable: true,  defaultVisible: true  },
  { key: 'order_count',    label: 'Orders',     defaultWidth: 70,  hideable: true,  defaultVisible: true  },
  // Enrichment columns from migration 017 — shown when enrichment has run
  { key: 'last_touch_date', label: 'Last Touch', defaultWidth: 110, hideable: true,  defaultVisible: true  },
  { key: 'active_pitches',  label: 'Active',     defaultWidth: 75,  hideable: true,  defaultVisible: true  },
];

// Tier filter union type — 'all' is the unfiltered state.
type TierFilter = 'all' | 'A' | 'B' | 'C';

// Helpers to build initial state from COLUMN_DEFS defaults.
function buildDefaultVisibleCols() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultVisible])); }
function buildDefaultWidths() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultWidth])); }

export default function NetworksClient({ initialNetworks }: NetworksClientProps) {
  const [search, setSearch] = useState('');

  // Tier filter, sort state, column visibility, column widths, column selector open/closed.
  const [tierFilter, setTierFilter]           = useState<TierFilter>('all');
  const [sort, setSort]                       = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });
  const [visibleCols, setVisibleCols]         = useState<Record<string, boolean>>(buildDefaultVisibleCols());
  const [colWidths, setColWidths]             = useState<Record<string, number>>(buildDefaultWidths());
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // Rehydrate all persisted state from localStorage on mount.
  useEffect(() => {
    try { const s = localStorage.getItem('networks-sort');   if (s) { const p = JSON.parse(s); if (p?.col !== undefined) setSort(p); } }    catch { /* ignore */ }
    try { const c = localStorage.getItem('networks-cols');   if (c) { const p = JSON.parse(c); if (p) setVisibleCols(p); } }               catch { /* ignore */ }
    try { const w = localStorage.getItem('networks-widths'); if (w) { const p = JSON.parse(w); if (p) setColWidths(p); } }                 catch { /* ignore */ }
    try { const f = localStorage.getItem('networks-filter'); if (f) { const p = JSON.parse(f); if (p?.tier) setTierFilter(p.tier); } }     catch { /* ignore */ }
  }, []);

  // Persist state changes to localStorage.
  useEffect(() => { localStorage.setItem('networks-sort',   JSON.stringify(sort)); },       [sort]);
  useEffect(() => { localStorage.setItem('networks-cols',   JSON.stringify(visibleCols)); }, [visibleCols]);
  useEffect(() => { localStorage.setItem('networks-widths', JSON.stringify(colWidths)); },  [colWidths]);
  useEffect(() => { localStorage.setItem('networks-filter', JSON.stringify({ tier: tierFilter })); }, [tierFilter]);

  // Close column selector when clicking outside it.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) setColSelectorOpen(false);
    }
    if (colSelectorOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colSelectorOpen]);

  // Filter by tier + search query across name, type, and city.
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialNetworks.filter((n) => {
      if (tierFilter !== 'all' && n.tier !== tierFilter) return false;
      if (!q) return true;
      return n.name.toLowerCase().includes(q) || (n.type ?? '').toLowerCase().includes(q) || (n.hq_city ?? '').toLowerCase().includes(q);
    });
  }, [initialNetworks, search, tierFilter]);

  // Apply column sort on top of the filtered results.
  const sorted = useMemo(() => {
    if (!sort.col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.col!];
      const bv = (b as Record<string, unknown>)[sort.col!];
      if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  // Toggle sort direction or set a new sort column.
  function handleSortClick(col: string) {
    setSort((prev) => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  }

  // Drag-to-resize: capture startX and startWidth, then track mousemove until mouseup.
  function startResize(e: React.MouseEvent, colKey: string) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] ?? (COLUMN_DEFS.find(c => c.key === colKey)?.defaultWidth ?? 100);
    function onMove(ev: MouseEvent) {
      setColWidths((prev) => ({ ...prev, [colKey]: Math.max(40, startW + ev.clientX - startX) }));
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Only render columns that are currently visible.
  const visibleDefs = COLUMN_DEFS.filter(c => visibleCols[c.key] !== false);
  const gridCols = visibleDefs.map(c => `${colWidths[c.key] ?? c.defaultWidth}px`).join(' ');

  return (
    <div className="space-y-4">
      {/* Controls bar: search + tier chips + count + column selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input
            placeholder="Search networks, type, city…"
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Tier filter chips */}
        {(['all', 'A', 'B', 'C'] as TierFilter[]).map((val) => (
          <button
            key={val}
            onClick={() => setTierFilter(prev => prev === val ? 'all' : val)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border"
            style={{
              background: tierFilter === val ? 'var(--accent)' : 'transparent',
              color: tierFilter === val ? '#fff' : 'var(--text-secondary)',
              borderColor: tierFilter === val ? 'var(--accent)' : 'var(--border-subtle)',
              transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            }}
          >
            {val === 'all' ? 'All Tiers' : `Tier ${val}`}
          </button>
        ))}

        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {sorted.length} of {initialNetworks.length}
        </span>

        {/* Column visibility selector */}
        <div style={{ position: 'relative' }} ref={colSelectorRef}>
          <button
            onClick={() => setColSelectorOpen((prev) => !prev)}
            title="Toggle columns"
            className="flex items-center justify-center rounded-md border"
            style={{
              width: 36, height: 36,
              background: colSelectorOpen ? 'var(--bg-surface-alt)' : 'transparent',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Columns size={18} />
          </button>
          {colSelectorOpen && (
            <div
              className="absolute right-0 z-30 rounded-lg border border-[var(--border-subtle)] shadow-xl"
              style={{ top: 'calc(100% + 6px)', minWidth: 200, background: 'var(--bg-elevated)', padding: '8px 0' }}
            >
              <div className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Columns</div>
              {COLUMN_DEFS.filter((c) => c.hideable).map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-surface-alt)]"
                  style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols[col.key] !== false}
                    onChange={(e) => setVisibleCols((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Column headers with sort icons and resize handles */}
        <div
          className="grid text-xs font-semibold tracking-wider uppercase border-b border-[var(--border-subtle)]"
          style={{
            gridTemplateColumns: gridCols,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface-alt)',
          }}
        >
          {visibleDefs.map((col) => (
            <div
              key={col.key}
              onClick={() => handleSortClick(col.key)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {col.label}
              {sort.col === col.key
                ? sort.dir === 'asc'
                  ? <ChevronUp size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  : <ChevronDown size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                : <ChevronsUpDown size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
              }
              {/* Drag handle — stops click propagation so it doesn't trigger sort */}
              <div
                onMouseDown={(e) => startResize(e, col.key)}
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', background: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--border-strong)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              />
            </div>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No networks match your search
          </div>
        ) : (
          sorted.map((n) => (
            <div
              key={n.id}
              className="grid items-center border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-alt)]"
              style={{
                gridTemplateColumns: gridCols,
                transition: 'background var(--motion-base) var(--ease)',
              }}
            >
              {/* Render only visible columns, switching on col.key to preserve per-cell logic */}
              {visibleDefs.map((col) => {
                if (col.key === 'name') return (
                  <span key="name" className="text-sm font-medium" style={{ padding: '12px 16px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Link href={`/market/networks/${n.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {n.name}
                    </Link>
                  </span>
                );
                if (col.key === 'type') return (
                  <span key="type" style={{ padding: '12px 16px' }}>
                    {n.type ? (
                      <span
                        className="px-2 py-0.5 text-xs rounded-md font-medium"
                        style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                      >
                        {n.type}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </span>
                );
                if (col.key === 'tier') return (
                  <span
                    key="tier"
                    className="text-sm font-bold"
                    style={{
                      padding: '12px 16px',
                      color: n.tier === 'A' ? 'var(--accent)' : n.tier === 'B' ? 'var(--text-secondary)' : 'var(--text-muted)',
                    }}
                  >
                    {n.tier ?? '—'}
                  </span>
                );
                if (col.key === 'hq_city') return (
                  <span key="hq_city" className="text-sm" style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {n.hq_city ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </span>
                );
                if (col.key === 'contact_count') return (
                  <span key="contact_count" className="text-sm tabular-nums" style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                    {n.contact_count}
                  </span>
                );
                if (col.key === 'deal_count') return (
                  <span key="deal_count" className="text-sm tabular-nums" style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                    {n.deal_count}
                  </span>
                );
                if (col.key === 'order_count') return (
                  <span key="order_count" className="text-sm tabular-nums" style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                    {n.order_count}
                  </span>
                );
                // Last Touch — most recent buyer_contact_touches date for any contact at this network
                if (col.key === 'last_touch_date') return (
                  <span key="last_touch_date" className="text-xs" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {relativeTime(n.last_touch_date)}
                  </span>
                );
                // Active — count of packages targeting this network not yet passed/archived
                // Shows "—" for 0 so the column reads as "nothing active" rather than clutter
                if (col.key === 'active_pitches') return (
                  <span
                    key="active_pitches"
                    className="text-sm tabular-nums"
                    style={{
                      padding: '12px 16px',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: n.active_pitches > 0 ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    {n.active_pitches > 0 ? n.active_pitches : '—'}
                  </span>
                );
                return null;
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
