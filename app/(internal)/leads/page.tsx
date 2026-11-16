'use client';
// Leads management page — displays contact form submissions from myentertainment.tv.
// Fetches leads from GET /api/contact, updates triage status and notes via
// PATCH /api/contact/[id], and deletes via DELETE /api/contact/[id].
// Settings panel lets admins configure the notification email (leads_email in site_settings).
// Table features: source tabs, status filter chips (faceted counts), sort,
// column selector, column resizing, live search, inline status select, and an
// expandable detail row with the full submission and internal notes.
//
// All source/status labels come from lib/lead-meta.ts — never hardcode them here.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DEFAULT_LEAD_STATUS,
  LEAD_NOTES_MAX,
  LEAD_SOURCES,
  LEAD_STATUSES,
  isLeadSourceKey,
  isLeadStatus,
  leadSourceKey,
  leadSourceLabel,
  leadStatusLabel,
  type Lead,
  type LeadSourceKey,
  type LeadStatus,
} from '@/lib/lead-meta';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortCol = 'name' | 'status' | 'source' | 'email' | 'company' | 'message' | 'notes' | 'date';
type SortDir = 'asc' | 'desc';
type SourceFilter = 'all' | LeadSourceKey;
type StatusFilter = 'all' | LeadStatus;

// Hideable data columns, in display order. Chevron (left) and Actions (right)
// are fixed and always shown.
type ColKey = 'name' | 'status' | 'source' | 'email' | 'company' | 'show' | 'message' | 'notes' | 'date';

interface ColDef {
  key: ColKey;
  label: string;
  sort: SortCol | null; // null = not sortable
}

const COLUMNS: ColDef[] = [
  { key: 'name',    label: 'Name',    sort: 'name' },
  { key: 'status',  label: 'Status',  sort: 'status' },
  { key: 'source',  label: 'Source',  sort: 'source' },
  { key: 'email',   label: 'Email',   sort: 'email' },
  { key: 'company', label: 'Company', sort: 'company' },
  { key: 'show',    label: 'Show',    sort: null },
  { key: 'message', label: 'Message', sort: 'message' },
  { key: 'notes',   label: 'Notes',   sort: 'notes' },
  { key: 'date',    label: 'Date',    sort: 'date' },
];

const SORT_COLS = new Set<string>(COLUMNS.map((c) => c.sort).filter(Boolean) as string[]);

// One width (px) per data column. Typed as a full Record so a new column
// cannot be added without a width (the old positional array fell out of step).
// For the flexible columns (see FLEX_COLS) this is the MINIMUM width; they
// share any spare space. Defaults are sized so the default columns fit at a
// 1280px window: 1280 - 224 (Nav w-56) - 48 (page padding) - 2 (card border)
// = 1006px inside the card; 36 + 140 + 150 + 110 + 160 + 140 + 120 + 100 + 44
// = 1000px.
const DEFAULT_WIDTHS: Record<ColKey, number> = {
  name: 140,
  status: 150,
  source: 110,
  email: 160,
  company: 150,
  show: 170,
  message: 140,
  notes: 120,
  date: 100,
};
// Flexible columns and their share (fr) of the spare width.
const FLEX_COLS: Partial<Record<ColKey, number>> = { message: 2, notes: 1 };
const CHEVRON_WIDTH = 36;
const ACTIONS_WIDTH = 44;

const DISCARD_NOTES_PROMPT = 'You have unsaved notes for this lead. Discard them?';

// Company and Show are rarely filled in, so they start hidden. Stored under a
// v2 key: the old 'leads-cols' prefs had company/show saved as true, and
// merging them over these defaults would silently turn them back on.
const DEFAULT_VISIBLE: Record<ColKey, boolean> = {
  name: true,
  status: true,
  source: true,
  email: true,
  company: false,
  show: false,
  message: true,
  notes: true,
  date: true,
};

const LS_SORT = 'leads-sort';
const LS_SOURCE = 'leads-source';
const LS_STATUS = 'leads-status';
const LS_COLS = 'leads-cols-v2';

const STATUS_ORDER: Record<string, number> = Object.fromEntries(LEAD_STATUSES.map((s, i) => [s.key, i]));
const SOURCE_ORDER: Record<string, number> = Object.fromEntries(LEAD_SOURCES.map((s, i) => [s.key, i]));

