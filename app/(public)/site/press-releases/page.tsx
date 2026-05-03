import Link from 'next/link';
import { format } from 'date-fns';
export const metadata = { title: 'Press Releases' };

async function getPress() {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/press', { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

export default async function PressPage() {
  const releases = await getPress();
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Press</h1>
      <p style={{ fontSize: 15, color: '#8A9DC0', marginBottom: 48 }}>News and announcements from MY Entertainment.</p>
      {releases.length === 0 ? (
        <p style={{ color: '#4A5D80' }}>No press releases yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {releases.map((r: { id: string; headline: string; excerpt: string; source: string; published_at: number; source_url: string }) => (
            <div key={r.id} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 12, padding: 28 }}>
              <div style={{ fontSize: 12, color: '#4A5D80', marginBottom: 10 }}>
                {r.published_at && format(new Date(r.published_at * 1000), 'MMMM d, yyyy')}
                {r.source && <span> · {r.source}</span>}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', marginBottom: 10, lineHeight: 1.3 }}>{r.headline}</h2>
              {r.excerpt && <p style={{ fontSize: 14, color: '#8A9DC0', lineHeight: 1.6 }}>{r.excerpt}</p>}
              {r.source_url && <a href={r.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#CC1212', textDecoration: 'none', marginTop: 12, display: 'inline-block' }}>Read more →</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
