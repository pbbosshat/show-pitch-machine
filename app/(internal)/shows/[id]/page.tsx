// Show detail page — displays full show record from the internal market intelligence DB.
// Shows: network, genre, production company, location, episode count, comparable shows.

import { notFound } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import type { Show } from '@/types';

async function fetchShow(id: string): Promise<Show | null> {
  try {
    const res = await fetch(`http://localhost:3000/api/shows/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch { return null; }
}

async function fetchSimilar(id: string): Promise<Show[]> {
  try {
    const res = await fetch(`http://localhost:3000/api/shows/similar?id=${id}&limit=6`, { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  );
}

export default async function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [show, similar] = await Promise.all([fetchShow(id), fetchSimilar(id)]);

  if (!show) notFound();

  const s = show as Show & {
    title: string; network?: string; genre?: string; subgenre?: string;
    production_company?: string; showrunner?: string; host?: string; format?: string;
    episode_count?: number; season_number?: number; runtime_mins?: number;
    order_type?: string; status?: string; location_type?: string;
    primary_city?: string; primary_state?: string; primary_country?: string;
    greenlit_date?: number; source_url?: string;
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>{s.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {s.network && <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{s.network}</span>}
              {s.genre && <Badge variant="muted">{s.genre}</Badge>}
              {s.status && <Badge variant={s.status === 'greenlit' ? 'greenlit' : s.status === 'passed' ? 'pass' : 'inreview'}>{s.status}</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <Card className="mb-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 p-4">
          <Field label="Format" value={s.format} />
          <Field label="Order Type" value={s.order_type} />
          <Field label="Episodes" value={s.episode_count} />
          <Field label="Season" value={s.season_number ? `Season ${s.season_number}` : undefined} />
          <Field label="Runtime" value={s.runtime_mins ? `${s.runtime_mins} min` : undefined} />
          <Field label="Production Company" value={s.production_company} />
          <Field label="Showrunner" value={s.showrunner} />
          <Field label="Host / Talent" value={s.host} />
          <Field label="Location Type" value={s.location_type} />
          <Field label="Location" value={[s.primary_city, s.primary_state, s.primary_country].filter(Boolean).join(', ')} />
          <Field label="Sub-genre" value={s.subgenre} />
          {s.source_url && (
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>Source</dt>
              <dd><a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: 'var(--accent)' }}>View trade article →</a></dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Similar shows */}
      {similar.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Similar Shows</h2>
          <div className="grid grid-cols-2 gap-3">
            {similar.map((sim) => {
              const ss = sim as typeof s;
              return (
                <a key={ss.id as string} href={`/shows/${ss.id}`} className="flex items-center justify-between p-3 rounded-md transition-all" style={{ background: 'var(--bg-surface-alt)', textDecoration: 'none' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ss.title}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ss.network}</div>
                  </div>
                  {ss.genre && <Badge variant="muted">{ss.genre}</Badge>}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
