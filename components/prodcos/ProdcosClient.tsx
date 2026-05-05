'use client';
// ProdcosClient — search + multi-filter + sortable, resizable, column-selectable table for the prodcos directory.
// Receives all production companies as a prop (server-fetched) and filters/sorts in-memory.
// All filter, sort, column visibility, and column width state is persisted to localStorage.

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';
import type { ProductionCompany, ProdcoStrategicTag, ProdcoOwnership } from '@/types';

type StrategicFilter = 'all' | ProdcoStrategicTag;
type OwnershipFilter = 'all' | ProdcoOwnership;
type CountryFilter = 'all' | 'CA' | 'US' | 'UK';
type ContactedFilter = 'all' | 'yes' | 'no';
type CmpaFilter = 'all' | 'yes' | 'no';

const STRATEGIC_FILTERS: { value: StrategicFilter; label: string }[] = [
  { value: 'all',                label: 'All' },
  { value: 'co_pro_partner',     label: 'Co-Pro Partner' },
  { value: 'acquisition_target', label: 'Acquisition Target' },
  { value: 'competitor',         label: 'Competitor' },
  { value: 'watch_list',         label: 'Watch List' },
];

const OWNERSHIP_FILTERS: { value: OwnershipFilter; label: string }[] = [
  { value: 'all',           label: 'All' },
  { value: 'independent',   label: 'Independent' },
  { value: 'studio_owned',  label: 'Studio-Owned' },
  { value: 'network_owned', label: 'Network-Owned' },
];

const COUNTRY_FILTERS: { value: CountryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'CA',  label: 'Canada' },
  { value: 'US',  label: 'US' },
  { value: 'UK',  label: 'UK' },
];

const CONTACTED_FILTERS: { value: ContactedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Contacted' },
  { value: 'no',  label: 'Not Contacted' },
];

const CMPA_FILTERS: { value: CmpaFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'CMPA Members' },
  { value: 'no',  label: 'Non-Members' },
];

interface ProdcoFormState {
  name: string;
  ownership_type: ProdcoOwnership;
  strategic_tag: ProdcoStrategicTag;
  hq_city: string;
  parent_company: string;
  website: string;
  genres: string;
  notes: string;
  bio: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  linkedin_url: string;
  twitter_url: string;
  organization_type: string;
  contact_status: string;
}

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

function strategicTagVariant(tag: ProdcoStrategicTag | null): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (!tag) return 'muted';
  if (tag === 'co_pro_partner')     return 'greenlit';
  if (tag === 'acquisition_target') return 'inreview';
  if (tag === 'competitor')         return 'pass';
  return 'muted';
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseGenres(genres: string | null): string[] {
  if (!genres) return [];
  try {
    const arr = JSON.parse(genres);
    return Array.isArray(arr) ? arr.map(String) : [String(arr)];
  } catch {
    return genres ? [genres] : [];
  }
}

function truncateList(items: string[], max = 2): string {
  if (items.length === 0) return '—';
  const shown = items.slice(0, max).join(' · ');
  if (items.length > max) return `${shown} +${items.length - max} more`;
  return shown;
}

function countryBadgeStyle(country: string | null): React.CSSProperties {
  if (country === 'CA') return { background: '#1a4fa0', color: '#fff' };
  if (country === 'US') return { background: '#8a5a00', color: '#fff' };
  if (country === 'UK') return { background: '#5a1a8a', color: '#fff' };
  return { background: 'var(--bg-elevated)', color: 'var(--text-muted)' };
}

// Returns hq_city if set, otherwise the first segment of region, otherwise '—'.
function cityOrRegion(hq_city: string | null, region: string | null): string {
  if (hq_city) return hq_city;
  if (region) return region.split(' - ')[0];
  return '—';
}

// Column definition type — drives header rendering, resize, visibility, and cell mapping.
interface ColDef { key: string; label: string; defaultWidth: number; hideable: boolean; defaultVisible: boolean; }

const COLUMN_DEFS: ColDef[] = [
  { key: 'name',             label: 'Name',          defaultWidth: 220, hideable: false, defaultVisible: true  },
  { key: 'country',          label: 'Country',       defaultWidth: 70,  hideable: true,  defaultVisible: true  },
  { key: 'city',             label: 'City / Region', defaultWidth: 130, hideable: true,  defaultVisible: true  },
  { key: 'current_shows',    label: 'Current Shows', defaultWidth: 200, hideable: true,  defaultVisible: true  },
  { key: 'current_networks', label: 'Networks',      defaultWidth: 150, hideable: true,  defaultVisible: true  },
  { key: 'genres',           label: 'Genres',        defaultWidth: 150, hideable: true,  defaultVisible: true  },
  { key: 'strategic_tag',    label: 'Strategic Tag', defaultWidth: 140, hideable: true,  defaultVisible: true  },
  { key: 'contact_status',   label: 'Contacted',     defaultWidth: 90,  hideable: true,  defaultVisible: true  },
];

