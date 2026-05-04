'use client';
// ShowDbClient — full-featured sortable, filterable, column-configurable table for the Show DB.
// Receives all shows as a prop (fetched server-side) and operates entirely in-memory.
// Star toggle calls PUT /api/shows/[id] inline. Pencil opens an edit modal for full field editing.
// Column visibility, sort, filter, and column widths are persisted to localStorage so the user's
// preferences survive page reloads without any server-side user preferences table.

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';
import { format } from 'date-fns';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import VimeoPlayerModal from '@/components/ui/VimeoPlayerModal';
import type { Show } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type AirFilter = 'all' | 'on_air' | 'available' | 'off_air';

interface SortState {
  col: string | null;
  dir: 'asc' | 'desc';
}

// All editable fields surfaced in the edit modal (subset of Show)
interface ShowFormState {
  title: string;
  network: string;
  air_status: 'on_air' | 'available' | 'off_air' | '';
  production_company: string;
  showrunner: string;
  schedule: string;
  total_seasons: string;   // string for controlled input, parsed to number on save
  genre: string;
  format: string;
  episode_count: string;   // string for controlled input
  season_number: string;   // string for controlled input
  is_our_show: number;     // 0 | 1
  notes: string;
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  key: string;          // matches Show property name (or special keys like 'edit')
  label: string;        // header display text
  width: string;        // CSS fr value or px — legacy, kept for fallback
  defaultWidth: number; // px width for resizable columns
  hideable: boolean;    // false = always visible, not shown in column selector
  defaultVisible: boolean;
}

// Ordered list of all data columns (excludes the always-on star and edit columns)
const COLUMN_DEFS: ColDef[] = [
  { key: 'title',              label: 'Title',       width: '2fr',   defaultWidth: 240, hideable: true, defaultVisible: true  },
  { key: 'network',            label: 'Network',     width: '1fr',   defaultWidth: 140, hideable: true, defaultVisible: true  },
  { key: 'production_company', label: 'Prod Co',     width: '1.5fr', defaultWidth: 180, hideable: true, defaultVisible: true  },
  { key: 'showrunner',         label: 'Showrunner',  width: '1.5fr', defaultWidth: 180, hideable: true, defaultVisible: true  },
  { key: 'schedule',           label: 'Schedule',    width: '1fr',   defaultWidth: 120, hideable: true, defaultVisible: true  },
  { key: 'total_seasons',      label: 'Seasons',     width: '70px',  defaultWidth: 70,  hideable: true, defaultVisible: true  },
  { key: 'genre',              label: 'Genre',       width: '1fr',   defaultWidth: 120, hideable: true, defaultVisible: true  },
  { key: 'air_status',         label: 'Status',      width: '100px', defaultWidth: 100, hideable: true, defaultVisible: true  },
  { key: 'episode_count',      label: 'Episodes',    width: '70px',  defaultWidth: 70,  hideable: true, defaultVisible: false },
  { key: 'season_number',      label: 'Season #',    width: '70px',  defaultWidth: 70,  hideable: true, defaultVisible: false },
  { key: 'format',             label: 'Format',      width: '1fr',   defaultWidth: 120, hideable: true, defaultVisible: false },
  { key: 'location_type',      label: 'Location',    width: '1fr',   defaultWidth: 120, hideable: true, defaultVisible: false },
  { key: 'premiere_date',      label: 'Premiere',    width: '100px', defaultWidth: 100, hideable: true, defaultVisible: false },
  { key: 'greenlit_date',      label: 'Greenlit',    width: '100px', defaultWidth: 100, hideable: true, defaultVisible: false },
  { key: 'source',             label: 'Source',      width: '1fr',   defaultWidth: 120, hideable: true, defaultVisible: false },
  // Sizzle reel play button — fetches on click, never pre-loads (avoids N+1 queries)
  { key: 'sizzle',             label: 'Sizzle',      width: '56px',  defaultWidth: 56,  hideable: true, defaultVisible: true  },
];

// Build initial visible-columns Record from COLUMN_DEFS defaults
function buildDefaultVisibleCols(): Record<string, boolean> {
  return Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c.defaultVisible]));
}

// Build initial column widths Record from COLUMN_DEFS defaultWidth values
function buildDefaultWidths(): Record<string, number> {
  return Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c.defaultWidth]));
}

// ─── Shared form element styles (mirrors BuyersClient exactly) ────────────────

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 6,
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

