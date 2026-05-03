// Marketing Available — manage titles available for international/domestic licensing.
import Link from 'next/link';
import Badge from '@/components/ui/Badge';

interface AvailableTitle { id: string; title: string; rights_type: string; genre: string; seasons: number; episode_count: number; is_active: number; }

async function getTitles(): Promise<AvailableTitle[]> {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/available', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

export default async function MarketingAvailable() {
  const titles = await getTitles();
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>Available Titles</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>International and domestic rights catalog</p>
        </div>
        <Link href="/marketing/available/new" className="px-4 py-2 rounded text-sm font-medium text-white" style={{ background: 'var(--accent)', textDecoration: 'none' }}>
          + Add Title
        </Link>
      </div>
      {titles.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No available titles yet.</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)' }}>
                {['Title', 'Rights Type', 'Genre', 'Seasons', 'Episodes', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {titles.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{t.title}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t.rights_type || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t.genre || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t.seasons ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t.episode_count ?? '—'}</td>
                  <td className="px-4 py-3"><Badge variant={t.is_active ? 'greenlit' : 'pass'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3"><Link href={`/marketing/available/${t.id}`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
