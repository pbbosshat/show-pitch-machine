// Public shows page — grid of all MYE shows with genre filter.
import Link from 'next/link';

export const metadata = { title: 'Shows' };

const GENRES = ['All', 'Paranormal', 'Sports + Competition', 'Home + Lifestyle', 'Crime', 'Comedy', 'Food + Travel'];

async function getShows(genre?: string) {
  try {
    const url = genre && genre !== 'All' ? `http://localhost:3000/api/marketing/shows?genre=${encodeURIComponent(genre)}` : 'http://localhost:3000/api/marketing/shows';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

// Known shows from the Webflow site — static fallback if DB is empty
const STATIC_SHOWS = [
  { id: '1', title: 'Ghost Adventures', genre: 'Paranormal', network: 'Discovery', description: '28 seasons on Discovery. The #1 paranormal franchise.' },
  { id: '2', title: 'Legacy List', genre: 'Home + Lifestyle', network: 'PBS', description: 'Two-time Emmy nominated series on PBS.' },
  { id: '3', title: 'Uninterrupted: The Real Stories of Basketball', genre: 'Sports + Competition', network: 'Vice', description: 'Co-produced with LeBron James / SpringHill Company.' },
  { id: '4', title: 'Pros vs Joes', genre: 'Sports + Competition', network: 'Spike', description: '' },
  { id: '5', title: 'Sin City Justice', genre: 'Crime', network: 'Investigation Discovery', description: '' },
  { id: '6', title: 'Destination Fear', genre: 'Paranormal', network: 'Discovery', description: '' },
  { id: '7', title: 'Breaking Borders', genre: 'Food + Travel', network: 'Travel Channel', description: 'Critically acclaimed.' },
  { id: '8', title: 'Baggage Battles', genre: 'Home + Lifestyle', network: 'Travel Channel', description: '' },
  { id: '9', title: 'The Jane Doe Murders', genre: 'Crime', network: 'Investigation Discovery', description: '' },
  { id: '10', title: 'Food Boats', genre: 'Food + Travel', network: 'Food Network', description: '' },
  { id: '11', title: 'Paranormal Challenge', genre: 'Paranormal', network: 'Travel Channel', description: '' },
  { id: '12', title: 'Billy Buys Brooklyn', genre: 'Home + Lifestyle', network: 'TruTV', description: '' },
];

export default async function ShowsPage() {
  const dbShows = await getShows();
  const shows = dbShows.length > 0 ? dbShows : STATIC_SHOWS;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Shows</h1>
      <p style={{ fontSize: 15, color: '#8A9DC0', marginBottom: 36 }}>Thousands of hours of best-in-class non-fiction and documentary series.</p>

      {/* Genre filter links */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
        {GENRES.map((g) => (
          <Link key={g} href={g === 'All' ? '/site/shows' : `/site/shows?genre=${encodeURIComponent(g)}`}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: '1px solid #1A2540', color: '#8A9DC0', textDecoration: 'none', background: 'transparent' }}>
            {g}
          </Link>
        ))}
      </div>

      {/* Shows grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {shows.map((show: { id: string; title: string; genre: string; network: string; description: string }) => (
          <div key={show.id} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 12, padding: 24 }}>
            {show.genre && <div style={{ fontSize: 10, color: '#CC1212', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{show.genre}</div>}
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0', marginBottom: 8, lineHeight: 1.3 }}>{show.title}</h3>
            {show.network && <div style={{ fontSize: 12, color: '#4A5D80', marginBottom: show.description ? 12 : 0 }}>{show.network}</div>}
            {show.description && <p style={{ fontSize: 13, color: '#8A9DC0', lineHeight: 1.6 }}>{show.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
