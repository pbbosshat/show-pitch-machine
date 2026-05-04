'use client';
// AvailableClient — search + status filter + sortable, resizable, column-selectable table
// for the marketing available-titles catalog.
// Receives titles as a prop (server-fetched) and filters/sorts in-memory.
// All UI state (sort, column visibility, widths, status filter) is persisted to localStorage.

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';

export interface AvailableTitle {
  id: string;
  title: string;
  rights_type: string;
  genre: string;
  seasons: number;
  episode_count: number;
  is_active: number;
}

// Column definition type — drives header rendering, resize, visibility, and cell mapping.
interface ColDef { key: string; label: string; defaultWidth: number; hideable: boolean; defaultVisible: boolean; }

const COLUMN_DEFS: ColDef[] = [
  { key: 'title',         label: 'Title',       defaultWidth: 240, hideable: false, defaultVisible: true  },
  { key: 'rights_type',   label: 'Rights Type', defaultWidth: 140, hideable: true,  defaultVisible: true  },
  { key: 'genre',         label: 'Genre',       defaultWidth: 120, hideable: true,  defaultVisible: true  },
  { key: 'seasons',       label: 'Seasons',     defaultWidth: 80,  hideable: true,  defaultVisible: true  },
  { key: 'episode_count', label: 'Episodes',    defaultWidth: 90,  hideable: true,  defaultVisible: true  },
  { key: 'is_active',     label: 'Status',      defaultWidth: 100, hideable: true,  defaultVisible: true  },
  { key: 'edit',          label: '',            defaultWidth: 60,  hideable: false, defaultVisible: true  },
];

// Status filter union — 'all' is the unfiltered state.
type StatusFilter = 'all' | 'active' | 'inactive';

// Helpers to build initial state from COLUMN_DEFS defaults.
function buildDefaultVisibleCols() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultVisible])); }
function buildDefaultWidths() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultWidth])); }

export default function AvailableClient({ titles }: { titles: AvailableTitle[] }) {
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sort state, column visibility, column widths, column selector open/closed.
  const [sort, setSort]                       = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });
  const [visibleCols, setVisibleCols]         = useState<Record<string, boolean>>(buildDefaultVisibleCols());
  const [colWidths, setColWidths]             = useState<Record<string, number>>(buildDefaultWidths());
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // Rehydrate all persisted state from localStorage on mount.
  useEffect(() => {
    try { const s = localStorage.getItem('available-sort');   if (s) { const p = JSON.parse(s); if (p?.col !== undefined) setSort(p); } }    catch { /* ignore */ }
    try { const c = localStorage.getItem('available-cols');   if (c) { const p = JSON.parse(c); if (p) setVisibleCols(p); } }               catch { /* ignore */ }
    try { const w = localStorage.getItem('available-widths'); if (w) { const p = JSON.parse(w); if (p) setColWidths(p); } }                 catch { /* ignore */ }
    try { const f = localStorage.getItem('available-filter'); if (f) { const p = JSON.parse(f); if (p?.status) setStatusFilter(p.status); } } catch { /* ignore */ }
  }, []);

  // Persist state changes to localStorage.
  useEffect(() => { localStorage.setItem('available-sort',   JSON.stringify(sort)); },       [sort]);
  useEffect(() => { localStorage.setItem('available-cols',   JSON.stringify(visibleCols)); }, [visibleCols]);
  useEffect(() => { localStorage.setItem('available-widths', JSON.stringify(colWidths)); },  [colWidths]);
  useEffect(() => { localStorage.setItem('available-filter', JSON.stringify({ status: statusFilter })); }, [statusFilter]);

  // Close column selector when clicking outside it.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) setColSelectorOpen(false);
    }
    if (colSelectorOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colSelectorOpen]);

  // Filter by status + search query across title, rights_type, and genre.
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return titles.filter((t) => {
      if (statusFilter === 'active' && !t.is_active) return false;
      if (statusFilter === 'inactive' && t.is_active) return false;
      if (!q) return true;
      return [t.title, t.rights_type, t.genre].some(v => v?.toLowerCase().includes(q));
    });
  }, [titles, search, statusFilter]);

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
      {/* Controls bar: search + status chips + count + column selector + add button */}
      <div className="flex items-center gap-3">
        <div style={{ flex: 1, maxWidth: 320 }}>
          <Input placeholder="Search titles, rights type, genre…" value={search} onChange={setSearch} />
        </div>

        {/* Status filter chips */}
        {(['all', 'active', 'inactive'] as StatusFilter[]).map((val) => (
          <button
            key={val}
            onClick={() => setStatusFilter(prev => prev === val ? 'all' : val)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border capitalize"
            style={{
              background: statusFilter === val ? 'var(--accent)' : 'transparent',
              color: statusFilter === val ? '#fff' : 'var(--text-secondary)',
              borderColor: statusFilter === val ? 'var(--accent)' : 'var(--border-subtle)',
              transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            }}
          >
            {val === 'all' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1)}
          </button>
        ))}

        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {sorted.length} of {titles.length}
        </span>

        {/* Column visibility selector */}
        <div style={{ position: 'relative' }} ref={colSelectorRef}>
          <button
            onClick={() => setColSelectorOpen(p => !p)}
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
              {COLUMN_DEFS.filter(c => c.hideable).map(col => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-surface-alt)]"
                  style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols[col.key] !== false}
                    onChange={(e) => setVisibleCols(prev => ({ ...prev, [col.key]: e.target.checked }))}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/marketing/available/new"
          className="px-4 py-2 rounded text-sm font-medium text-white"
          style={{ background: 'var(--accent)', textDecoration: 'none' }}
        >
          + Add Title
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No titles match your filters.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          {/* Column headers with sort icons and resize handles */}
          <div
            className="grid text-xs font-semibold tracking-widest uppercase"
            style={{
              gridTemplateColumns: gridCols,
              color: 'var(--text-muted)',
              background: 'var(--bg-surface-alt)',
              borderBottom: '1px solid var(--border-strong)',
            }}
          >
            {visibleDefs.map((col) => (
              col.key === 'edit' ? (
                // Edit column has no sort or resize — just a spacer
                <div key="edit" style={{ padding: '10px 16px' }} />
              ) : (
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
              )
            ))}
          </div>

          {/* Data rows */}
          {sorted.map((t) => (
            <div
              key={t.id}
              className="grid items-center hover:bg-[var(--bg-surface-alt)]"
              style={{
                gridTemplateColumns: gridCols,
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'background var(--motion-base) var(--ease)',
              }}
            >
              {/* Render only visible columns, switching on col.key to preserve per-cell render logic */}
              {visibleDefs.map((col) => {
                if (col.key === 'title') return (
                  <div key="title" style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                );
                if (col.key === 'rights_type') return (
                  <div key="rights_type" style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {t.rights_type || '—'}
                  </div>
                );
                if (col.key === 'genre') return (
                  <div key="genre" style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {t.genre || '—'}
                  </div>
                );
                if (col.key === 'seasons') return (
                  <div key="seasons" style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.seasons ?? '—'}
                  </div>
                );
                if (col.key === 'episode_count') return (
                  <div key="episode_count" style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {t.episode_count ?? '—'}
                  </div>
                );
                if (col.key === 'is_active') return (
                  <div key="is_active" style={{ padding: '14px 16px' }}>
                    <Badge variant={t.is_active ? 'greenlit' : 'pass'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                );
                if (col.key === 'edit') return (
                  <div key="edit" style={{ padding: '14px 16px' }}>
                    <Link href={`/marketing/available/${t.id}`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                      Edit
                    </Link>
                  </div>
                );
                return null;
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
