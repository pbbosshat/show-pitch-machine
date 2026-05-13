// Marketing Press — manage press releases shown on /site/press-releases.
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { format } from 'date-fns';
import { query } from '@/lib/db';

interface PressRelease { id: string; headline: string; source: string; published_at: number; is_featured: number; }

// Async because query() returns a Promise in Postgres mode
async function getPress(): Promise<PressRelease[]> {
  try {
    return await query<PressRelease>('SELECT * FROM press_releases ORDER BY published_at DESC, created_at DESC');
  } catch { return []; }
}

export default async function MarketingPress() {
  const releases = await getPress();
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>Press Releases</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{releases.length} release{releases.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/marketing/press/new" className="px-4 py-2 rounded text-sm font-medium text-white" style={{ background: 'var(--accent)', textDecoration: 'none' }}>
          + Add Release
        </Link>
      </div>
      {releases.length === 0 ? (
        <div className="rounded-lg p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No press releases yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {releases.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{r.headline}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {r.source && <span className="mr-3">{r.source}</span>}
                  {r.published_at && format(new Date(r.published_at * 1000), 'MMM d, yyyy')}
                  {r.is_featured ? <span className="ml-3" style={{ color: 'var(--accent)' }}>★ Featured</span> : null}
                </div>
              </div>
              <Link href={`/marketing/press/${r.id}`} className="text-xs font-medium ml-4" style={{ color: 'var(--accent)' }}>Edit</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