// Pill hue per status. Background and text are derived with color-mix against
// the theme variables, so the same rule works in light and dark themes and
// keeps text contrast above 4.5:1 in both.
const STATUS_HUES: Record<LeadStatus, string> = {
  new: '#2563EB',            // blue
  worth_pursuing: '#D97706', // amber
  contacted: '#EA580C',      // orange
  in_talks: '#16A34A',       // green
  passed: '#64748B',         // grey
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function lsRemove(key: string) {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch {}
}

/** Status of a lead, normalised — the column has no CHECK constraint. */
function statusOf(lead: Lead): LeadStatus {
  return isLeadStatus(lead.status) ? lead.status : DEFAULT_LEAD_STATUS;
}

/** Source key of a lead — server supplies source_key, recomputed defensively. */
function sourceOf(lead: Lead): LeadSourceKey {
  return isLeadSourceKey(lead.source_key) ? lead.source_key : leadSourceKey(lead);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusPillStyle(status: LeadStatus): React.CSSProperties {
  const hue = STATUS_HUES[status];
  return {
    background: `color-mix(in srgb, ${hue} 18%, var(--bg-surface))`,
    color: `color-mix(in srgb, ${hue} 50%, var(--text-primary))`,
  };
}

// ─── Page-scoped CSS (hover / focus / pseudo-classes inline styles can't do) ──

const PAGE_CSS = `
.lt-tab{appearance:none;border:none;background:transparent;padding:12px 4px;margin-right:22px;font-size:0.875rem;font-weight:500;color:var(--text-secondary);cursor:pointer;border-bottom:2px solid transparent;display:inline-flex;gap:8px;align-items:center;margin-bottom:-1px}
.lt-tab:hover{color:var(--text-primary)}
.lt-tab-on{color:var(--text-primary);font-weight:600;border-bottom-color:var(--accent)}
.lt-tab-zero{color:var(--text-muted)}
.lt-count{font-size:0.75rem;font-weight:600;background:var(--bg-surface-alt);color:var(--text-secondary);border-radius:999px;padding:2px 8px;font-variant-numeric:tabular-nums}
.lt-tab-zero .lt-count{color:var(--text-muted)}
.lt-tab-on .lt-count{background:var(--accent-dim);color:color-mix(in srgb,var(--accent) 60%,var(--text-primary))}
.lt-chip{appearance:none;font-size:0.8125rem;font-weight:500;padding:5px 12px;border-radius:999px;border:1px solid var(--border-subtle);background:transparent;color:var(--text-secondary);cursor:pointer;display:inline-flex;gap:6px;align-items:center;min-height:32px}
.lt-chip:hover{border-color:var(--border-strong)}
.lt-chip-on{background:var(--text-primary);border-color:var(--text-primary);color:var(--bg-surface)}
.lt-chipn{color:var(--text-muted);font-weight:600;font-variant-numeric:tabular-nums}
.lt-chip-on .lt-chipn{color:color-mix(in srgb,var(--bg-surface) 75%,var(--text-primary))}
.lt-head{background:var(--bg-surface-alt);border-bottom:1px solid var(--border-subtle)}
.lt-hcell{position:relative;overflow:hidden}
.lt-hbtn{display:flex;align-items:center;gap:6px;width:100%;padding:10px 12px;text-align:left;background:none;border:none;color:var(--text-secondary);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap}
button.lt-hbtn{cursor:pointer}
.lt-resize{position:absolute;top:0;right:0;width:4px;height:100%;cursor:col-resize;opacity:0;background:var(--border-strong);transition:opacity .15s}
.lt-hcell:hover .lt-resize{opacity:1}
.lt-lead{border-bottom:1px solid var(--border-subtle)}
.lt-row{cursor:pointer;transition:background .1s}
.lt-row:hover{background:var(--bg-surface-alt)}
.lt-lead-open{background:color-mix(in srgb,var(--accent) 4%,var(--bg-surface));box-shadow:inset 3px 0 0 var(--accent)}
.lt-lead-open .lt-row:hover{background:color-mix(in srgb,var(--accent) 8%,var(--bg-surface))}
.lt-cell{padding:14px 12px;font-size:0.875rem;color:var(--text-primary);min-width:0;overflow:hidden}
.lt-chev{color:var(--text-muted);display:inline-flex;transition:transform .15s}
.lt-chev-open{transform:rotate(90deg);color:var(--accent)}
.lt-pillwrap{position:relative;display:inline-flex;align-items:center;max-width:100%;margin-top:-4px}
.lt-pill{appearance:none;-webkit-appearance:none;font-size:12px;font-weight:600;border-radius:999px;padding:5px 28px 5px 10px;border:1px solid transparent;cursor:pointer;max-width:100%;font-family:inherit}
.lt-pill option{background:var(--bg-surface);color:var(--text-primary)}
.lt-pillarrow{position:absolute;right:10px;pointer-events:none;display:inline-flex}
.lt-statuscell{padding-left:8px;padding-right:8px}
.lt-chevbtn{appearance:none;border:none;background:transparent;padding:0;margin:-6px 0 0 -6px;width:28px;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:inherit}
.lt-chevbtn:hover{background:var(--bg-surface-alt)}
.lt-src{display:inline-block;font-size:12px;font-weight:500;border-radius:6px;padding:3px 8px;border:1px solid var(--border-strong);color:var(--text-secondary);white-space:nowrap}
.lt-src-hi{border-color:color-mix(in srgb,var(--accent) 45%,transparent);color:color-mix(in srgb,var(--accent) 60%,var(--text-primary))}
.lt-muted{color:var(--text-muted)}
.lt-clip{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.lt-ellip{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.lt-trash{appearance:none;border:none;background:transparent;color:var(--text-muted);cursor:pointer;width:32px;height:32px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;margin-top:-6px}
.lt-trash:hover{background:var(--accent-dim);color:var(--accent)}
.lt-btn{appearance:none;font-size:0.8125rem;font-weight:600;padding:8px 16px;border-radius:6px;border:none;background:var(--accent);color:#fff;cursor:pointer;min-height:36px}
.lt-btn:hover:not(:disabled){background:var(--accent-hover)}
.lt-btn:disabled{opacity:.5;cursor:default}
.lt-ghost{appearance:none;font-size:0.8125rem;font-weight:500;padding:8px 14px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-surface);color:var(--text-primary);cursor:pointer;min-height:36px;text-decoration:none;display:inline-flex;align-items:center}
.lt-ghost:hover{border-color:var(--border-strong)}
.lt-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary);margin:0 0 6px;display:block}
.lt-textarea{width:100%;resize:vertical;font:inherit;font-size:0.875rem;color:var(--text-primary);border:1px solid var(--border-subtle);border-radius:6px;padding:8px 12px;background:var(--bg-surface);box-sizing:border-box}
.lt-root input:focus-visible,.lt-root textarea:focus-visible,.lt-root select:focus-visible,.lt-root button:focus-visible,.lt-root a:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.lt-tnum{font-variant-numeric:tabular-nums}
.lt-card{container-type:inline-size}
.lt-vis{position:sticky;left:0;width:100cqw;max-width:100%;box-sizing:border-box}
`;

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

function IconChevronDown({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function SortIcon({ col, sort }: { col: SortCol; sort: { col: SortCol | null; dir: SortDir } }) {
  if (sort.col !== col) return <IconChevronsUpDown />;
  return sort.dir === 'asc'
    ? <IconChevronUp color="var(--accent)" />
    : <IconChevronDown color="var(--accent)" />;
}

function Dash() {
  return <span className="lt-muted">—</span>;
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function LeadsPage() {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  // Shared error banner for row actions. Message carries its own prefix
  // ("Delete failed: …", "Status update failed: …", "Notes save failed: …").
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Settings panel state ─────────────────────────────────────────────────────
  const [leadsEmail, setLeadsEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Table: search / filters / sort / columns ─────────────────────────────────
  // Saved prefs are read from localStorage after mount (not in useState
  // initialisers) so the server render and first client render match.
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<{ col: SortCol | null; dir: SortDir }>({ col: 'date', dir: 'desc' });
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_VISIBLE);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // ── Table: column widths (drag-to-resize) ────────────────────────────────────
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(DEFAULT_WIDTHS);

  // ── Expanded row + notes draft ───────────────────────────────────────────────
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Notes saves in flight, per lead: lead id -> the exact text that was sent.
  // Per lead so opening another row mid-save does not show "Saving…" there.
  const [notesInFlight, setNotesInFlight] = useState<Record<string, string>>({});
  const [notesSaved, setNotesSaved] = useState(false);
  // Mirrors of openId / draft for async callbacks: a notes save that finishes
  // after a different row was opened, or after more typing, must not
  // overwrite the current draft.
  const openIdRef = useRef<string | null>(null);
  useEffect(() => { openIdRef.current = openId; }, [openId]);
  const draftRef = useRef('');
  useEffect(() => { draftRef.current = draft; }, [draft]);
  // Lead id the user chose to keep open (unsaved notes) while filters hide
  // it, so they are not asked again on every keystroke.
  const keptHiddenRef = useRef<string | null>(null);

  // ─── Load saved prefs once on mount ──────────────────────────────────────────
  useEffect(() => {
    // The message filter was removed; drop its stale key. 'leads-cols' is
    // superseded by LS_COLS (see DEFAULT_VISIBLE).
    lsRemove('leads-filter');
    lsRemove('leads-cols');

    const savedSource = lsGet<unknown>(LS_SOURCE, 'all');
    const savedStatus = lsGet<unknown>(LS_STATUS, 'all');
    const savedSort = lsGet<{ col?: unknown; dir?: unknown } | null>(LS_SORT, null);
    const savedCols = lsGet<Record<string, unknown> | null>(LS_COLS, null);

    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration of
       saved prefs from localStorage; must run after mount to avoid an SSR
       hydration mismatch. */
    setSourceFilter(isLeadSourceKey(savedSource) ? savedSource : 'all');
    setStatusFilter(isLeadStatus(savedStatus) ? savedStatus : 'all');
    if (savedSort && typeof savedSort.col === 'string' && SORT_COLS.has(savedSort.col)) {
      setSort({ col: savedSort.col as SortCol, dir: savedSort.dir === 'asc' ? 'asc' : 'desc' });
    }
    if (savedCols && typeof savedCols === 'object') {
      const merged = { ...DEFAULT_VISIBLE };
      for (const c of COLUMNS) {
        if (typeof savedCols[c.key] === 'boolean') merged[c.key] = savedCols[c.key] as boolean;
      }
      setVisibleCols(merged);
    }
    setPrefsLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ─── Persist prefs (only after they have been loaded) ────────────────────────
  useEffect(() => { if (prefsLoaded) lsSet(LS_SORT, sort); }, [prefsLoaded, sort]);
  useEffect(() => { if (prefsLoaded) lsSet(LS_SOURCE, sourceFilter); }, [prefsLoaded, sourceFilter]);
  useEffect(() => { if (prefsLoaded) lsSet(LS_STATUS, statusFilter); }, [prefsLoaded, statusFilter]);
  useEffect(() => { if (prefsLoaded) lsSet(LS_COLS, visibleCols); }, [prefsLoaded, visibleCols]);

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

  // ─── Sort header click handler ────────────────────────────────────────────────
  function handleSortClick(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
  }

  // ─── Column resize — track mousedown on header drag handle ───────────────────
  const startResize = useCallback((e: React.MouseEvent, key: ColKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[key];

    function onMove(ev: MouseEvent) {
      const next = Math.max(60, startW + ev.clientX - startX);
      setColWidths((prev) => ({ ...prev, [key]: next }));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [colWidths]);

  // ─── Expand / collapse a row ─────────────────────────────────────────────────

  const openLead = leads.find((l) => l.id === openId) ?? null;
  const draftDirty = !!openLead && draft.trim() !== (openLead.notes ?? '');
  // Text currently being saved for the open lead (undefined = no save running).
  const openInFlight = openId !== null ? notesInFlight[openId] : undefined;
  const openSaving = openInFlight !== undefined;
  // Edits that have genuinely not been sent: differ from the stored notes AND
  // from the text a running save is sending. Only these warrant "Discard?".
  const draftUnsent = draftDirty && (openInFlight === undefined || draft !== openInFlight);

  /** Returns false if the user chose to keep their unsaved note edits. */
  function confirmDiscardDraft(): boolean {
    if (!draftUnsent) return true;
    return confirm(DISCARD_NOTES_PROMPT);
  }

  function toggleRow(lead: Lead) {
    if (!confirmDiscardDraft()) return;
    setNotesSaved(false);
    if (openId === lead.id) {
      setOpenId(null);
      setDraft('');
    } else {
      setOpenId(lead.id);
      setDraft(lead.notes ?? '');
    }
  }

  // ─── Delete a lead ────────────────────────────────────────────────────────────
  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead from ${lead.first_name} ${lead.last_name} (${lead.email})? This cannot be undone.`)) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/contact/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setActionError(`Delete failed: ${d.error ?? `Error ${res.status}`}`);
        return;
      }
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (openId === lead.id) {
        setOpenId(null);
        setDraft('');
      }
    } catch (err) {
      setActionError(`Delete failed: ${err instanceof Error ? err.message : 'request failed'}`);
    }
  }

  // ─── Change a lead's status (optimistic) ─────────────────────────────────────
  async function handleStatusChange(lead: Lead, next: LeadStatus) {
    const prevStatus = statusOf(lead);
    if (next === prevStatus) return;
    setActionError(null);
    // Update the screen first, then persist.
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: next } : l)));
    try {
      const res = await fetch(`/api/contact/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
      const u = d.data as Pick<Lead, 'status' | 'status_changed_at' | 'status_changed_by'>;
      // Apply the reply only if the lead still shows the status this request
      // sent — a newer change made meanwhile must not be overwritten.
      setLeads((prev) => prev.map((l) => (l.id === lead.id && l.status === next
        ? { ...l, status: u.status, status_changed_at: u.status_changed_at, status_changed_by: u.status_changed_by }
        : l)));
    } catch (err) {
      // Roll back — but only if nothing else has changed the status since.
      setLeads((prev) => prev.map((l) => (l.id === lead.id && l.status === next ? { ...l, status: prevStatus } : l)));
      setActionError(`Status update failed: ${err instanceof Error ? err.message : 'request failed'}`);
    }
  }

  // ─── Save notes for the open lead ────────────────────────────────────────────
  async function handleSaveNotes() {
    if (!openLead || notesInFlight[openLead.id] !== undefined) return;
    const leadId = openLead.id;
    const sent = draft;
    setNotesInFlight((prev) => ({ ...prev, [leadId]: sent }));
    setActionError(null);
    try {
      const res = await fetch(`/api/contact/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: sent }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Error ${res.status}`);
      const saved = (d.data?.notes ?? null) as string | null;
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes: saved } : l)));
      // Only replace the draft if this lead is still open AND nothing was
      // typed since the save started; otherwise keep the newer text and do
      // not claim "Saved".
      if (openIdRef.current === leadId && draftRef.current === sent) {
        setDraft(saved ?? '');
        setNotesSaved(true);
      }
    } catch (err) {
      setActionError(`Notes save failed: ${err instanceof Error ? err.message : 'request failed'}`);
    } finally {
      setNotesInFlight((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
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

  function clearFilters() {
    setSourceFilter('all');
    setStatusFilter('all');
    setSearch('');
  }

  // ─── Filter + search + sort pipeline (faceted counts) ────────────────────────

  const q = search.trim().toLowerCase();

  const searched = leads.filter((l) => {
    if (!q) return true;
    return [
      l.first_name, l.last_name, l.email, l.company, l.show_title,
      l.message, l.notes, l.material_title,
    ].some((v) => (v ?? '').toLowerCase().includes(q));
  });

  // Source counts respect status + search; status counts respect source + search.
  const bySource = searched.filter((l) => sourceFilter === 'all' || sourceOf(l) === sourceFilter);
  const byStatus = searched.filter((l) => statusFilter === 'all' || statusOf(l) === statusFilter);

  const sourceTabs: { key: SourceFilter; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: byStatus.length },
    ...LEAD_SOURCES.map((s) => ({ key: s.key, label: s.label, n: byStatus.filter((l) => sourceOf(l) === s.key).length })),
  ];
  const statusChips: { key: StatusFilter; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: bySource.length },
    ...LEAD_STATUSES.map((s) => ({ key: s.key, label: s.label, n: bySource.filter((l) => statusOf(l) === s.key).length })),
  ];

  const filtered = bySource
    .filter((l) => statusFilter === 'all' || statusOf(l) === statusFilter)
    .sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      switch (sort.col) {
        case 'name':
          return dir * (a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
        case 'status':
          return dir * (STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)]) || b.created_at - a.created_at;
        case 'source':
          return dir * (SOURCE_ORDER[sourceOf(a)] - SOURCE_ORDER[sourceOf(b)]) || b.created_at - a.created_at;
        case 'email':
          return dir * a.email.localeCompare(b.email);
        case 'company':
          return dir * ((a.company ?? '').localeCompare(b.company ?? ''));
        case 'message':
          return dir * ((a.message?.length ?? 0) - (b.message?.length ?? 0));
        case 'notes':
          return dir * ((a.notes ?? '').localeCompare(b.notes ?? ''));
        case 'date':
        default:
          return dir * (a.created_at - b.created_at);
      }
    });

  // ─── Close the open row when filters / search hide it ────────────────────────
  // Same discard prompt as everywhere else; if the user cancels, the row stays
  // open (hidden) and we do not ask again until it is visible again.
  const openVisible = openId !== null && filtered.some((l) => l.id === openId);
  useEffect(() => {
    if (openId === null || openVisible) {
      keptHiddenRef.current = null;
      return;
    }
    if (loading || keptHiddenRef.current === openId) return;
    if (draftUnsent && !confirm(DISCARD_NOTES_PROMPT)) {
      keptHiddenRef.current = openId;
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- closing a row that
       a filter change just hid; depends on derived visibility, not an event. */
    setOpenId(null);
    setDraft('');
    setNotesSaved(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [openId, openVisible, draftUnsent, loading]);

  const activeFilterParts: string[] = [];
  if (sourceFilter !== 'all') activeFilterParts.push(`Source: ${leadSourceLabel(sourceFilter)}`);
  if (statusFilter !== 'all') activeFilterParts.push(`Status: ${leadStatusLabel(statusFilter)}`);
  if (q) activeFilterParts.push(`Search: “${search.trim()}”`);

  // ─── Grid template from visible columns + widths ─────────────────────────────
  // Hidden columns are not rendered at all, so they must not get a grid track.
  // Flexible columns (Message, Notes) use their width as a minimum and share
  // the spare space; resizing one raises its minimum. If none of the flexible
  // columns is shown, the last fixed column absorbs the spare width so the
  // header and rows still span the card.
  const shownCols = COLUMNS.filter((c) => visibleCols[c.key]);
  const anyFlexShown = shownCols.some((c) => FLEX_COLS[c.key]);
  const gridCols = [
    `${CHEVRON_WIDTH}px`,
    ...shownCols.map((c, i) => {
      const fr = FLEX_COLS[c.key] ?? (!anyFlexShown && i === shownCols.length - 1 ? 1 : 0);
      return fr ? `minmax(${colWidths[c.key]}px, ${fr}fr)` : `${colWidths[c.key]}px`;
    }),
    `${ACTIONS_WIDTH}px`,
  ].join(' ');
  // Sum of every track's minimum: below this the table scrolls sideways.
  const tableMinWidth = CHEVRON_WIDTH + ACTIONS_WIDTH + shownCols.reduce((sum, c) => sum + colWidths[c.key], 0);

  // ─── Shared styles ────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
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

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lt-root" style={{ maxWidth: 1400 }}>
      <style>{PAGE_CSS}</style>

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

      {/* ── Table card ── a size container, so the detail area and empty
          states can be sized to the card's visible width (100cqw) even when
          the table itself is wider and scrolls sideways. */}
      <div className="lt-card" style={cardStyle}>

        {/* Source tabs */}
        <div
          role="tablist"
          aria-label="Filter by form"
          className="flex flex-wrap"
          style={{ padding: '0 20px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          {sourceTabs.map((t) => {
            const on = sourceFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                className={`lt-tab${on ? ' lt-tab-on' : ''}${t.n === 0 ? ' lt-tab-zero' : ''}`}
                onClick={() => setSourceFilter(t.key)}
              >
                {t.label} <span className="lt-count">{t.n}</span>
              </button>
            );
          })}
        </div>

        {/* Controls bar: search + status chips + column selector */}
        <div className="flex items-center gap-3 flex-wrap" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            aria-label="Search leads"
            style={{ ...inputStyle, minWidth: 220 }}
          />

          <span className="text-xs lt-tnum" style={{ color: 'var(--text-secondary)' }}>
            {filtered.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </span>

          <div style={{ flex: 1 }} />

          {/* Label + chips are one unit, so the label never wraps away from
              its chips; the whole unit moves to a new line instead. */}
          <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase shrink-0" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            Status
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusChips.map((c) => {
              const on = statusFilter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  className={`lt-chip${on ? ' lt-chip-on' : ''}`}
                  onClick={() => setStatusFilter(c.key)}
                >
                  {c.label} <span className="lt-chipn">{c.n}</span>
                </button>
              );
            })}
          </div>
          </div>

          {/* Column selector */}
          <div style={{ position: 'relative' }} ref={colSelectorRef}>
            <button
              onClick={() => setColSelectorOpen((o) => !o)}
              title="Show/hide columns"
              aria-label="Show/hide columns"
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
                  minWidth: 150,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                }}
              >
                {COLUMNS.map(({ key, label }) => (
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
                      checked={visibleCols[key]}
                      onChange={(e) => setVisibleCols((prev) => ({ ...prev, [key]: e.target.checked }))}
                      style={{ cursor: 'pointer' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action error banner (delete / status / notes) */}
        {actionError && (
          <div className="px-5 py-2 text-sm" style={{ color: 'var(--error, #ef4444)', borderBottom: '1px solid var(--border-subtle)' }}>
            {actionError}
          </div>
        )}

        {/* Table — CSS Grid. The header row is NOT sticky: the window is the
            vertical scroller here (layout.tsx's wrapper is min-h-screen, so
            <main> never scrolls), and this box must not scroll vertically
            either (no max-height). It scrolls sideways only, so on windows
            narrower than tableMinWidth wide content stays inside the card. */}
        <div style={{ overflowX: 'auto', borderRadius: '0 0 10px 10px' }}>
          <div style={{ minWidth: tableMinWidth, background: 'var(--bg-surface)', borderRadius: '0 0 10px 10px' }}>

            {/* Header row */}
            <div className="lt-head" style={{ display: 'grid', gridTemplateColumns: gridCols }}>
              <div />
              {shownCols.map((c) => (
                <div key={c.key} className="lt-hcell">
                  {c.sort ? (
                    <button type="button" className="lt-hbtn" onClick={() => handleSortClick(c.sort!)}>
                      {c.label} <SortIcon col={c.sort} sort={sort} />
                    </button>
                  ) : (
                    <div className="lt-hbtn">{c.label}</div>
                  )}
                  <div className="lt-resize" onMouseDown={(e) => startResize(e, c.key)} />
                </div>
              ))}
              <div />
            </div>

            {loading && (
              <div className="lt-vis px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Loading leads…
              </div>
            )}

            {!loading && leads.length === 0 && (
              <div className="lt-vis px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No leads yet.
              </div>
            )}

            {!loading && leads.length > 0 && filtered.length === 0 && (
              <div className="lt-vis flex flex-col items-center text-center" style={{ padding: '48px 20px', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  No leads match these filters
                </p>
                {activeFilterParts.length > 0 && (
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                    {activeFilterParts.join(' · ')}
                  </p>
                )}
                <button type="button" className="lt-ghost" onClick={clearFilters}>Clear filters</button>
              </div>
            )}

            {!loading && filtered.map((lead) => {
              const isOpen = openId === lead.id;
              return (
                <div key={lead.id} className={`lt-lead${isOpen ? ' lt-lead-open' : ''}`}>
                    <LeadRow
                      lead={lead}
                      gridCols={gridCols}
                      shownCols={shownCols}
                      isOpen={isOpen}
                      onToggle={toggleRow}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                    {isOpen && (
                      <LeadDetail
                        lead={lead}
                        draft={draft}
                        saving={openSaving}
                        saved={notesSaved}
                        dirty={draftDirty}
                        onDraftChange={(v) => { setDraft(v); setNotesSaved(false); }}
                        onSave={handleSaveNotes}
                      />
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LeadRow ──────────────────────────────────────────────────────────────────

interface LeadRowProps {
  lead: Lead;
  gridCols: string;
  shownCols: ColDef[];
  isOpen: boolean;
  onToggle: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (lead: Lead, next: LeadStatus) => void;
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

function LeadRow({ lead, gridCols, shownCols, isOpen, onToggle, onDelete, onStatusChange }: LeadRowProps) {
  const status = statusOf(lead);
  const source = sourceOf(lead);
  const name = `${lead.first_name} ${lead.last_name}`;

  function cell(key: ColKey) {
    switch (key) {
      case 'name':
        return (
          <div key={key} className="lt-cell" style={{ fontWeight: 600 }}>
            <span className="lt-ellip" title={name}>{name}</span>
          </div>
        );
      case 'status':
        return (
          <div key={key} className="lt-cell lt-statuscell">
            <span className="lt-pillwrap">
              <select
                className="lt-pill"
                style={statusPillStyle(status)}
                value={status}
                aria-label={`Status for ${name}`}
                onClick={stop}
                onKeyDown={stop}
                onChange={(e) => {
                  if (isLeadStatus(e.target.value)) onStatusChange(lead, e.target.value);
                }}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <span className="lt-pillarrow" style={{ color: statusPillStyle(status).color }}>
                <IconChevronDown color="currentColor" size={10} />
              </span>
            </span>
          </div>
        );
      case 'source': {
        const hi = source === 'pitch' || source === 'work-with-us';
        return (
          <div key={key} className="lt-cell">
            <span className={`lt-src${hi ? ' lt-src-hi' : ''}`}>{leadSourceLabel(source)}</span>
          </div>
        );
      }
      case 'email':
        return (
          <div key={key} className="lt-cell">
            <a
              href={`mailto:${lead.email}`}
              className="lt-ellip"
              title={lead.email}
              onClick={stop}
              onKeyDown={stop}
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              {lead.email}
            </a>
          </div>
        );
      case 'company':
        return (
          <div key={key} className="lt-cell">
            {lead.company
              ? <span className="lt-ellip" title={lead.company} style={{ color: 'var(--text-secondary)' }}>{lead.company}</span>
              : <Dash />}
          </div>
        );
      case 'show':
        return (
          <div key={key} className="lt-cell">
            {lead.available_title_id
              ? <span className="lt-ellip" title={lead.show_title ?? 'Package Request'} style={{ color: 'var(--accent)' }}>{lead.show_title ?? 'Package Request'}</span>
              : <Dash />}
          </div>
        );
      case 'message':
        return (
          <div key={key} className="lt-cell">
            {lead.message
              ? <span className="lt-clip" style={{ color: 'var(--text-secondary)' }}>{lead.message}</span>
              : <Dash />}
          </div>
        );
      case 'notes':
        return (
          <div key={key} className="lt-cell">
            {lead.notes ? <span className="lt-clip">{lead.notes}</span> : <Dash />}
          </div>
        );
      case 'date':
        return (
          <div key={key} className="lt-cell lt-tnum" style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
            {formatDate(lead.created_at)}
          </div>
        );
    }
  }

  return (
    <div
      className="lt-row"
      style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'start' }}
      // Mouse convenience only: clicking anywhere on the row toggles it. The
      // keyboard / screen-reader control is the chevron <button> below, so
      // the row itself carries no role (it contains a select, link, button).
      onClick={() => onToggle(lead)}
    >
      <div className="lt-cell" style={{ paddingRight: 0 }}>
        <button
          type="button"
          className="lt-chevbtn"
          aria-expanded={isOpen}
          aria-label={`Show submission for ${name}`}
          onClick={(e) => { e.stopPropagation(); onToggle(lead); }}
        >
          <span className={`lt-chev${isOpen ? ' lt-chev-open' : ''}`}><IconChevronRight /></span>
        </button>
      </div>

      {shownCols.map((c) => cell(c.key))}

      <div className="lt-cell" style={{ display: 'flex', justifyContent: 'center', paddingLeft: 6, paddingRight: 6 }}>
        <button
          type="button"
          className="lt-trash"
          title="Delete lead"
          aria-label={`Delete lead from ${name}`}
          onClick={(e) => { e.stopPropagation(); onDelete(lead); }}
          onKeyDown={stop}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ─── LeadDetail — the expanded area under an open row ─────────────────────────

interface LeadDetailProps {
  lead: Lead;
  draft: string;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
}

function LeadDetail({ lead, draft, saving, saved, dirty, onDraftChange, onSave }: LeadDetailProps) {
  const hasSubmission =
    !!(lead.material_title || lead.material_nature || lead.material_link || lead.phone || lead.release_accepted);

  const changedLine = lead.status_changed_at
    ? `Status changed ${formatDate(lead.status_changed_at)}${lead.status_changed_by ? ` by ${lead.status_changed_by}` : ''}`
    : 'Status never changed';

  const notesId = `lead-notes-${lead.id}`;

  return (
    // lt-vis: sized to the card's visible width and pinned to its left edge,
    // so the notes box is never off-screen when the table scrolls sideways.
    <div
      className="lt-vis"
      style={{
        padding: '4px 24px 24px 48px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        gap: 28,
        cursor: 'default',
      }}
    >
      {/* Left: full submission */}
      <div className="flex flex-col" style={{ gap: 18 }}>
        <div>
          <p className="lt-label">Full submission</p>
          {lead.message ? (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--text-primary)', whiteSpace: 'pre-line', maxWidth: '72ch', wordBreak: 'break-word' }}>
              {lead.message}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 15 }}><Dash /></p>
          )}
        </div>

        {hasSubmission && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
              padding: 16,
              background: 'var(--bg-surface-alt)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
            }}
          >
            <DetailField label="Project title" value={lead.material_title} />
            <DetailField label="Format / Nature" value={lead.material_nature} />
            {lead.material_pages != null && (
              <DetailField label="Pages" value={String(lead.material_pages)} />
            )}
            <DetailField label="Phone" value={lead.phone} />
            <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
              <p className="lt-label">Materials</p>
              {lead.material_link ? (
                <a
                  href={lead.material_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 14, color: 'var(--accent)', wordBreak: 'break-all' }}
                >
                  {lead.material_link}
                </a>
              ) : (
                <p style={{ margin: 0, fontSize: 14 }}><Dash /></p>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
              <p className="lt-label">Release</p>
              {lead.release_accepted ? (
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: `color-mix(in srgb, ${STATUS_HUES.in_talks} 50%, var(--text-primary))` }}>
                  ✓ Signed
                  {lead.release_signature ? ` by ${lead.release_signature}` : ''}
                  {lead.release_accepted_at ? ` on ${formatDate(lead.release_accepted_at)}` : ''}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 14 }}><Dash /></p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <a className="lt-ghost" href={`mailto:${lead.email}`}>Reply by email</a>
        </div>
      </div>

      {/* Right: notes */}
      <div className="flex flex-col" style={{ gap: 10 }}>
        <label className="lt-label" htmlFor={notesId} style={{ margin: 0 }}>Notes</label>
        <textarea
          id={notesId}
          className="lt-textarea"
          rows={5}
          maxLength={LEAD_NOTES_MAX}
          placeholder="Why it's worth pursuing, who you spoke to, next step…"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (dirty && !saving) onSave();
            }
          }}
        />
        <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
          <button type="button" className="lt-btn" onClick={onSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save notes'}
          </button>
          {saved && !dirty && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Saved</span>
          )}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{changedLine}</p>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p className="lt-label">{label}</p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
        {value || <Dash />}
      </p>
    </div>
  );
}