// ─── Air status badge renderer ────────────────────────────────────────────────

// Renders a compact colored pill for the air_status field.
// Kept inline rather than using Badge component since we need custom dot + text layout
// that doesn't map cleanly to Badge's predefined variants.
function AirStatusBadge({ status }: { status: Show['air_status'] }) {
  if (!status) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const styles: Record<string, { dot: string; text: string; bg: string }> = {
    on_air:    { dot: '#22c55e', text: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
    available: { dot: 'var(--accent)', text: 'var(--accent)', bg: 'rgba(var(--accent-rgb,220,38,38),0.12)' },
    off_air:   { dot: 'var(--text-muted)', text: 'var(--text-muted)', bg: 'rgba(74,93,128,0.18)' },
  };

  const s = styles[status];
  const labels: Record<string, string> = { on_air: 'On Air', available: 'Available', off_air: 'Off Air' };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: s.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {labels[status]}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShowDbClientProps {
  initialShows: Show[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShowDbClient({ initialShows }: ShowDbClientProps) {
  // Local copy of shows — updated optimistically on star toggle and edit save
  const [shows, setShows] = useState<Show[]>(initialShows);

  // Filter & search state
  const [search, setSearch]             = useState('');
  const [airFilter, setAirFilter]       = useState<AirFilter>('all');
  const [ourShowsOnly, setOurShowsOnly] = useState(false);

  // Sort state — null col means "use server order" (is_our_show DESC, greenlit_date DESC)
  const [sort, setSort] = useState<SortState>({ col: null, dir: 'asc' });

  // Column visibility — initialized from defaults, overwritten from localStorage on mount
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(buildDefaultVisibleCols());

  // Column widths (px) — initialized from defaults, overwritten from localStorage on mount
  const [colWidths, setColWidths] = useState<Record<string, number>>(buildDefaultWidths());

  // Column selector dropdown open/closed
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // Row hover — tracks which row's pencil is highlighted
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Edit modal state
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [formState, setFormState]     = useState<ShowFormState>(blankForm());
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  // Sizzle reel playback state — null means no modal open.
  // Populated on click by handlePlaySizzle; cleared when modal is closed.
  const [activeSizzle, setActiveSizzle] = useState<{
    vimeoUrl: string;
    vimeoPassword: string | null;
    title: string;
  } | null>(null);

  // ─── localStorage rehydration (runs once on mount) ──────────────────────────
  // We intentionally do this in useEffect (not useState initializer) to avoid
  // SSR/hydration mismatch — localStorage is only available in the browser.

  useEffect(() => {
    try {
      const rawFilter = localStorage.getItem('show-db-filter');
      if (rawFilter) {
        const { airFilter: af, ourShowsOnly: oso } = JSON.parse(rawFilter);
        if (af) setAirFilter(af);
        if (typeof oso === 'boolean') setOurShowsOnly(oso);
      }
    } catch { /* ignore parse errors */ }

    try {
      const rawSort = localStorage.getItem('show-db-sort');
      if (rawSort) {
        const parsed = JSON.parse(rawSort);
        if (parsed && typeof parsed.col !== 'undefined') setSort(parsed);
      }
    } catch { /* ignore */ }

    try {
      const rawCols = localStorage.getItem('show-db-cols');
      if (rawCols) {
        const parsed = JSON.parse(rawCols);
        if (parsed && typeof parsed === 'object') setVisibleCols(parsed);
      }
    } catch { /* ignore */ }

    try {
      const rawWidths = localStorage.getItem('show-db-widths');
      if (rawWidths) {
        const parsed = JSON.parse(rawWidths);
        if (parsed && typeof parsed === 'object') setColWidths(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // ─── localStorage persistence (run on every state change) ───────────────────

  useEffect(() => {
    localStorage.setItem('show-db-filter', JSON.stringify({ airFilter, ourShowsOnly }));
  }, [airFilter, ourShowsOnly]);

  useEffect(() => {
    localStorage.setItem('show-db-sort', JSON.stringify(sort));
  }, [sort]);

  useEffect(() => {
    localStorage.setItem('show-db-cols', JSON.stringify(visibleCols));
  }, [visibleCols]);

  useEffect(() => {
    localStorage.setItem('show-db-widths', JSON.stringify(colWidths));
  }, [colWidths]);

  // ─── Close column selector on outside click ──────────────────────────────────

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) {
        setColSelectorOpen(false);
      }
    }
    if (colSelectorOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colSelectorOpen]);

  // ─── Filter (useMemo — pure in-memory, no fetch) ────────────────────────────

  const filtered = useMemo(() => {
    let rows = shows;
    if (ourShowsOnly) rows = rows.filter((s) => s.is_our_show === 1);
    if (airFilter !== 'all') rows = rows.filter((s) => s.air_status === airFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter((s) =>
        [s.title, s.network, s.production_company, s.showrunner, s.genre].some((v) =>
          v?.toLowerCase().includes(q)
        )
      );
    }
    return rows;
  }, [shows, ourShowsOnly, airFilter, search]);

  // ─── Sort (useMemo — applied after filter) ───────────────────────────────────

  const sorted = useMemo(() => {
    if (!sort.col) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.col!];
      const bv = (b as unknown as Record<string, unknown>)[sort.col!];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  // ─── Grid template columns (computed from visible cols + px widths) ──────────
  // Star (32px fixed) + visible data cols (px from state) + edit (40px fixed)

  const gridCols = [
    '32px',
    ...COLUMN_DEFS.filter((c) => visibleCols[c.key] !== false).map((c) => `${colWidths[c.key] ?? c.defaultWidth}px`),
    '40px',
  ].join(' ');

  // ─── Sort header click handler ───────────────────────────────────────────────

  function handleSortClick(col: string) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  }

  // ─── Column resize drag handler ───────────────────────────────────────────────
  // Attaches mousemove/mouseup to document so drags work even if cursor leaves the handle.
  // Enforces a 40px minimum to keep columns usable.

  function startResize(e: React.MouseEvent, colKey: string) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] ?? (COLUMN_DEFS.find((c) => c.key === colKey)?.defaultWidth ?? 100);
    function onMove(ev: MouseEvent) {
      setColWidths((prev) => ({ ...prev, [colKey]: Math.max(40, startW + ev.clientX - startX) }));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ─── Star toggle — optimistic PUT /api/shows/[id] ────────────────────────────

  async function handleStarToggle(e: React.MouseEvent, show: Show) {
    e.stopPropagation(); // prevent any accidental row navigation
    const newVal = show.is_our_show === 1 ? 0 : 1;

    // Optimistic update — flip immediately, revert on failure
    setShows((prev) =>
      prev.map((s) => (s.id === show.id ? { ...s, is_our_show: newVal } : s))
    );

    try {
      const res = await fetch(`/api/shows/${show.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_our_show: newVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
    } catch {
      // Revert on API failure — user sees star snap back
      setShows((prev) =>
        prev.map((s) => (s.id === show.id ? { ...s, is_our_show: show.is_our_show } : s))
      );
    }
  }

  // ─── Edit modal open ──────────────────────────────────────────────────────────

  function openEdit(e: React.MouseEvent, show: Show) {
    e.stopPropagation();
    setEditingShow(show);
    setFormState({
      title:             show.title ?? '',
      network:           show.network ?? '',
      air_status:        show.air_status ?? '',
      production_company: show.production_company ?? '',
      showrunner:        show.showrunner ?? '',
      schedule:          show.schedule ?? '',
      total_seasons:     show.total_seasons != null ? String(show.total_seasons) : '',
      genre:             show.genre ?? '',
      format:            show.format ?? '',
      episode_count:     show.episode_count != null ? String(show.episode_count) : '',
      season_number:     show.season_number != null ? String(show.season_number) : '',
      is_our_show:       show.is_our_show,
      notes:             show.notes ?? '',
    });
    setSaveError(null);
  }

  // ─── Edit modal save — PUT /api/shows/[id] ────────────────────────────────────

  async function handleSave() {
    if (!editingShow) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Convert numeric string fields back to numbers (or null when blank)
      const payload = {
        ...formState,
        air_status:    formState.air_status || null,
        total_seasons: formState.total_seasons !== '' ? Number(formState.total_seasons) : null,
        episode_count: formState.episode_count !== '' ? Number(formState.episode_count) : null,
        season_number: formState.season_number !== '' ? Number(formState.season_number) : null,
      };

      const res = await fetch(`/api/shows/${editingShow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);

      // Merge updated fields into local shows array — no full re-fetch needed
      setShows((prev) =>
        prev.map((s) =>
          s.id === editingShow.id ? { ...s, ...payload } : s
        )
      );
      setEditingShow(null);
    } catch (err) {
      // Always display the exact error — never generic fallback text
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Chip filter toggle helpers ───────────────────────────────────────────────

  function toggleAirFilter(val: AirFilter) {
    // Clicking the active chip resets to 'all'; clicking a different chip sets it
    setAirFilter((prev) => (prev === val ? 'all' : val));
  }

  // ─── Sizzle reel click handler ────────────────────────────────────────────────
  // Fetches on demand — never pre-loaded. Uses title LIKE search since shows
  // have no direct FK to sizzle_reels (they join through ip_catalog).
  // If the API returns at least one sizzle with a vimeo_url, opens the modal.

  async function handlePlaySizzle(e: React.MouseEvent, show: Show) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/sizzles?q=${encodeURIComponent(show.title)}&has_url=true`);
      if (!res.ok) return; // fail silently — no toast needed for a play-button miss
      const sizzles = await res.json() as Array<{
        vimeo_url: string | null;
        vimeo_password: string | null;
        project_title: string;
      }>;
      // Use the first result that has a URL (API already filters with has_url=true)
      const hit = sizzles.find((s) => s.vimeo_url);
      if (!hit?.vimeo_url) return; // no sizzle found — button should have been muted, but guard anyway
      setActiveSizzle({
        vimeoUrl:      hit.vimeo_url,
        vimeoPassword: hit.vimeo_password ?? null,
        title:         hit.project_title || show.title,
      });
    } catch {
      // Network error — fail silently rather than interrupting the browsing experience
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
    {/* Sizzle reel modal — rendered at root so it sits above the table overlay */}
    {activeSizzle && (
      <VimeoPlayerModal
        vimeoUrl={activeSizzle.vimeoUrl}
        title={activeSizzle.title}
        vimeoPassword={activeSizzle.vimeoPassword}
        onClose={() => setActiveSizzle(null)}
      />
    )}
    <div className="space-y-4">

      {/* ── Top bar: title + subtitle + search + column selector ── */}
      <div className="flex items-center gap-3">

        {/* Left: page title + count subtitle */}
        <div className="flex-1">
          <h1
            className="text-2xl font-black tracking-tight leading-none"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
          >
            Show DB
          </h1>
          <span className="text-xs mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
            {sorted.length} of {shows.length} shows
          </span>
        </div>

        {/* Right: search + column selector */}
        <div className="flex items-center gap-2">
          <div style={{ width: 260 }}>
            <Input
              placeholder="Search title, network, showrunner…"
              value={search}
              onChange={setSearch}
            />
          </div>

          {/* Column selector button + dropdown */}
          <div style={{ position: 'relative' }} ref={colSelectorRef}>
            <button
              onClick={() => setColSelectorOpen((prev) => !prev)}
              title="Toggle column visibility"
              className="flex items-center justify-center rounded-md border"
              style={{
                width: 36,
                height: 36,
                background: colSelectorOpen ? 'var(--bg-surface-alt)' : 'transparent',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'background var(--motion-base) var(--ease)',
              }}
            >
              <Columns size={18} />
            </button>

            {/* Dropdown panel */}
            {colSelectorOpen && (
              <div
                className="absolute right-0 z-30 rounded-lg border border-[var(--border-subtle)] shadow-xl"
                style={{
                  top: 'calc(100% + 6px)',
                  minWidth: 200,
                  background: 'var(--bg-elevated)',
                  padding: '8px 0',
                }}
              >
                <div
                  className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Columns
                </div>
                {COLUMN_DEFS.filter((c) => c.hideable).map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-surface-alt)]"
                    style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[col.key] !== false}
                      onChange={(e) =>
                        setVisibleCols((prev) => ({ ...prev, [col.key]: e.target.checked }))
                      }
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chip filter bar ── */}
      <div className="flex items-center gap-2">
        {/* "Our Shows" toggle — independent boolean, not part of airFilter */}
        <button
          onClick={() => setOurShowsOnly((prev) => !prev)}
          className="px-3 py-1.5 text-xs font-medium rounded-md border"
          style={{
            background:   ourShowsOnly ? 'var(--accent)' : 'transparent',
            color:        ourShowsOnly ? '#fff' : 'var(--text-secondary)',
            borderColor:  ourShowsOnly ? 'var(--accent)' : 'var(--border-subtle)',
            transition:   'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
          }}
        >
          ★ Our Shows
        </button>

        {/* Air status chips — clicking active chip resets to 'all' */}
        {(
          [
            { value: 'on_air'    as AirFilter, label: '● On Air'    },
            { value: 'available' as AirFilter, label: '○ Available' },
            { value: 'off_air'   as AirFilter, label: '◉ Off Air'   },
          ] as const
        ).map((chip) => (
          <button
            key={chip.value}
            onClick={() => toggleAirFilter(chip.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border"
            style={{
              background:  airFilter === chip.value ? 'var(--accent)' : 'transparent',
              color:       airFilter === chip.value ? '#fff' : 'var(--text-secondary)',
              borderColor: airFilter === chip.value ? 'var(--accent)' : 'var(--border-subtle)',
              transition:  'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Header row */}
        <div
          className="grid text-xs font-semibold tracking-wider uppercase px-4 py-2.5 border-b border-[var(--border-subtle)]"
          style={{
            gridTemplateColumns: gridCols,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface-alt)',
          }}
        >
          {/* Star column — no sort, always first */}
          <span />

          {/* Data columns — each triggers a sort click; resize handle at right edge */}
          {COLUMN_DEFS.filter((c) => visibleCols[c.key] !== false).map((col) => (
            <div
              key={col.key}
              onClick={() => handleSortClick(col.key)}
              style={{
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
              {/* Resize handle — 4px drag target at the right edge of each header cell */}
              <div
                onMouseDown={(e) => startResize(e, col.key)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  cursor: 'col-resize',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--border-strong)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              />
            </div>
          ))}

          {/* Edit column — blank header */}
          <span />
        </div>

        {/* Data rows */}
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No shows match your filters
          </div>
        ) : (
          sorted.map((show) => (
            <div
              key={show.id}
              className="grid items-center px-4 py-2 border-b border-[var(--border-subtle)] last:border-0"
              style={{
                gridTemplateColumns: gridCols,
                // Off-air shows are visually de-emphasized with reduced opacity
                opacity: show.air_status === 'off_air' ? 0.5 : 1,
                // MYE-produced shows get a left accent stripe
                borderLeft: show.is_our_show === 1 ? '2px solid var(--accent)' : '2px solid transparent',
                background: hoveredRowId === show.id ? 'var(--bg-surface-alt)' : 'transparent',
                transition: 'background var(--motion-base) var(--ease)',
                cursor: 'default',
              }}
              onMouseEnter={() => setHoveredRowId(show.id)}
              onMouseLeave={() => setHoveredRowId(null)}
            >
              {/* ── Star cell ── */}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={(e) => handleStarToggle(e, show)}
                  title={show.is_our_show === 1 ? 'MYE show — click to unmark' : 'Mark as MYE show'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    fontSize: 14,
                    lineHeight: 1,
                    color: show.is_our_show === 1 ? '#f5a623' : 'var(--text-muted)',
                    transition: 'color 150ms ease',
                  }}
                >
                  {show.is_our_show === 1 ? '★' : '☆'}
                </button>
              </span>

              {/* ── Data cells — only render columns that are visible ── */}
              {COLUMN_DEFS.filter((c) => visibleCols[c.key] !== false).map((col) => {
                // Sizzle cell is interactive — needs access to handlePlaySizzle, so it's
                // handled inline here rather than in the stateless renderCell function.
                if (col.key === 'sizzle') {
                  return (
                    <span
                      key="sizzle"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <button
                        onClick={(e) => handlePlaySizzle(e, show)}
                        title={`Play sizzle reel for ${show.title}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '3px 5px',
                          borderRadius: 4,
                          fontSize: 13,
                          lineHeight: 1,
                          color: 'var(--accent)',
                          transition: 'opacity 150ms ease',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                      >
                        ▶
                      </button>
                    </span>
                  );
                }
                return (
                  <span key={col.key} style={{ overflow: 'hidden' }}>
                    {renderCell(col.key, show)}
                  </span>
                );
              })}

              {/* ── Edit pencil ── */}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={(e) => openEdit(e, show)}
                  title="Edit show"
                  style={{
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: hoveredRowId === show.id ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'color 150ms ease',
                  }}
                >
                  {/* Pencil SVG — exact same as BuyersClient */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={editingShow !== null}
        onClose={() => { setEditingShow(null); setSaveError(null); }}
        title={editingShow?.title ?? 'Edit Show'}
        wide
      >
        {/* Row 1: Title (full width) */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Title</label>
          <input
            type="text"
            value={formState.title}
            onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Row 2: Network | Air Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Network</label>
            <input
              type="text"
              value={formState.network}
              onChange={(e) => setFormState((p) => ({ ...p, network: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Air Status</label>
            <select
              value={formState.air_status}
              onChange={(e) =>
                setFormState((p) => ({ ...p, air_status: e.target.value as ShowFormState['air_status'] }))
              }
              style={FIELD_STYLE}
            >
              <option value="">— None —</option>
              <option value="on_air">On Air</option>
              <option value="available">Available</option>
              <option value="off_air">Off Air</option>
            </select>
          </div>
        </div>

        {/* Row 3: Production Company | Showrunner */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Production Company</label>
            <input
              type="text"
              value={formState.production_company}
              onChange={(e) => setFormState((p) => ({ ...p, production_company: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Showrunner</label>
            <input
              type="text"
              value={formState.showrunner}
              onChange={(e) => setFormState((p) => ({ ...p, showrunner: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
        </div>

        {/* Row 4: Schedule | Total Seasons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Schedule</label>
            <input
              type="text"
              value={formState.schedule}
              onChange={(e) => setFormState((p) => ({ ...p, schedule: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Total Seasons</label>
            <input
              type="number"
              min={0}
              value={formState.total_seasons}
              onChange={(e) => setFormState((p) => ({ ...p, total_seasons: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
        </div>

        {/* Row 5: Genre | Format */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Genre</label>
            <input
              type="text"
              value={formState.genre}
              onChange={(e) => setFormState((p) => ({ ...p, genre: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Format</label>
            <input
              type="text"
              value={formState.format}
              onChange={(e) => setFormState((p) => ({ ...p, format: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
        </div>

        {/* Row 6: Episode Count | Season # */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Episode Count</label>
            <input
              type="number"
              min={0}
              value={formState.episode_count}
              onChange={(e) => setFormState((p) => ({ ...p, episode_count: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Season #</label>
            <input
              type="number"
              min={0}
              value={formState.season_number}
              onChange={(e) => setFormState((p) => ({ ...p, season_number: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
        </div>

        {/* Row 7: Is Our Show checkbox */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ ...LABEL_STYLE, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={formState.is_our_show === 1}
              onChange={(e) =>
                setFormState((p) => ({ ...p, is_our_show: e.target.checked ? 1 : 0 }))
              }
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            MYE-produced show
          </label>
        </div>

        {/* Row 8: Notes (full width textarea) */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Notes</label>
          <textarea
            rows={3}
            value={formState.notes}
            onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
            style={{ ...FIELD_STYLE, resize: 'vertical' }}
          />
        </div>

        {/* Exact error message on failure — never generic text */}
        {saveError && (
          <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
        )}

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingShow(null); setSaveError(null); }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
    </div>
    </>
  );
}

// ─── Cell renderer (extracted to keep JSX above readable) ────────────────────
// Returns the appropriate JSX for a given column key + show row.

function renderCell(colKey: string, show: Show): React.ReactNode {
  switch (colKey) {
    case 'title':
      return (
        <span className="text-sm font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
          {show.title}
        </span>
      );

    case 'air_status':
      return <AirStatusBadge status={show.air_status} />;

    case 'total_seasons':
    case 'episode_count':
    case 'season_number': {
      const val = show[colKey as keyof Show] as number | null;
      return (
        <span
          className="text-sm tabular-nums"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}
        >
          {val != null ? val : '—'}
        </span>
      );
    }

    case 'premiere_date':
    case 'greenlit_date': {
      const ts = show[colKey as keyof Show] as number | null;
      if (!ts) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      try {
        return (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {format(new Date(ts), 'MMM yyyy')}
          </span>
        );
      } catch {
        return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      }
    }

    default: {
      // All remaining text columns: network, production_company, showrunner, schedule,
      // genre, format, location_type, source
      const val = show[colKey as keyof Show] as string | null;
      return (
        <span className="text-sm truncate block pr-2" style={{ color: 'var(--text-secondary)' }}>
          {val ?? '—'}
        </span>
      );
    }
  }
}

// ─── Blank form (used for initialization before a show is selected) ──────────

function blankForm(): ShowFormState {
  return {
    title:              '',
    network:            '',
    air_status:         '',
    production_company: '',
    showrunner:         '',
    schedule:           '',
    total_seasons:      '',
    genre:              '',
    format:             '',
    episode_count:      '',
    season_number:      '',
    is_our_show:        0,
    notes:              '',
  };
}
