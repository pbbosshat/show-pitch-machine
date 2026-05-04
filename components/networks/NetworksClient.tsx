'use client';
// NetworksClient — search + tier filter + sortable, resizable, column-selectable table
// with expand/collapse department grouping. Parent rows aggregate their children's counts
// when collapsed; expanding shows per-department rows indented below the parent.
//
// Hierarchy rules (from migration 019 + seed-company-hierarchy):
//   parent_id IS NULL + child_count > 0  →  parent row (expandable)
//   parent_id IS NULL + child_count = 0  →  standalone row
//   parent_id IS NOT NULL                →  department row (shown only when parent expanded)

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, Columns, Unlink, FolderInput, Search, X } from 'lucide-react';
import type { NetworkListItem } from '@/app/api/networks/route';

export type { NetworkListItem };

// ─── Relative time helper ─────────────────────────────────────────────────────

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
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─── Aggregate counts from parent + children into one summary object ──────────

interface AggregateCounts {
  contact_count: number;
  deal_count: number;
  order_count: number;
  active_pitches: number;
  last_touch_date: number | null;
}

function aggregate(rows: NetworkListItem[]): AggregateCounts {
  return rows.reduce<AggregateCounts>(
    (acc, n) => ({
      contact_count: acc.contact_count + n.contact_count,
      deal_count:    acc.deal_count    + n.deal_count,
      order_count:   acc.order_count   + n.order_count,
      active_pitches: acc.active_pitches + n.active_pitches,
      last_touch_date: acc.last_touch_date == null
        ? n.last_touch_date
        : n.last_touch_date == null
          ? acc.last_touch_date
          : Math.max(acc.last_touch_date, n.last_touch_date),
    }),
    { contact_count: 0, deal_count: 0, order_count: 0, active_pitches: 0, last_touch_date: null }
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef { key: string; label: string; defaultWidth: number; hideable: boolean; defaultVisible: boolean; }

const COLUMN_DEFS: ColDef[] = [
  { key: 'name',           label: 'Name',       defaultWidth: 240, hideable: false, defaultVisible: true  },
  { key: 'type',           label: 'Type',       defaultWidth: 120, hideable: true,  defaultVisible: true  },
  { key: 'tier',           label: 'Tier',       defaultWidth: 65,  hideable: true,  defaultVisible: true  },
  { key: 'hq_city',        label: 'HQ',         defaultWidth: 130, hideable: true,  defaultVisible: true  },
  { key: 'contact_count',  label: 'Contacts',   defaultWidth: 80,  hideable: true,  defaultVisible: true  },
  { key: 'deal_count',     label: 'Deals',      defaultWidth: 70,  hideable: true,  defaultVisible: true  },
  { key: 'order_count',    label: 'Orders',     defaultWidth: 70,  hideable: true,  defaultVisible: true  },
  { key: 'last_touch_date', label: 'Last Touch', defaultWidth: 110, hideable: true,  defaultVisible: true  },
  { key: 'active_pitches',  label: 'Active',     defaultWidth: 75,  hideable: true,  defaultVisible: true  },
];

type TierFilter = 'all' | 'A' | 'B' | 'C';

function buildDefaultVisibleCols() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultVisible])); }
function buildDefaultWidths()      { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultWidth])); }

// ─── Display row types ────────────────────────────────────────────────────────
// The flat display list is built from the tree and fed to the renderer.

type DisplayRow =
  | { kind: 'parent';     network: NetworkListItem; children: NetworkListItem[]; expanded: boolean; agg: AggregateCounts }
  | { kind: 'child';      network: NetworkListItem }
  | { kind: 'standalone'; network: NetworkListItem };

// ─── Component ────────────────────────────────────────────────────────────────

interface NetworksClientProps { initialNetworks: NetworkListItem[] }

