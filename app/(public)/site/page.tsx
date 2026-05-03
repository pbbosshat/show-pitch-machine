// Public homepage — hero, company description, featured shows, network logos.
import Link from 'next/link';

export const metadata = { title: 'MY Entertainment — Compelling Characters. Great Storytelling.' };

async function getFeaturedShows() {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/shows?featured=true&limit=6', { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

const NETWORKS = ['Discovery', 'A&E', 'PBS', 'BBC', 'Lifetime', 'MTV', 'Comedy Central', 'Travel Channel', 'Investigation Discovery', 'Oxygen', 'Nickelodeon', 'Food Network', 'Animal Planet', 'TruTV', 'Reelz', 'CMT', 'Max', 'Discovery+', 'Vice', 'IFC', 'National Geographic'];

export default async function HomePage() {
  const featured = await getFeaturedShows();
  return (
    <div>
      {/* Hero */}
      <section style={{ padding: '96px 24px 80px', textAlign: 'center', background: 'linear-gradient(180deg, #0F0A0A 0%, #0A0A0F 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: 20 }}>
            Compelling Characters.<br />
            <span style={{ color: '#CC1212' }}>Great Storytelling.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#8A9DC0', lineHeight: 1.7, marginBottom: 36, maxWidth: 600, margin: '0 auto 36px' }}>
            Independent, New York based production company known for best-in-class non-fiction and documentary series. 20+ years. Thousands of hours. World-class partnerships.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/site/shows" style={{ padding: '14px 28px', background: '#CC1212', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Browse Shows</Link>
            <Link href="/site/contact" style={{ padding: '14px 28px', background: 'transparent', color: '#F0F0F0', borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: 'none', border: '1px solid #2A3D60' }}>Work With MYE</Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: '#0F1729', borderTop: '1px solid #1A1A2E', borderBottom: '1px solid #1A1A2E', padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {[
            { value: '20+', label: 'Years in Business' },
            { value: '28', label: 'Ghost Adventures Seasons' },
            { value: '40+', label: 'Production Partners' },
            { value: '15', label: 'Countries' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#CC1212', fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
              <div style={{ fontSize: 12, color: '#4A5D80', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured shows */}
      {featured.length > 0 && (
        <section style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif" }}>Featured Shows</h2>
            <Link href="/site/shows" style={{ fontSize: 13, color: '#CC1212', textDecoration: 'none' }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {featured.map((show: { id: string; title: string; genre: string; network: string; description: string }) => (
              <div key={show.id} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 12, padding: 24, transition: 'border-color 150ms' }}>
                <div style={{ fontSize: 11, color: '#CC1212', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{show.genre}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0', marginBottom: 8 }}>{show.title}</h3>
                {show.network && <div style={{ fontSize: 12, color: '#4A5D80', marginBottom: 12 }}>{show.network}</div>}
                {show.description && <p style={{ fontSize: 13, color: '#8A9DC0', lineHeight: 1.6 }}>{show.description.slice(0, 120)}…</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Network logos (text-based) */}
      <section style={{ padding: '48px 24px', background: '#080D18', borderTop: '1px solid #1A1A2E' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#2A3D60', textTransform: 'uppercase', marginBottom: 24 }}>Produced for</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {NETWORKS.map(n => (
              <span key={n} style={{ fontSize: 13, color: '#4A5D80', padding: '6px 14px', border: '1px solid #1A2540', borderRadius: 20 }}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'linear-gradient(180deg, #0A0A0F 0%, #0F0A0A 100%)' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 16 }}>Ready to make something great?</h2>
        <p style={{ fontSize: 16, color: '#8A9DC0', marginBottom: 32 }}>Offices in Manhattan, Toronto, and London.</p>
        <Link href="/site/contact" style={{ padding: '16px 36px', background: '#CC1212', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>Work With MYE</Link>
      </section>
    </div>
  );
}
