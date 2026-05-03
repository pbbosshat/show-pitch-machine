'use client';
// ShowsClient — search + multi-filter grid for the Show Database page.
// All filtering is in-memory from the server-fetched initial data.

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
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

  // Filter shows by all active criteria — in-memory, no re-fetch
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialShows.filter((s) => {
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
  }, [initialShows, search, network, genre, locType]);

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
          {filtered.length} of {initialShows.length} shows
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
            <Card
              key={show.id}
              hoverable
              onClick={() => router.push(`/shows/${show.id}`)}
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
          ))}
        </div>
      )}
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
