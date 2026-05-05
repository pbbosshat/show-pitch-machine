'use client';
// BuyersClient — search + filter + sort + column-configurable + resizable table for the buyers directory.
// Receives all buyers as a prop (already fetched server-side) and filters/sorts in-memory.
// Row click navigates to the buyer profile page.
// Pencil icon on each row opens an inline edit modal with a PUT to /api/buyers/[id].
// Column visibility, sort, and column widths are persisted to localStorage.
//
// Extended in migration 017 enrichment pass: shows email, phone in search; combined
// "Last MYE Contact · by" column with relative time formatting; pitch count badge.

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
// Note: relativeTime() helper defined in this file replaces date-fns formatDistanceToNow
import StatusDot from '@/components/ui/StatusDot';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { BuyerContact, ActivityStatus, BuyerRoleType } from '@/types';

// ─── relativeTime helper ──────────────────────────────────────────────────────
// Converts a unix-ms timestamp to a compact relative string: "3d ago", "2w ago",
// "1m ago", "1y ago". Returns "—" for null/zero values.
// Intentionally simpler than date-fns formatDistanceToNow — no "about" prefix.
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

type StatusFilter = 'all' | ActivityStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'active',  label: 'Active' },
  { value: 'quiet',   label: 'Quiet' },
  { value: 'unknown', label: 'Unknown' },
];

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  defaultWidth: number; // px
  hideable: boolean;    // false = always visible, not shown in column selector
  defaultVisible: boolean;
}

const COLUMN_DEFS: ColDef[] = [
  // name is always visible (hideable: false) — it's the primary identifier
  { key: 'name',                  label: 'Name',           defaultWidth: 200, hideable: false, defaultVisible: true  },
  { key: 'title',                 label: 'Title',          defaultWidth: 190, hideable: true,  defaultVisible: true  },
  { key: 'email',                 label: 'Email',          defaultWidth: 180, hideable: true,  defaultVisible: true  },
  { key: 'activity_status',       label: 'Status',         defaultWidth: 130, hideable: true,  defaultVisible: true  },
  { key: 'orders_last_90_days',   label: 'Orders/90d',     defaultWidth: 90,  hideable: true,  defaultVisible: true  },
  { key: 'last_greenlit_date',    label: 'Last Greenlit',  defaultWidth: 110, hideable: true,  defaultVisible: true  },
  // Combined column: "3d ago · sm" — touch date + who from MYE last contacted
  { key: 'last_mye_contact_date', label: 'Last MYE',       defaultWidth: 160, hideable: true,  defaultVisible: true  },
  { key: 'mye_pitch_count',       label: 'Pitches',        defaultWidth: 80,  hideable: true,  defaultVisible: true  },
];

// Build initial visible-columns Record from COLUMN_DEFS defaults
function buildDefaultVisibleCols(): Record<string, boolean> {
  return Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c.defaultVisible]));
}

// Build initial column widths Record from COLUMN_DEFS defaultWidth values
function buildDefaultWidths(): Record<string, number> {
  return Object.fromEntries(COLUMN_DEFS.map((c) => [c.key, c.defaultWidth]));
}

// Fields exposed in the edit form — subset of BuyerContact that makes sense to hand-edit
interface BuyerFormState {
  title: string;
  activity_status: ActivityStatus;
  role_type: BuyerRoleType | '';
  is_buyer_seat: number;
  production_type_focus: string;
  mandate_statement: string;
  notes: string;
}

// Shared inline-style for every form input / select / textarea
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

interface BuyersClientProps {
  initialBuyers: BuyerContact[];
}