export default function NetworksClient({ initialNetworks }: NetworksClientProps) {
  const router = useRouter();

  const [search,          setSearch]          = useState('');
  const [tierFilter,      setTierFilter]      = useState<TierFilter>('all');
  const [sort,            setSort]            = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });
  const [visibleCols,     setVisibleCols]     = useState<Record<string, boolean>>(buildDefaultVisibleCols());
  const [colWidths,       setColWidths]       = useState<Record<string, number>>(buildDefaultWidths());
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Department management state
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [pickerFor,      setPickerFor]      = useState<string | null>(null); // id of standalone being assigned
  const [pickerSearch,   setPickerSearch]   = useState('');
  const [mutatingId,     setMutatingId]     = useState<string | null>(null);

  const colSelectorRef = useRef<HTMLDivElement>(null);

  // ─── Department management mutations ───────────────────────────────────────

  async function detach(id: string) {
    setMutatingId(id);
    try {
      const res = await fetch(`/api/networks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: null }) });
      if (!res.ok) { const d = await res.json(); console.error('Detach failed:', d.error); return; }
      router.refresh();
    } finally { setMutatingId(null); }
  }

  async function assignToParent(childId: string, parentId: string) {
    setMutatingId(childId);
    try {
      const res = await fetch(`/api/networks/${childId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: parentId }) });
      if (!res.ok) { const d = await res.json(); console.error('Assign failed:', d.error); return; }
      setPickerFor(null);
      setPickerSearch('');
      router.refresh();
    } finally { setMutatingId(null); }
  }

  // Potential parent targets for the picker: any top-level company except the one being assigned
  const pickerTargets = useMemo(() => {
    if (!pickerFor) return [];
    return initialNetworks
      .filter(n => !n.parent_id && n.id !== pickerFor)
      .sort((a, b) => {
        // Parents with children first, then alphabetical
        if (b.child_count !== a.child_count) return b.child_count - a.child_count;
        return a.name.localeCompare(b.name);
      });
  }, [initialNetworks, pickerFor]);

  const filteredPickerTargets = useMemo(() => {
    if (!pickerSearch.trim()) return pickerTargets;
    const q = pickerSearch.toLowerCase();
    return pickerTargets.filter(n => n.name.toLowerCase().includes(q));
  }, [pickerTargets, pickerSearch]);

  // ─── Rehydrate persisted state
  useEffect(() => {
    try { const s = localStorage.getItem('networks-sort');     if (s) { const p = JSON.parse(s); if (p?.col !== undefined) setSort(p); } }         catch { /**/ }
    try { const c = localStorage.getItem('networks-cols');     if (c) { const p = JSON.parse(c); if (p) setVisibleCols(p); } }                     catch { /**/ }
    try { const w = localStorage.getItem('networks-widths');   if (w) { const p = JSON.parse(w); if (p) setColWidths(p); } }                       catch { /**/ }
    try { const f = localStorage.getItem('networks-filter');   if (f) { const p = JSON.parse(f); if (p?.tier) setTierFilter(p.tier); } }           catch { /**/ }
    try { const e = localStorage.getItem('networks-expanded'); if (e) { const p = JSON.parse(e); if (Array.isArray(p)) setExpandedParents(new Set(p)); } } catch { /**/ }
  }, []);

  useEffect(() => { localStorage.setItem('networks-sort',     JSON.stringify(sort)); },            [sort]);
  useEffect(() => { localStorage.setItem('networks-cols',     JSON.stringify(visibleCols)); },     [visibleCols]);
  useEffect(() => { localStorage.setItem('networks-widths',   JSON.stringify(colWidths)); },       [colWidths]);
  useEffect(() => { localStorage.setItem('networks-filter',   JSON.stringify({ tier: tierFilter })); }, [tierFilter]);
  useEffect(() => { localStorage.setItem('networks-expanded', JSON.stringify([...expandedParents])); }, [expandedParents]);

  // Close column selector on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) setColSelectorOpen(false);
    }
    if (colSelectorOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colSelectorOpen]);

  // Build tree: index by id, map children under each parent
  const { byId, childrenOf } = useMemo(() => {
    const byId = new Map(initialNetworks.map(n => [n.id, n]));
    const childrenOf = new Map<string, NetworkListItem[]>();
    for (const n of initialNetworks) {
      if (!n.parent_id) continue;
      const arr = childrenOf.get(n.parent_id) ?? [];
      arr.push(n);
      childrenOf.set(n.parent_id, arr);
    }
    return { byId, childrenOf };
  }, [initialNetworks]);

  function toggleParent(id: string) {
    setExpandedParents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Match function for a single network row
  function matches(n: NetworkListItem, q: string): boolean {
    if (tierFilter !== 'all' && n.tier !== tierFilter) return false;
    if (!q) return true;
    return (
      n.name.toLowerCase().includes(q) ||
      (n.type ?? '').toLowerCase().includes(q) ||
      (n.hq_city ?? '').toLowerCase().includes(q)
    );
  }

  // Build the flat display list from the tree
  const displayRows = useMemo((): DisplayRow[] => {
    const q = search.toLowerCase().trim();

    // Top-level = no parent
    let topLevel = initialNetworks.filter(n => !n.parent_id);

    // Sort top-level rows
    if (sort.col) {
      topLevel = [...topLevel].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sort.col!];
        const bv = (b as unknown as Record<string, unknown>)[sort.col!];
        if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }

    const rows: DisplayRow[] = [];

    for (const n of topLevel) {
      const children = childrenOf.get(n.id) ?? [];

      if (children.length === 0) {
        // Standalone row
        if (matches(n, q)) rows.push({ kind: 'standalone', network: n });
        continue;
      }

      // Parent row — determine which children match the current filter
      const matchingChildren = children.filter(c => matches(c, q));
      const parentMatches    = matches(n, q);

      if (!parentMatches && matchingChildren.length === 0) continue;

      // Auto-expand when search narrows to specific children
      const isExpanded = expandedParents.has(n.id) || (q !== '' && matchingChildren.length > 0 && matchingChildren.length < children.length);

      // When collapsed, aggregate across all children (not just matching ones)
      const agg = aggregate([n, ...children]);

      rows.push({ kind: 'parent', network: n, children, expanded: isExpanded, agg });

      if (isExpanded) {
        // Show only matching children when a search is active, all when not
        const childrenToShow = q ? matchingChildren : [...children].sort((a, b) => a.name.localeCompare(b.name));
        for (const child of childrenToShow) {
          rows.push({ kind: 'child', network: child });
        }
      }
    }

    return rows;
  }, [initialNetworks, childrenOf, search, tierFilter, sort, expandedParents]);

  // Count for the status line — top-level visible rows (parents + standalones)
  const topLevelTotal   = useMemo(() => initialNetworks.filter(n => !n.parent_id).length, [initialNetworks]);
  const topLevelVisible = displayRows.filter(r => r.kind !== 'child').length;

  // Sort click
  function handleSortClick(col: string) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  }

  // Column resize
  function startResize(e: React.MouseEvent, colKey: string) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] ?? (COLUMN_DEFS.find(c => c.key === colKey)?.defaultWidth ?? 100);
    function onMove(ev: MouseEvent) { setColWidths(p => ({ ...p, [colKey]: Math.max(40, startW + ev.clientX - startX) })); }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const visibleDefs = COLUMN_DEFS.filter(c => visibleCols[c.key] !== false);
  const gridCols    = visibleDefs.map(c => `${colWidths[c.key] ?? c.defaultWidth}px`).join(' ');

  // ─── Cell renderers ─────────────────────────────────────────────────────────

  function renderCell(col: ColDef, n: NetworkListItem, counts: Partial<AggregateCounts> = {}, isParent = false, isChild = false) {
    const contact_count  = counts.contact_count  ?? n.contact_count;
    const deal_count     = counts.deal_count     ?? n.deal_count;
    const order_count    = counts.order_count    ?? n.order_count;
    const active_pitches = counts.active_pitches ?? n.active_pitches;
    const last_touch     = counts.last_touch_date !== undefined ? counts.last_touch_date : n.last_touch_date;

    const pad: React.CSSProperties = { padding: isChild ? '10px 16px 10px 36px' : '12px 16px' };

    if (col.key === 'name') return (
      <span key="name" style={{ ...pad, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {isChild && (
          <span style={{ color: 'var(--border-strong)', flexShrink: 0, fontSize: 10, marginRight: 2 }}>└</span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Link
            href={`/market/networks/${n.id}`}
            className="text-sm font-medium"
            style={{ color: isParent ? 'var(--text-primary)' : 'var(--accent)', textDecoration: 'none' }}
          >
            {n.name}
          </Link>
        </span>
        {isParent && n.child_count > 0 && (
          <span
            className="text-[10px] font-medium rounded-full px-1.5 py-0.5 tabular-nums flex-shrink-0"
            style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', lineHeight: 1.4 }}
          >
            {n.child_count}
          </span>
        )}
      </span>
    );

    if (col.key === 'type') return (
      <span key="type" style={pad}>
        {n.type ? (
          <span className="px-2 py-0.5 text-xs rounded-md font-medium" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            {n.type}
          </span>
        ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
      </span>
    );

    if (col.key === 'tier') return (
      <span key="tier" className="text-sm font-bold" style={{ ...pad, color: n.tier === 'A' ? 'var(--accent)' : n.tier === 'B' ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
        {n.tier ?? '—'}
      </span>
    );

    if (col.key === 'hq_city') return (
      <span key="hq_city" className="text-sm" style={{ ...pad, color: 'var(--text-secondary)' }}>
        {n.hq_city ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </span>
    );

    if (col.key === 'contact_count') return (
      <span key="contact_count" className="text-sm tabular-nums" style={{ ...pad, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
        {contact_count}
      </span>
    );

    if (col.key === 'deal_count') return (
      <span key="deal_count" className="text-sm tabular-nums" style={{ ...pad, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
        {deal_count}
      </span>
    );

    if (col.key === 'order_count') return (
      <span key="order_count" className="text-sm tabular-nums" style={{ ...pad, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
        {order_count}
      </span>
    );

    if (col.key === 'last_touch_date') return (
      <span key="last_touch_date" className="text-xs" style={{ ...pad, color: 'var(--text-muted)' }}>
        {relativeTime(last_touch)}
      </span>
    );

    if (col.key === 'active_pitches') return (
      <span key="active_pitches" className="text-sm tabular-nums" style={{ ...pad, fontFamily: "'JetBrains Mono', monospace", color: active_pitches > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
        {active_pitches > 0 ? active_pitches : '—'}
      </span>
    );

    return null;
  }

  // ─── Row renderers ──────────────────────────────────────────────────────────

  function renderParentRow(row: Extract<DisplayRow, { kind: 'parent' }>) {
    const { network: n, agg, expanded } = row;
    return (
      <div
        key={n.id}
        className="grid items-center border-b border-[var(--border-subtle)]"
        style={{
          gridTemplateColumns: gridCols,
          background: 'var(--bg-surface-alt)',
          position: 'relative',
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', opacity: 0.5 }} />

        {visibleDefs.map((col) => {
          if (col.key === 'name') return (
            <span key="name" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              {/* Expand toggle */}
              <button
                onClick={() => toggleParent(n.id)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', transition: 'transform 150ms ease' }}
                title={expanded ? 'Collapse departments' : 'Expand departments'}
              >
                <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease', color: 'var(--accent)' }} />
              </button>

              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <Link
                  href={`/market/networks/${n.id}`}
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                >
                  {n.name}
                </Link>
              </span>

              {/* Department count badge */}
              <span
                className="text-[10px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0"
                style={{ background: expanded ? 'var(--accent)' : 'var(--bg-surface)', border: `1px solid ${expanded ? 'var(--accent)' : 'var(--border-subtle)'}`, color: expanded ? '#fff' : 'var(--text-muted)', lineHeight: 1.4 }}
              >
                {n.child_count} {n.child_count === 1 ? 'dept' : 'depts'}
              </span>
            </span>
          );

          // Collapsed: show aggregate; expanded: show own counts
          const counts = expanded ? {} : agg;
          return renderCell(col, n, counts, true, false);
        })}
      </div>
    );
  }

  function renderChildRow(row: Extract<DisplayRow, { kind: 'child' }>) {
    const { network: n } = row;
    const isHovered  = hoveredId === n.id;
    const isMutating = mutatingId === n.id;
    return (
      <div
        key={n.id}
        className="grid items-center border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-alt)]"
        style={{ gridTemplateColumns: gridCols, background: 'var(--bg-surface)', transition: 'background var(--motion-base) var(--ease)', position: 'relative' }}
        onMouseEnter={() => setHoveredId(n.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {visibleDefs.map(col => renderCell(col, n, {}, false, true))}

        {/* Detach action — visible on hover */}
        {isHovered && !isMutating && (
          <button
            onClick={() => detach(n.id)}
            title="Make standalone (detach from company)"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            <Unlink size={11} /> Make standalone
          </button>
        )}
        {isMutating && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>
            Saving…
          </span>
        )}
      </div>
    );
  }

  function renderStandaloneRow(row: Extract<DisplayRow, { kind: 'standalone' }>) {
    const { network: n } = row;
    const isHovered  = hoveredId === n.id;
    const isMutating = mutatingId === n.id;
    return (
      <div
        key={n.id}
        className="grid items-center border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface-alt)]"
        style={{ gridTemplateColumns: gridCols, transition: 'background var(--motion-base) var(--ease)', position: 'relative' }}
        onMouseEnter={() => setHoveredId(n.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {visibleDefs.map(col => renderCell(col, n, {}, false, false))}

        {/* Assign-to-company action — visible on hover */}
        {isHovered && !isMutating && (
          <button
            onClick={() => { setPickerFor(n.id); setPickerSearch(''); }}
            title="Add as department of a company"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            <FolderInput size={11} /> Add to company
          </button>
        )}
        {isMutating && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>
            Saving…
          </span>
        )}
      </div>
    );
  }

  // ─── Company picker modal ───────────────────────────────────────────────────

  const pickerNetwork = pickerFor ? initialNetworks.find(n => n.id === pickerFor) : null;

  function CompanyPicker() {
    if (!pickerFor || !pickerNetwork) return null;
    return (
      <>
        {/* Backdrop */}
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50 }}
          onClick={() => { setPickerFor(null); setPickerSearch(''); }}
        />

        {/* Modal */}
        <div
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 51, width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' }}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Add as department
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Move <span style={{ color: 'var(--accent)' }}>{pickerNetwork.name}</span> under a company
              </div>
            </div>
            <button
              onClick={() => { setPickerFor(null); setPickerSearch(''); }}
              style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              autoFocus
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              placeholder="Search companies…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)' }}
            />
          </div>

          {/* Company list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredPickerTargets.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No companies match</div>
            ) : (
              filteredPickerTargets.map(target => (
                <button
                  key={target.id}
                  onClick={() => assignToParent(pickerFor, target.id)}
                  disabled={mutatingId === pickerFor}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-alt)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{target.name}</div>
                    {target.child_count > 0 && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 1 }}>{target.child_count} existing department{target.child_count !== 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    {target.type ?? '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input placeholder="Search networks, type, city…" value={search} onChange={setSearch} />
        </div>

        {(['all', 'A', 'B', 'C'] as TierFilter[]).map((val) => (
          <button
            key={val}
            onClick={() => setTierFilter(prev => prev === val ? 'all' : val)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border"
            style={{
              background:   tierFilter === val ? 'var(--accent)' : 'transparent',
              color:        tierFilter === val ? '#fff' : 'var(--text-secondary)',
              borderColor:  tierFilter === val ? 'var(--accent)' : 'var(--border-subtle)',
              transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            }}
          >
            {val === 'all' ? 'All Tiers' : `Tier ${val}`}
          </button>
        ))}

        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {topLevelVisible} of {topLevelTotal}
        </span>

        {/* Column selector */}
        <div style={{ position: 'relative' }} ref={colSelectorRef}>
          <button
            onClick={() => setColSelectorOpen(prev => !prev)}
            title="Toggle columns"
            className="flex items-center justify-center rounded-md border"
            style={{ width: 36, height: 36, background: colSelectorOpen ? 'var(--bg-surface-alt)' : 'transparent', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <Columns size={18} />
          </button>
          {colSelectorOpen && (
            <div className="absolute right-0 z-30 rounded-lg border border-[var(--border-subtle)] shadow-xl" style={{ top: 'calc(100% + 6px)', minWidth: 200, background: 'var(--bg-elevated)', padding: '8px 0' }}>
              <div className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Columns</div>
              {COLUMN_DEFS.filter(c => c.hideable).map((col) => (
                <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-surface-alt)]" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={visibleCols[col.key] !== false} onChange={(e) => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        {/* Column headers */}
        <div
          className="grid text-xs font-semibold tracking-wider uppercase border-b border-[var(--border-subtle)]"
          style={{ gridTemplateColumns: gridCols, color: 'var(--text-muted)', background: 'var(--bg-surface-alt)' }}
        >
          {visibleDefs.map((col) => (
            <div
              key={col.key}
              onClick={() => handleSortClick(col.key)}
              style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, position: 'relative', overflow: 'hidden' }}
            >
              {col.label}
              {sort.col === col.key
                ? sort.dir === 'asc'
                  ? <ChevronUp   size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  : <ChevronDown size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                : <ChevronsUpDown size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
              }
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

        {/* Rows */}
        {displayRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No networks match your search
          </div>
        ) : (
          displayRows.map((row) => {
            if (row.kind === 'parent')     return renderParentRow(row);
            if (row.kind === 'child')      return renderChildRow(row);
            return renderStandaloneRow(row);
          })
        )}
      </div>

      {/* Company picker modal — rendered outside the table to avoid overflow clipping */}
      <CompanyPicker />
    </div>
  );
}