// Helpers to build initial state from COLUMN_DEFS defaults.
function buildDefaultVisibleCols() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultVisible])); }
function buildDefaultWidths() { return Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultWidth])); }

interface ProdcosClientProps {
  initialProdcos: ProductionCompany[];
}

export default function ProdcosClient({ initialProdcos }: ProdcosClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [strategicFilter, setStrategicFilter] = useState<StrategicFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [countryFilter, setCountryFilter]     = useState<CountryFilter>('all');
  const [contactedFilter, setContactedFilter] = useState<ContactedFilter>('all');
  const [cmpaFilter, setCmpaFilter]           = useState<CmpaFilter>('all');

  const [prodcos, setProdcos] = useState<ProductionCompany[]>(initialProdcos);

  const [editingProdco, setEditingProdco] = useState<ProductionCompany | null>(null);
  const [formState, setFormState] = useState<ProdcoFormState>({
    name: '',
    ownership_type: 'independent',
    strategic_tag: 'watch_list',
    hq_city: '',
    parent_company: '',
    website: '',
    genres: '',
    notes: '',
    bio: '',
    email: '',
    phone: '',
    country: '',
    region: '',
    linkedin_url: '',
    twitter_url: '',
    organization_type: '',
    contact_status: 'N',
  });
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Sort state, column visibility, column widths, column selector open/closed.
  const [sort, setSort]                       = useState<{ col: string | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });
  const [visibleCols, setVisibleCols]         = useState<Record<string, boolean>>(buildDefaultVisibleCols());
  const [colWidths, setColWidths]             = useState<Record<string, number>>(buildDefaultWidths());
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const colSelectorRef = useRef<HTMLDivElement>(null);

  // Rehydrate all persisted state from localStorage on mount.
  useEffect(() => {
    try { const s = localStorage.getItem('prodcos-sort');   if (s) { const p = JSON.parse(s); if (p?.col !== undefined) setSort(p); } } catch { /* ignore */ }
    try { const c = localStorage.getItem('prodcos-cols');   if (c) { const p = JSON.parse(c); if (p) setVisibleCols(p); } }            catch { /* ignore */ }
    try { const w = localStorage.getItem('prodcos-widths'); if (w) { const p = JSON.parse(w); if (p) setColWidths(p); } }              catch { /* ignore */ }
  }, []);

  // Persist state changes to localStorage.
  useEffect(() => { localStorage.setItem('prodcos-sort',   JSON.stringify(sort)); },       [sort]);
  useEffect(() => { localStorage.setItem('prodcos-cols',   JSON.stringify(visibleCols)); }, [visibleCols]);
  useEffect(() => { localStorage.setItem('prodcos-widths', JSON.stringify(colWidths)); },  [colWidths]);

  // Close column selector when clicking outside it.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) setColSelectorOpen(false);
    }
    if (colSelectorOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colSelectorOpen]);

  // Apply all active filters and search query.
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return prodcos.filter((p) => {
      if (strategicFilter !== 'all' && p.strategic_tag !== strategicFilter) return false;
      if (ownershipFilter !== 'all' && p.ownership_type !== ownershipFilter) return false;
      if (countryFilter !== 'all' && p.country !== countryFilter) return false;
      if (contactedFilter === 'yes' && p.contact_status !== 'Y') return false;
      if (contactedFilter === 'no' && p.contact_status === 'Y') return false;
      if (cmpaFilter === 'yes' && !p.is_cmpa_member) return false;
      if (cmpaFilter === 'no' && p.is_cmpa_member) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.hq_city ?? '').toLowerCase().includes(q) ||
        (p.region ?? '').toLowerCase().includes(q) ||
        (p.bio ?? '').toLowerCase().includes(q) ||
        (p.current_shows ?? '').toLowerCase().includes(q) ||
        (p.current_networks ?? '').toLowerCase().includes(q) ||
        (p.genres ?? '').toLowerCase().includes(q) ||
        (p.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [prodcos, search, strategicFilter, ownershipFilter, countryFilter, contactedFilter, cmpaFilter]);

  // Apply column sort on top of the filtered results.
  // The 'city' key is virtual — it sorts on the resolved cityOrRegion() value.
  const sorted = useMemo(() => {
    if (!sort.col) return filtered;
    return [...filtered].sort((a, b) => {
      const getVal = (p: ProductionCompany) => {
        if (sort.col === 'city') return cityOrRegion(p.hq_city, p.region);
        return (p as unknown as Record<string, unknown>)[sort.col!];
      };
      const av = getVal(a); const bv = getVal(b);
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

  function openEdit(e: React.MouseEvent, prodco: ProductionCompany) {
    e.stopPropagation();
    setEditingProdco(prodco);
    setFormState({
      name: prodco.name,
      ownership_type: prodco.ownership_type,
      strategic_tag: prodco.strategic_tag,
      hq_city: prodco.hq_city ?? '',
      parent_company: prodco.parent_company ?? '',
      website: prodco.website ?? '',
      genres: prodco.genres ?? '',
      notes: prodco.notes ?? '',
      bio: prodco.bio ?? '',
      email: prodco.email ?? '',
      phone: prodco.phone ?? '',
      country: prodco.country ?? '',
      region: prodco.region ?? '',
      linkedin_url: prodco.linkedin_url ?? '',
      twitter_url: prodco.twitter_url ?? '',
      organization_type: prodco.organization_type ?? '',
      contact_status: prodco.contact_status ?? 'N',
    });
    setSaveError(null);
  }

  async function handleSave() {
    if (!editingProdco) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/prodcos/${editingProdco.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setProdcos((prev) =>
        prev.map((p) => (p.id === editingProdco.id ? { ...p, ...formState } : p))
      );
      setEditingProdco(null);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const PILL_BTN = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
    transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
  });

  // Only render columns that are currently visible; append fixed 40px edit column.
  const visibleDefs = COLUMN_DEFS.filter(c => visibleCols[c.key] !== false);
  const gridCols = [
    ...visibleDefs.map(c => `${colWidths[c.key] ?? c.defaultWidth}px`),
    '40px', // edit button column
  ].join(' ');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {/* Top row: search + count + column selector */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search companies, cities, bio, shows, notes…"
              value={search}
              onChange={setSearch}
            />
          </div>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {sorted.length} of {prodcos.length} companies
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

        {/* Filter chip rows — unchanged from original */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Strategic:
          </span>
          {STRATEGIC_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStrategicFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={PILL_BTN(strategicFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Ownership:
          </span>
          {OWNERSHIP_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setOwnershipFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={PILL_BTN(ownershipFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Country:
          </span>
          {COUNTRY_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCountryFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={PILL_BTN(countryFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Contacted:
          </span>
          {CONTACTED_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setContactedFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={PILL_BTN(contactedFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            CMPA:
          </span>
          {CMPA_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCmpaFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={f.value === 'yes' && cmpaFilter === 'yes'
                ? { background: '#0d6e6e', color: '#5eead4', borderColor: '#0d6e6e', transition: 'background var(--motion-base) var(--ease)' }
                : PILL_BTN(cmpaFilter === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
          {/* Fixed edit column header — no sort, no resize */}
          <div style={{ padding: '10px 16px' }} />
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No production companies match your search
          </div>
        ) : (
          sorted.map((prodco) => {
            const shows    = parseJsonArray(prodco.current_shows);
            const networks = parseJsonArray(prodco.current_networks);
            const genres   = parseGenres(prodco.genres);

            return (
              <div
                key={prodco.id}
                className="grid items-center border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--bg-surface-alt)]"
                style={{
                  gridTemplateColumns: gridCols,
                  transition: 'background var(--motion-base) var(--ease)',
                }}
                onClick={() => router.push(`/market/prodcos/${prodco.id}`)}
                onMouseEnter={() => setHoveredRowId(prodco.id)}
                onMouseLeave={() => setHoveredRowId(null)}
              >
                {/* Render only visible columns, switching on col.key to preserve per-cell render logic */}
                {visibleDefs.map((col) => {
                  if (col.key === 'name') return (
                    <span key="name" className="flex items-center gap-1.5 min-w-0" style={{ padding: '12px 16px' }}>
                      <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {prodco.name}
                      </span>
                      {!!prodco.is_cmpa_member && (
                        <span
                          className="shrink-0 px-1.5 py-0.5 text-xs rounded font-bold"
                          style={{ background: '#0d6e6e', color: '#5eead4', letterSpacing: '0.04em' }}
                        >
                          CMPA
                        </span>
                      )}
                    </span>
                  );
                  if (col.key === 'country') return (
                    <span key="country" style={{ padding: '12px 16px' }}>
                      {prodco.country ? (
                        <span
                          className="px-1.5 py-0.5 text-xs rounded font-bold"
                          style={countryBadgeStyle(prodco.country)}
                        >
                          {prodco.country}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </span>
                  );
                  if (col.key === 'city') return (
                    <span key="city" className="text-xs truncate" style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {cityOrRegion(prodco.hq_city, prodco.region)}
                    </span>
                  );
                  if (col.key === 'current_shows') return (
                    <span key="current_shows" className="text-xs truncate pr-2" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {truncateList(shows)}
                    </span>
                  );
                  if (col.key === 'current_networks') return (
                    <span key="current_networks" className="text-xs truncate pr-2" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {truncateList(networks)}
                    </span>
                  );
                  if (col.key === 'genres') return (
                    <span key="genres" className="text-xs truncate pr-2" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {truncateList(genres)}
                    </span>
                  );
                  if (col.key === 'strategic_tag') return (
                    <span key="strategic_tag" style={{ padding: '12px 16px' }}>
                      <Badge
                        label={prodco.strategic_tag?.replace(/_/g, ' ') ?? '—'}
                        variant={strategicTagVariant(prodco.strategic_tag)}
                      />
                    </span>
                  );
                  if (col.key === 'contact_status') return (
                    <span key="contact_status" className="flex items-center gap-1 text-xs" style={{ padding: '12px 16px' }}>
                      {prodco.contact_status === 'Y' ? (
                        <>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#22c55e',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>Yes</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </span>
                  );
                  return null;
                })}

                {/* Fixed edit button — always rendered regardless of column visibility */}
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
                  <button
                    onClick={(e) => openEdit(e, prodco)}
                    title="Edit company"
                    style={{
                      padding: '4px 6px',
                      borderRadius: 4,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: hoveredRowId === prodco.id ? 'var(--accent)' : 'var(--text-muted)',
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
            );
          })
        )}
      </div>

      <Modal
        isOpen={editingProdco !== null}
        onClose={() => { setEditingProdco(null); setSaveError(null); }}
        title={editingProdco?.name ?? 'Edit Company'}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Name</label>
          <input type="text" value={formState.name} onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Ownership Type</label>
          <select value={formState.ownership_type} onChange={(e) => setFormState((p) => ({ ...p, ownership_type: e.target.value as ProdcoOwnership }))} style={FIELD_STYLE}>
            <option value="independent">Independent</option>
            <option value="studio_owned">Studio-Owned</option>
            <option value="network_owned">Network-Owned</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Strategic Tag</label>
          <select value={formState.strategic_tag} onChange={(e) => setFormState((p) => ({ ...p, strategic_tag: e.target.value as ProdcoStrategicTag }))} style={FIELD_STYLE}>
            <option value="co_pro_partner">Co-Pro Partner</option>
            <option value="acquisition_target">Acquisition Target</option>
            <option value="competitor">Competitor</option>
            <option value="watch_list">Watch List</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>HQ City</label>
          <input type="text" value={formState.hq_city} onChange={(e) => setFormState((p) => ({ ...p, hq_city: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Parent Company</label>
          <input type="text" value={formState.parent_company} onChange={(e) => setFormState((p) => ({ ...p, parent_company: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Website</label>
          <input type="text" value={formState.website} onChange={(e) => setFormState((p) => ({ ...p, website: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Genres</label>
          <input type="text" value={formState.genres} onChange={(e) => setFormState((p) => ({ ...p, genres: e.target.value }))} placeholder="Comma-separated or JSON array" style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Notes</label>
          <textarea rows={3} value={formState.notes} onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))} style={{ ...FIELD_STYLE, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Bio</label>
          <textarea rows={4} value={formState.bio} onChange={(e) => setFormState((p) => ({ ...p, bio: e.target.value }))} style={{ ...FIELD_STYLE, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Email</label>
          <input type="text" value={formState.email} onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Phone</label>
          <input type="text" value={formState.phone} onChange={(e) => setFormState((p) => ({ ...p, phone: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Country</label>
          <input type="text" value={formState.country} onChange={(e) => setFormState((p) => ({ ...p, country: e.target.value }))} placeholder="CA / US / UK" style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Region</label>
          <input type="text" value={formState.region} onChange={(e) => setFormState((p) => ({ ...p, region: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>LinkedIn URL</label>
          <input type="text" value={formState.linkedin_url} onChange={(e) => setFormState((p) => ({ ...p, linkedin_url: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Twitter URL</label>
          <input type="text" value={formState.twitter_url} onChange={(e) => setFormState((p) => ({ ...p, twitter_url: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Organization Type</label>
          <input type="text" value={formState.organization_type} onChange={(e) => setFormState((p) => ({ ...p, organization_type: e.target.value }))} style={FIELD_STYLE} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Contact Status</label>
          <select value={formState.contact_status} onChange={(e) => setFormState((p) => ({ ...p, contact_status: e.target.value }))} style={FIELD_STYLE}>
            <option value="N">Not Contacted (N)</option>
            <option value="Y">Contacted (Y)</option>
          </select>
        </div>

        {saveError && (
          <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 8 }}>{saveError}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" size="sm" onClick={() => { setEditingProdco(null); setSaveError(null); }} disabled={saving}>
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
