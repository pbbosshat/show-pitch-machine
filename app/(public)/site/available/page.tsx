import Link from 'next/link';
export const metadata = { title: 'Available Titles' };

async function getTitles() {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/available', { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

export default async function AvailablePage() {
  const titles = await getTitles();
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Available Titles</h1>
      <p style={{ fontSize: 15, color: '#8A9DC0', marginBottom: 8 }}>International and domestic rights available for licensing.</p>
      <p style={{ fontSize: 14, color: '#4A5D80', marginBottom: 48 }}>Contact <a href="mailto:info@myentertainment.tv" style={{ color: '#CC1212' }}>info@myentertainment.tv</a> to inquire.</p>
      {titles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#4A5D80' }}>Contact us to discuss available titles.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {titles.map((t: { id: string; title: string; genre: string; seasons: number; episode_count: number; runtime_mins: number; rights_type: string; description: string }) => (
            <div key={t.id} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 10, color: '#CC1212', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{t.rights_type || 'Available'}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F0F0F0', marginBottom: 8 }}>{t.title}</h3>
              {t.genre && <div style={{ fontSize: 12, color: '#4A5D80', marginBottom: 8 }}>{t.genre}</div>}
              <div style={{ fontSize: 12, color: '#2A3D60' }}>
                {t.seasons && <span>{t.seasons} season{t.seasons > 1 ? 's' : ''}</span>}
                {t.seasons && t.episode_count && <span> · </span>}
                {t.episode_count && <span>{t.episode_count} eps</span>}
                {t.runtime_mins && <span> · {t.runtime_mins}m</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
