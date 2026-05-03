// Marketing Genres — manage the 6 genre categories shown on /site/genres.
import Link from 'next/link';

interface SiteGenre { id: string; name: string; slug: string; description: string; sort_order: number; }

async function getGenres(): Promise<SiteGenre[]> {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/genres', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

export default async function MarketingGenres() {
  const genres = await getGenres();
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>Genres</h1>
        <Link href="/marketing/genres/new" className="px-4 py-2 rounded text-sm font-medium text-white" style={{ background: 'var(--accent)', textDecoration: 'none' }}>+ Add Genre</Link>
      </div>
      <div className="flex flex-col gap-3">
        {genres.map((g) => (
          <div key={g.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{g.name}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>/site/genres/{g.slug}</div>
            </div>
            <Link href={`/marketing/genres/${g.id}`} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Edit</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
