'use client';
// ShowsClient — search + multi-filter grid for the Show Database page.
// All filtering is in-memory from the server-fetched initial data.
// Pencil button overlays each card's top-right corner and opens an edit modal (PUT /api/shows/[id]).

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Show } from '@/types';

// Location type display strings with color dot indicators
const LOCATION_TYPES: Record<string, string> = {
  'traveling-us':    'TRAVELING-US',
  'studio':          'STUDIO',
  'international':   'INTERNATIONAL',
  'fixed-location':  'FIXED',
  'remote':          'REMOTE',
};

function locationDotColor(locType: string | null): string {
  if (!locType) return 'var(--text-muted)';
  const t = locType.toLowerCase();
  if (t.includes('traveling')) return 'var(--status-deal)';
  if (t.includes('studio'))    return 'var(--status-inreview)';
  if (t.includes('intl'))      return 'var(--status-greenlit)';
  return 'var(--text-secondary)';
}

function mapStatusVariant(status: string | null): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (!status) return 'muted';
  const s = status.toLowerCase();
  if (s.includes('green') || s.includes('order')) return 'greenlit';
  if (s.includes('cancel') || s.includes('pass'))  return 'pass';
  if (s.includes('review') || s.includes('devel')) return 'inreview';
  return 'muted';
}

