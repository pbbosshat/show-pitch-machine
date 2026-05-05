'use client';
// Leads management page — displays contact form submissions from myentertainment.tv.
// Fetches leads from GET /api/contact and allows deletion via DELETE /api/contact/[id].
// Settings panel lets admins configure the notification email (leads_email in site_settings).
// Implements all five mandatory table features: sort, filter chips, column selector,
// column resizing, and live search.

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Data types ───────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;             // buyer's company name
  available_title_id: string | null;  // set when the lead came from a package request
  show_title: string | null;          // joined from available_titles — the show they requested
  message: string | null;
  created_at: number; // milliseconds timestamp
}

type SortCol = 'name' | 'email' | 'company' | 'message' | 'date';
type SortDir = 'asc' | 'desc';
type MessageFilter = 'all' | 'has' | 'none';

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Default column widths (px): Name, Email, Company, Message, Date, Actions ─

const DEFAULT_WIDTHS = [200, 180, 100, 240, 130, 64];

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function IconChevronsUpDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
      <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
    </svg>
  );
}

function IconChevronUp({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  );
}

function IconChevronDown({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function IconColumns() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  );
}

// ─── Sort icon helper ─────────────────────────────────────────────────────────

function SortIcon({ col, sort }: { col: SortCol; sort: { col: SortCol | null; dir: SortDir } }) {
  if (sort.col !== col) return <IconChevronsUpDown />;
  return sort.dir === 'asc'
    ? <IconChevronUp color="var(--accent)" />
    : <IconChevronDown color="var(--accent)" />;
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function LeadsPage() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Settings panel state ─────────────────────────────────────────────────────
  const [leadsEmail, setLeadsEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Table: search ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  // ── Table: sort (persisted to localStorage) ──────────────────────────────────
  const [sort, setSort] = useState<{ col: SortCol | null; dir: SortDir }>(() =>
    lsGet('leads-sort', { col: 'date' as SortCol, dir: 'desc' as SortDir })
  );

  // ── Table: filter chip (persisted) ───────────────────────────────────────────
  const [msgFilter, setMsgFilter] = useState<MessageFilter>(() =>
    lsGet('leads-filter', 'all' as MessageFilter)
  );

  // ── Table: column visibility (persisted) ─────────────────────────────────────
  // Merge saved prefs with defaults so new columns (company, show) are visible
  // even when localStorage only has an older subset of keys.
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const defaults = { name: true, email: true, company: true, show: true, message: true, date: true };
    return { ...defaults, ...lsGet<Record<string, boolean>>('leads-cols', defaults) };
  });
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // ── Table: column widths (drag-to-resize) ────────────────────────────────────
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS);

  // ─── Fetch leads on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/contact')
      .then((r) => r.ok ? r.json() : Promise.reject(`Error ${r.status}`))
      .then((d) => { if (d?.data) setLeads(d.data); })
      .catch((err) => console.error('[leads] fetch failed:', err))
      .finally(() => setLoading(false));
  }, []);

  // ─── Fetch current leads_email setting on mount ───────────────────────────────
  useEffect(() => {
    fetch('/api/settings?key=leads_email')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const val = d?.data?.value ?? '';
        setLeadsEmail(val);
        setEmailInput(val);
      })
      .catch(() => {});
  }, []);

  // ─── Close column selector on outside click ──────────────────────────────────
  useEffect(() => {
    if (!colSelectorOpen) return;
    function handleClick(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) {
        setColSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [colSelectorOpen]);

  // ─── Persist sort to localStorage whenever it changes ────────────────────────
  useEffect(() => { lsSet('leads-sort', sort); }, [sort]);

  // ─── Persist filter to localStorage ──────────────────────────────────────────
  useEffect(() => { lsSet('leads-filter', msgFilter); }, [msgFilter]);

  // ─── Persist column visibility to localStorage ────────────────────────────────
  useEffect(() => { lsSet('leads-cols', visibleCols); }, [visibleCols]);

  // ─── Sort header click handler ────────────────────────────────────────────────
  function handleSortClick(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  }

  // ─── Column resize — track mousedown on header drag handle ───────────────────
  const startResize = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[colIndex];

    function onMove(ev: MouseEvent) {
      const next = Math.max(40, startW + ev.clientX - startX);
      setColWidths((prev) => prev.map((w, i) => (i === colIndex ? next : w)));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [colWidths]);

  // ─── Delete a lead ────────────────────────────────────────────────────────────
  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead from ${lead.first_name} ${lead.last_name} (${lead.email})? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/contact/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDeleteError(d.error ?? `Error ${res.status}`);
        return;
      }
      // Remove from local state on success
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete request failed');
    }
  }

  // ─── Save leads_email setting ─────────────────────────────────────────────────
  async function handleSaveEmail() {
    if (!emailInput.trim()) return;
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'leads_email', value: emailInput.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setLeadsEmail(emailInput.trim());
        setEmailMsg({ ok: true, text: 'Notification email saved.' });
      } else {
        setEmailMsg({ ok: false, text: d.error ?? `Error ${res.status}` });
      }
    } catch (err) {
      setEmailMsg({ ok: false, text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setEmailSaving(false);
    }
  }

  // ─── Filter + search + sort pipeline ─────────────────────────────────────────

  const q = search.toLowerCase();

  const filtered = leads
    .filter((l) => {
      // Message filter chip
      if (msgFilter === 'has') return !!l.message;
      if (msgFilter === 'none') return !l.message;
      return true;
    })
    .filter((l) => {
      // Live search across text fields (now includes company)
      if (!q) return true;
      return (
        l.first_name.toLowerCase().includes(q) ||
        l.last_name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company ?? '').toLowerCase().includes(q) ||
        (l.show_title ?? '').toLowerCase().includes(q) ||
        (l.message ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      switch (sort.col) {
        case 'name':
          return dir * (a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
        case 'email':
          return dir * a.email.localeCompare(b.email);
        case 'company':
          return dir * ((a.company ?? '').localeCompare(b.company ?? ''));
        case 'message':
          // Sort by presence first, then length
          return dir * ((a.message?.length ?? 0) - (b.message?.length ?? 0));
        case 'date':
        default:
          return dir * (a.created_at - b.created_at);
      }
    });

  // ─── Build grid template from visible columns + widths ────────────────────────
  // Column order: Name (0), Email (1), Company (2), Show (3), Message (4), Date (5), Actions (5 — always visible)
  const colDefs: { key: string; idx: number }[] = [
    { key: 'name',    idx: 0 },
    { key: 'email',   idx: 1 },
    { key: 'company', idx: 2 },
    { key: 'show',    idx: 3 },
    { key: 'message', idx: 4 },
    { key: 'date',    idx: 5 },
  ];

  // Only include visible columns in the grid template — hidden columns are not
  // rendered in the DOM at all (conditional rendering), so including 0px slots
  // for them causes the remaining elements to shift into the wrong grid tracks.
  const gridCols = [
    ...colDefs.filter((c) => visibleCols[c.key]).map((c) => `${colWidths[c.idx]}px`),
    '64px', // Actions always visible
  ].join(' ');

  // ─── Shared styles ────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    overflow: 'visible',
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface-alt)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const chipBase: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--border-subtle)',
    transition: 'background 0.15s, color 0.15s',
  };

  const chipActive: React.CSSProperties = {
    ...chipBase,
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid var(--accent)',
  };

  const chipInactive: React.CSSProperties = {
    ...chipBase,
    background: 'transparent',
    color: 'var(--text-secondary)',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6" style={{ maxWidth: 1100 }}>

      {/* ── Page header ── */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Leads</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Contact form submissions from myentertainment.tv
        </p>
      </div>

      {/* ── Settings panel ── */}
      <div className="mb-5" style={cardStyle}>
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Settings
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>
              Lead notification email
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="email@example.com"
              style={{ ...inputStyle, minWidth: 240 }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEmail(); }}
            />
            <button
              onClick={handleSaveEmail}
              disabled={emailSaving || !emailInput.trim() || emailInput.trim() === leadsEmail}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: emailSaving || !emailInput.trim() || emailInput.trim() === leadsEmail ? 'default' : 'pointer',
                opacity: emailSaving || !emailInput.trim() || emailInput.trim() === leadsEmail ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {emailSaving ? 'Saving…' : 'Save'}
            </button>
            {emailMsg && (
              <span
                className="text-xs"
                style={{ color: emailMsg.ok ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)' }}
              >
                {emailMsg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div style={cardStyle}>

        {/* Controls bar: search + filter chips + column selector */}
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--border-subtle)' }}>

          {/* Live search */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            style={{ ...inputStyle, minWidth: 200 }}
          />

          {/* Result count */}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Filter chips — message presence */}
          <div className="flex items-center gap-1.5">
            {(['all', 'has', 'none'] as MessageFilter[]).map((f) => {
              const label = f === 'all' ? 'All' : f === 'has' ? 'Has Message' : 'No Message';
              const isActive = msgFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setMsgFilter(isActive ? 'all' : f)}
                  style={isActive ? chipActive : chipInactive}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Column selector button */}
          <div style={{ position: 'relative' }} ref={colSelectorRef}>
            <button
              onClick={() => setColSelectorOpen((o) => !o)}
              title="Show/hide columns"
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: colSelectorOpen ? 'var(--bg-surface-alt)' : 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <IconColumns />
            </button>

            {/* Column selector dropdown */}
            {colSelectorOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 40,
                  zIndex: 50,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '8px 0',
                  minWidth: 140,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                }}
              >
                {colDefs.map(({ key }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 14px',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols[key] ?? true}
                      onChange={(e) => setVisibleCols((prev) => ({ ...prev, [key]: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table — CSS Grid layout */}
        <div style={{ overflowX: 'auto' }}>

          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {/* Name header */}
            {visibleCols.name && (
              <div
                style={{ position: 'relative', overflow: 'hidden' }}
                className="group"
              >
                <button
                  onClick={() => handleSortClick('name')}
                  className="flex items-center gap-1.5 w-full px-4 py-2.5 text-left"
                  style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Name <SortIcon col="name" sort={sort} />
                </button>
                {/* Drag handle */}
                <div
                  onMouseDown={(e) => startResize(e, 0)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', opacity: 0, background: 'var(--border-subtle)', transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                />
              </div>
            )}

            {/* Email header */}
            {visibleCols.email && (
              <div style={{ position: 'relative', overflow: 'hidden' }} className="group">
                <button
                  onClick={() => handleSortClick('email')}
                  className="flex items-center gap-1.5 w-full px-4 py-2.5 text-left"
                  style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Email <SortIcon col="email" sort={sort} />
                </button>
                <div
                  onMouseDown={(e) => startResize(e, 1)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', opacity: 0, background: 'var(--border-subtle)', transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                />
              </div>
            )}

            {/* Company header */}
            {visibleCols.company && (
              <div style={{ position: 'relative', overflow: 'hidden' }} className="group">
                <button
                  onClick={() => handleSortClick('company')}
                  className="flex items-center gap-1.5 w-full px-4 py-2.5 text-left"
                  style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Company <SortIcon col="company" sort={sort} />
                </button>
                <div
                  onMouseDown={(e) => startResize(e, 2)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', opacity: 0, background: 'var(--border-subtle)', transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                />
              </div>
            )}

            {/* Show (package request) header — no sort, presence-only badge */}
            {visibleCols.show && (
              <div style={{ position: 'relative', overflow: 'hidden' }} className="group">
                <div
                  className="flex items-center gap-1.5 w-full px-4 py-2.5"
                  style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Show
                </div>
                <div
                  onMouseDown={(e) => startResize(e, 3)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', opacity: 0, background: 'var(--border-subtle)', transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                />
              </div>
            )}

            {/* Message header */}
            {visibleCols.message && (
              <div style={{ position: 'relative', overflow: 'hidden' }} className="group">
                <button
                  onClick={() => handleSortClick('message')}
                  className="flex items-center gap-1.5 w-full px-4 py-2.5 text-left"
                  style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Message <SortIcon col="message" sort={sort} />
                </button>
                <div
                  onMouseDown={(e) => startResize(e, 4)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', opacity: 0, background: 'var(--border-subtle)', transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                />
              </div>
            )}

            {/* Date header */}
            {visibleCols.date && (
              <div style={{ position: 'relative', overflow: 'hidden' }} className="group">
                <button
                  onClick={() => handleSortClick('date')}
                  className="flex items-center gap-1.5 w-full px-4 py-2.5 text-left"
                  style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Date <SortIcon col="date" sort={sort} />
                </button>
                <div
                  onMouseDown={(e) => startResize(e, 5)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', opacity: 0, background: 'var(--border-subtle)', transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                />
              </div>
            )}

            {/* Actions header — always visible, no sort */}
            <div className="px-4 py-2.5" style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }} />
          </div>

          {/* Delete error banner */}
          {deleteError && (
            <div className="px-4 py-2 text-sm" style={{ color: 'var(--error, #ef4444)', borderBottom: '1px solid var(--border-subtle)' }}>
              Delete failed: {deleteError}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading leads…
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {leads.length === 0 ? 'No leads yet.' : 'No leads match your filters.'}
            </div>
          )}

          {/* Data rows — pass gridCols, visibleCols, and delete handler to each row */}
          {!loading && filtered.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              gridCols={gridCols}
              visibleCols={visibleCols}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LeadRow — extracted to avoid recreating on every filter change ───────────

interface LeadRowProps {
  lead: Lead;
  gridCols: string;
  visibleCols: Record<string, boolean>;
  onDelete: (lead: Lead) => void;
}

function LeadRow({ lead, gridCols, visibleCols, onDelete }: LeadRowProps) {
  const [hovered, setHovered] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);

  const formattedDate = new Date(lead.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        borderBottom: '1px solid var(--border-subtle)',
        background: hovered ? 'var(--bg-surface-alt)' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Name */}
      {visibleCols.name && (
        <div className="px-4 py-3 flex items-center overflow-hidden">
          <span
            className="font-medium text-sm truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {lead.first_name} {lead.last_name}
          </span>
        </div>
      )}

      {/* Email */}
      {visibleCols.email && (
        <div className="px-4 py-3 flex items-center overflow-hidden">
          <a
            href={`mailto:${lead.email}`}
            className="text-sm truncate"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >
            {lead.email}
          </a>
        </div>
      )}

      {/* Company */}
      {visibleCols.company && (
        <div className="px-4 py-3 flex items-center overflow-hidden">
          {lead.company ? (
            <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {lead.company}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
          )}
        </div>
      )}

      {/* Show — title of the requested package, or "—" if not a package request */}
      {visibleCols.show && (
        <div className="px-4 py-3 flex items-center overflow-hidden">
          {lead.available_title_id ? (
            <span
              className="text-sm truncate"
              title={lead.show_title ?? 'Package Request'}
              style={{ color: 'var(--accent)' }}
            >
              {lead.show_title ?? 'Package Request'}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
          )}
        </div>
      )}

      {/* Message — truncated to 1 line with tooltip */}
      {visibleCols.message && (
        <div className="px-4 py-3 flex items-center overflow-hidden">
          {lead.message ? (
            <span
              className="text-sm truncate"
              style={{ color: 'var(--text-secondary)' }}
              title={lead.message}
            >
              {lead.message}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              —
            </span>
          )}
        </div>
      )}

      {/* Date */}
      {visibleCols.date && (
        <div className="px-4 py-3 flex items-center">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formattedDate}
          </span>
        </div>
      )}

      {/* Delete action */}
      <div className="px-4 py-3 flex items-center justify-center">
        <button
          onClick={() => onDelete(lead)}
          title="Delete lead"
          onMouseEnter={() => setTrashHovered(true)}
          onMouseLeave={() => setTrashHovered(false)}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: trashHovered ? '#ef4444' : 'var(--text-muted)',
            transition: 'color 0.15s',
          }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}
