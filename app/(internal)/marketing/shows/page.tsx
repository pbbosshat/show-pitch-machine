// Marketing Shows — manage public show listings displayed on myentertainment.tv/site/shows.
import Link from 'next/link';
import Badge from '@/components/ui/Badge';

interface SiteShow { id: string; title: string; genre: string; network: string; status: string; is_featured: number; sort_order: number; }

async function getShows(): Promise<SiteShow[]> {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/shows', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

function statusVariant(s: string): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (s === 'active') return 'greenlit';
  if (s === 'available') return 'inreview';
  if (s === 'archived') return 'pass';
  return 'muted';
}

export default async function MarketingShows() {
  const shows = await getShows();
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>Shows</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{shows.length} show{shows.length !== 1 ? 's' : ''} in the public catalog</p>
        </div>
        <Link href="/marketing/shows/new" className="px-4 py-2 rounded text-sm font-medium text-white" style={{ background: 'var(--accent)', textDecoration: 'none' }}>
          + Add Show
        </Link>
      </div>
      {shows.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No shows yet. Run the seed script to import from the Webflow site.</p>
          <Link href="/marketing" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>← Back to overview</Link>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Title', 'Genre', 'Network', 'Status', 'Featured', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shows.map((show, i) => (
                <tr key={show.id} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{show.title}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{show.genre || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{show.network || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(show.status)}>{show.status}</Badge></td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{show.is_featured ? '★' : '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/marketing/shows/${show.id}`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