// Fields exposed in the edit form
interface ShowFormState {
  title: string;
  network: string;
  status: string;
  genre: string;
  format: string;
  episode_count: string; // string in the form, parsed to number on save
  production_company: string;
  location_type: string;
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

interface ShowsClientProps {
  initialShows: Show[];
  networks: string[];
  genres: string[];
}

export default function ShowsClient({ initialShows, networks, genres }: ShowsClientProps) {
  const router = useRouter();
  const [search, setSearch]   = useState('');
  const [network, setNetwork] = useState('');
  const [genre, setGenre]     = useState('');
  const [locType, setLocType] = useState('');

  // Local copy of shows — updated optimistically on successful save
  const [shows, setShows] = useState<Show[]>(initialShows);

  // Edit modal state
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [formState, setFormState] = useState<ShowFormState>({
    title: '',
    network: '',
    status: '',
    genre: '',
    format: '',
    episode_count: '',
    production_company: '',
    location_type: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Filter shows by all active criteria — in-memory, no re-fetch
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return shows.filter((s) => {
      if (network  && s.network?.toLowerCase() !== network.toLowerCase())   return false;
      if (genre    && s.genre?.toLowerCase()   !== genre.toLowerCase())     return false;
      if (locType  && s.location_type?.toLowerCase() !== locType.toLowerCase()) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.network ?? '').toLowerCase().includes(q) ||
        (s.production_company ?? '').toLowerCase().includes(q) ||
        (s.genre ?? '').toLowerCase().includes(q)
      );
    });
  }, [shows, search, network, genre, locType]);

  // Open the edit modal and seed form state from the chosen show
  function openEdit(e: React.MouseEvent, show: Show) {
    e.stopPropagation(); // prevent card click from navigating
    setEditingShow(show);
    setFormState({
      title: show.title,
      network: show.network ?? '',
      status: show.status ?? '',
      genre: show.genre ?? '',
      format: show.format ?? '',
      episode_count: show.episode_count != null ? String(show.episode_count) : '',
      production_company: show.production_company ?? '',
      location_type: show.location_type ?? '',
      notes: '', // Show type has no direct notes field visible here
    });
    setSaveError(null);
  }

  // PUT the edited fields to the API, then merge into local state on success
  async function handleSave() {
    if (!editingShow) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Parse episode_count back to number (or null if blank)
      const payload = {
        ...formState,
        episode_count: formState.episode_count !== '' ? Number(formState.episode_count) : null,
      };
      const res = await fetch(`/api/shows/${editingShow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      // Merge updated fields into local shows list without a full re-fetch
      setShows((prev) =>
        prev.map((s) =>
          s.id === editingShow.id
            ? { ...s, ...payload }
            : s
        )
      );
      setEditingShow(null);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search shows, networks…"
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Network select */}
        <FilterSelect
          label="All Networks"
          value={network}
          onChange={setNetwork}
          options={networks}
        />

        {/* Genre select */}
        <FilterSelect
          label="All Genres"
          value={genre}
          onChange={setGenre}
          options={genres}
        />

        {/* Location type select */}
        <FilterSelect
          label="All Locations"
          value={locType}
          onChange={setLocType}
          options={Object.values(LOCATION_TYPES)}
        />

        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} of {shows.length} shows
        </span>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div
          className="rounded-lg border border-[var(--border-subtle)] py-12 text-center"
          style={{ background: 'var(--bg-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No shows match your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((show) => (
            // Wrapper div provides a positioning context for the absolutely-placed pencil button
            <div key={show.id} style={{ position: 'relative' }}>
              {/* Pencil button — overlays top-right corner, outside the Card so it doesn't
                  interfere with the Card's own onClick navigation handler */}
              <button
                onClick={(e) => openEdit(e, show)}
                title="Edit show"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              <Card
                hoverable
                onClick={() => router.push(`/market/shows/${show.id}`)}
              >
                {/* Title */}
                <p
                  className="text-base font-bold leading-tight"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
                >
                  {show.title}
                </p>

                {/* Network + status */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {show.network ?? 'Network TBD'}
                  </span>
                  {show.status && (
                    <Badge label={show.status} variant={mapStatusVariant(show.status)} />
                  )}
                </div>

                {/* Genre + format */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {show.genre  && <Badge label={show.genre}  variant="muted" />}
                  {show.format && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{show.format}</span>
                  )}
                </div>

                {/* Location type */}
                {show.location_type && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: locationDotColor(show.location_type),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}
                    >
                      {LOCATION_TYPES[show.location_type.toLowerCase()] ?? show.location_type.toUpperCase()}
                      {show.filming_states ? ` · ${show.filming_states}` : ''}
                    </span>
                  </div>
                )}

                {/* Episode count + production company */}
                <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {show.episode_count != null && <span>{show.episode_count} eps</span>}
                  {show.production_company && (
                    <span className="truncate">{show.production_company}</span>
                  )}
                </div>

                {/* Greenlit date */}
                {show.greenlit_date && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(show.greenlit_date), { addSuffix: true })}
                  </p>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal — mounts when a show card's pencil is clicked */}
      <Modal
        isOpen={editingShow !== null}
        onClose={() => { setEditingShow(null); setSaveError(null); }}
        title={editingShow?.title ?? 'Edit Show'}
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

        {/* Network */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Network</label>
          <input
            type="text"
            value={formState.network}
            onChange={(e) => setFormState((p) => ({ ...p, network: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Status */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Status</label>
          <input
            type="text"
            value={formState.status}
            onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Genre */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Genre</label>
          <input
            type="text"
            value={formState.genre}
            onChange={(e) => setFormState((p) => ({ ...p, genre: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Format */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Format</label>
          <input
            type="text"
            value={formState.format}
            onChange={(e) => setFormState((p) => ({ ...p, format: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Episode Count — stored as string in form, parsed to number on save */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Episode Count</label>
          <input
            type="number"
            value={formState.episode_count}
            onChange={(e) => setFormState((p) => ({ ...p, episode_count: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Production Company */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Production Company</label>
          <input
            type="text"
            value={formState.production_company}
            onChange={(e) => setFormState((p) => ({ ...p, production_company: e.target.value }))}
            style={FIELD_STYLE}
          />
        </div>

        {/* Location Type */}
        <div style={{ marginBottom: 12 }}>
          <label style={LABEL_STYLE}>Location Type</label>
          <select
            value={formState.location_type}
            onChange={(e) => setFormState((p) => ({ ...p, location_type: e.target.value }))}
            style={FIELD_STYLE}
          >
            <option value="">— None —</option>
            <option value="traveling-us">Traveling US</option>
            <option value="studio">Studio</option>
            <option value="international">International</option>
            <option value="fixed-location">Fixed Location</option>
            <option value="remote">Remote</option>
          </select>
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
          <Button variant="ghost" size="sm" onClick={() => { setEditingShow(null); setSaveError(null); }} disabled={saving}>
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

// Reusable select filter — styled to match the dark palette
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-md text-sm border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-strong)]"
      style={{ minWidth: '140px' }}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