export default function BuyersClient({ initialBuyers }: BuyersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Local copy of buyers — updated optimistically on successful save
  const [buyers, setBuyers] = useState<BuyerContact[]>(initialBuyers);

  // Sort state — null col means unsorted (server order)
  const [sort, setSort] = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });

  // Column visibility — initialized from defaults, overwritten from localStorage on mount
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(buildDefaultVisibleCols());

  // Column widths (px) — initialized from defaults, overwritten from localStorage on mount
  const [colWidths, setColWidths] = useState<Record<string, number>>(buildDefaultWidths());

  // Column selector dropdown open/closed
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // Edit modal state
  const [editingBuyer, setEditingBuyer] = useState<BuyerContact | null>(null);
  const [formState, setFormState] = useState<BuyerFormState>({
    title: '',
    activity_status: 'unknown',
    role_type: '',
    is_buyer_seat: 0,
    production_type_focus: '',
    mandate_statement: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Tracks which row's pencil icon is highlighted (hover)
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // ─── localStorage rehydration (runs once on mount) ──────────────────────────
  // Done in useEffect to avoid SSR/hydration mismatch — localStorage is browser-only.

  useEffect(() => {
    try {
      const s = localStorage.getItem('buyers-sort');
      if (s) { const p = JSON.parse(s); if (p?.col !== undefined) setSort(p); }
    } catch { /* ignore */ }
    try {
      const c = localStorage.getItem('buyers-cols');
      if (c) { const p = JSON.parse(c); if (p && typeof p === 'object') setVisibleCols(p); }
    } catch { /* ignore */ }
    try {
      const w = localStorage.getItem('buyers-widths');
      if (w) { const p = JSON.parse(w); if (p && typeof p === 'object') setColWidths(p); }
    } catch { /* ignore */ }
  }, []);

  // ─── localStorage persistence (run on every relevant state change) ───────────

  useEffect(() => { localStorage.setItem('buyers-sort', JSON.stringify(sort)); }, [sort]);
  useEffect(() => { localStorage.setItem('buyers-cols', JSON.stringify(visibleCols)); }, [visibleCols]);
  useEffect(() => { localStorage.setItem('buyers-widths', JSON.stringify(colWidths)); }, [colWidths]);

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

  // ─── Filter buyers by search text and activity status ───────────────────────
  // Runs in-memory — no extra fetch needed.

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return buyers.filter((b) => {
      const matchesStatus = statusFilter === 'all' || b.activity_status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      // Search across name, title, mandate, email, and phone (all nullable-safe)
      return (
        b.name.toLowerCase().includes(q) ||
        (b.title ?? '').toLowerCase().includes(q) ||
        (b.mandate_statement ?? '').toLowerCase().includes(q) ||
        (b.email ?? '').toLowerCase().includes(q) ||
        (b.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [buyers, search, statusFilter]);

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

  const gridCols = [
    ...COLUMN_DEFS.filter((c) => visibleCols[c.key] !== false).map((c) => `${colWidths[c.key] ?? c.defaultWidth}px`),
    '40px', // edit column — fixed width
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
  // Attaches mousemove/mouseup to document so drags work if cursor leaves the handle.
  // Enforces 40px minimum column width.

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

  // Open the edit modal and seed form state from the chosen buyer
  function openEdit(e: React.MouseEvent, buyer: BuyerContact) {
    e.stopPropagation(); // prevent row click from navigating
    setEditingBuyer(buyer);
    setFormState({
      title: buyer.title ?? '',
      activity_status: buyer.activity_status,
      role_type: buyer.role_type ?? '',
      is_buyer_seat: buyer.is_buyer_seat,
      production_type_focus: buyer.production_type_focus ?? '',
      mandate_statement: buyer.mandate_statement ?? '',
      notes: buyer.notes ?? '',
    });
    setSaveError(null);
  }

  // PUT the edited fields to the API, then merge into local state on success
  async function handleSave() {
    if (!editingBuyer) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/buyers/${editingBuyer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      // Merge updated fields into local buyers list without a full re-fetch.
      // Convert the '' sentinel values back to null to stay compatible with BuyerContact types.
      const merged: Partial<BuyerContact> = {
        ...formState,
        role_type: formState.role_type !== '' ? formState.role_type : null,
      };
      setBuyers((prev) =>
        prev.map((b) => (b.id === editingBuyer.id ? { ...b, ...merged } : b))
      );
      setEditingBuyer(null);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + filter controls + column selector */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search buyers, titles, mandates…"
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Activity status pills */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={{
                background: statusFilter === f.value ? 'var(--accent)' : 'transparent',
                color: statusFilter === f.value ? '#fff' : 'var(--text-secondary)',
                borderColor: statusFilter === f.value ? 'var(--accent)' : 'var(--border-subtle)',
                transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sorted.length} result{sorted.length !== 1 ? 's' : ''}
        </span>

        {/* Column selector button + dropdown — pushed to right edge */}
        <div style={{ position: 'relative', marginLeft: 'auto' }} ref={colSelectorRef}>
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

          {/* Dropdown panel — only hideable columns (name is not hideable) */}
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

      {/* Table */}
      <div
        className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Table header — uses COLUMN_DEFS for sort icons and resize handles */}
        <div
          className="grid text-xs font-semibold tracking-wider uppercase px-4 py-2.5 border-b border-[var(--border-subtle)]"
          style={{
            gridTemplateColumns: gridCols,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface-alt)',
          }}
        >
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
          <span>{/* edit column — intentionally blank */}</span>
        </div>

        {/* Table rows */}
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No buyers match your search
          </div>
        ) : (
          sorted.map((buyer) => (
            <div
              key={buyer.id}
              className="grid items-center px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--bg-surface-alt)]"
              style={{
                gridTemplateColumns: gridCols,
                transition: 'background var(--motion-base) var(--ease)',
              }}
              onClick={() => router.push(`/buyers/${buyer.id}`)}
              onMouseEnter={() => setHoveredRowId(buyer.id)}
              onMouseLeave={() => setHoveredRowId(null)}
            >
              {/* Render each visible column's cell in COLUMN_DEFS order */}
              {COLUMN_DEFS.filter((c) => visibleCols[c.key] !== false).map((col) => {
                switch (col.key) {
                  case 'name':
                    return (
                      <span key="name" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {buyer.name}
                        {/* Pitch count badge — shown inline with name when > 0 */}
                        {buyer.mye_pitch_count > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium tabular-nums"
                            style={{
                              background: 'var(--bg-surface-alt)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--accent)',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {buyer.mye_pitch_count}p
                          </span>
                        )}
                      </span>
                    );
                  case 'title':
                    return (
                      <span key="title" className="text-sm truncate pr-2" style={{ color: 'var(--text-secondary)' }}>
                        {buyer.title ?? '—'}
                      </span>
                    );
                  case 'email':
                    // Truncate at 30 chars with ellipsis — monospace for readability
                    return (
                      <span
                        key="email"
                        className="text-xs truncate pr-2"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: 'var(--text-muted)',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                        title={buyer.email ?? ''}
                      >
                        {buyer.email
                          ? buyer.email.length > 30
                            ? buyer.email.slice(0, 30) + '…'
                            : buyer.email
                          : '—'}
                      </span>
                    );
                  case 'activity_status':
                    return (
                      <span key="activity_status" className="flex items-center gap-2">
                        <StatusDot status={buyer.activity_status} />
                        <Badge
                          label={buyer.activity_status}
                          variant={buyer.activity_status as 'active' | 'quiet' | 'unknown'}
                        />
                      </span>
                    );
                  case 'orders_last_90_days':
                    return (
                      <span
                        key="orders_last_90_days"
                        className="text-sm tabular-nums"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}
                      >
                        {buyer.orders_last_90_days}
                      </span>
                    );
                  case 'last_greenlit_date':
                    return (
                      <span key="last_greenlit_date" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {relativeTime(buyer.last_greenlit_date)}
                      </span>
                    );
                  case 'last_mye_contact_date': {
                    // Combined column: "3d ago · sm" (touch date + who from MYE)
                    // last_contacted_by comes from the server-side subquery in buyers/page.tsx
                    const contactedBy = (buyer as BuyerContact & { last_contacted_by?: string | null }).last_contacted_by;
                    // Extract just the username portion before @ (e.g. "sm" from "sm@gototeam.com")
                    const byUsername = contactedBy ? contactedBy.split('@')[0] : null;
                    return (
                      <span key="last_mye_contact_date" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {buyer.last_mye_contact_date
                          ? (
                            <>
                              {relativeTime(buyer.last_mye_contact_date)}
                              {byUsername && (
                                <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}> · {byUsername}</span>
                              )}
                            </>
                          )
                          : '—'}
                      </span>
                    );
                  }
                  case 'mye_pitch_count':
                    return (
                      <span
                        key="mye_pitch_count"
                        className="text-sm tabular-nums"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}
                      >
                        {buyer.mye_pitch_count > 0 ? buyer.mye_pitch_count : '—'}
                      </span>
                    );
                  default:
                    return <span key={col.key} />;
                }
              })}

              {/* Pencil edit button — stops propagation so it doesn't navigate to profile */}
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  onClick={(e) => openEdit(e, buyer)}
                  title="Edit buyer"
                  style={{
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: hoveredRowId === buyer.id ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'color 150ms ease',
                  }}
                >
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

      {/* Edit modal — mounts when a buyer row's pencil is clicked */}
      <Modal
        isOpen={editingBuyer !== null}
        onClose={() => { setEditingBuyer(null); setSaveError(null); }}
        title={editingBuyer?.name ?? 'Edit Buyer'}
      >
        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Title</label>
          <input
            type="text"
            value={formState.title}
            onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Activity Status */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Activity Status</label>
          <select
            value={formState.activity_status}
            onChange={(e) => setFormState((p) => ({ ...p, activity_status: e.target.value as ActivityStatus }))}
            style={FIELD_STYLE}
          >
            <option value="active">Active</option>
            <option value="quiet">Quiet</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        {/* Role Type */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Role Type</label>
          <select
            value={formState.role_type}
            onChange={(e) => setFormState((p) => ({ ...p, role_type: e.target.value as BuyerRoleType | '' }))}
            style={FIELD_STYLE}
          >
            <option value="">— None —</option>
            <option value="buyer_exec">Buyer Exec</option>
            <option value="staff_producer">Staff Producer</option>
            <option value="showrunner">Showrunner</option>
            <option value="talent">Talent</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        {/* Buyer Seat */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Buyer Seat</label>
          <select
            value={formState.is_buyer_seat}
            onChange={(e) => setFormState((p) => ({ ...p, is_buyer_seat: Number(e.target.value) }))}
            style={FIELD_STYLE}
          >
            <option value={1}>Yes</option>
            <option value={0}>No</option>
          </select>
        </div>

        {/* Production Type Focus */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Production Type Focus</label>
          <select
            value={formState.production_type_focus}
            onChange={(e) => setFormState((p) => ({ ...p, production_type_focus: e.target.value }))}
            style={FIELD_STYLE}
          >
            <option value="">— None —</option>
            <option value="independent">Independent</option>
            <option value="in_house">In-House</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        {/* Mandate Statement */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Mandate Statement</label>
          <textarea
            rows={3}
            value={formState.mandate_statement}
            onChange={(e) => setFormState((p) => ({ ...p, mandate_statement: e.target.value }))}
            style={{ ...FIELD_STYLE, resize: 'vertical' }}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Notes</label>
          <textarea
            rows={2}
            value={formState.notes}
            onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
            style={{ ...FIELD_STYLE, resize: 'vertical' }}
          />
        </div>

        {/* Error message — shows exact API error so nothing is hidden from the user */}
        {saveError && (
          <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" size="sm" onClick={() => { setEditingBuyer(null); setSaveError(null); }} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
