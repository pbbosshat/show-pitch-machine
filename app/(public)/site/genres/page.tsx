import Link from 'next/link';
export const metadata = { title: 'Genres' };

const GENRES = [
  { name: 'Paranormal', slug: 'paranormal', desc: 'Ghost investigations, hauntings, and the unexplained. Home of Ghost Adventures — 28 seasons on Discovery.' },
  { name: 'Sports + Competition', slug: 'sports', desc: 'From Pros vs Joes to basketball docs co-produced with LeBron James.' },
  { name: 'Home + Lifestyle', slug: 'home-lifestyle', desc: 'Emmy-nominated series like Legacy List on PBS.' },
  { name: 'Crime', slug: 'crime', desc: 'True crime investigations for Investigation Discovery, Oxygen, and A&E.' },
  { name: 'Comedy', slug: 'comedy', desc: 'Comedy series for Comedy Central and beyond.' },
  { name: 'Food + Travel', slug: 'food-travel', desc: 'Critically acclaimed travel and food series including Breaking Borders.' },
];

export default function GenresPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Genres</h1>
      <p style={{ fontSize: 15, color: '#8A9DC0', marginBottom: 48 }}>Twenty years of storytelling across six genre pillars.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        {GENRES.map((g) => (
          <Link key={g.slug} href={`/site/shows?genre=${encodeURIComponent(g.name)}`} style={{ textDecoration: 'none', background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 12, padding: 32, display: 'block', transition: 'border-color 150ms' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#CC1212', marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>{g.name}</h2>
            <p style={{ fontSize: 14, color: '#8A9DC0', lineHeight: 1.6 }}>{g.desc}</p>
            <div style={{ fontSize: 12, color: '#2A3D60', marginTop: 16 }}>Browse shows →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
