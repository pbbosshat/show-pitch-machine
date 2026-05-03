// Marketing CMS dashboard — shows site health at a glance.
// Counts: published shows, press releases, available titles. Links to each section.
import Link from 'next/link';

// Quick stat card
function StatCard({ label, value, href, color }: { label: string; value: number | string; href: string; color?: string }) {
  return (
    <Link href={href} className="block rounded-lg p-6 transition-all hover:scale-[1.02]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
      <div className="text-3xl font-bold mb-1" style={{ color: color || 'var(--accent)', fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</div>
      <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </Link>
  );
}

async function getStats() {
  try {
    const [shows, press, avail] = await Promise.all([
      fetch('http://localhost:3000/api/marketing/shows', { cache: 'no-store' }).then(r => r.json()),
      fetch('http://localhost:3000/api/marketing/press', { cache: 'no-store' }).then(r => r.json()),
      fetch('http://localhost:3000/api/marketing/available', { cache: 'no-store' }).then(r => r.json()),
    ]);
    return { shows: shows.total ?? 0, press: press.total ?? 0, available: avail.total ?? 0 };
  } catch { return { shows: 0, press: 0, available: 0 }; }
}

export default async function MarketingDashboard() {
  const stats = await getStats();
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>Marketing CMS</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage the public myentertainment.tv website content</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Published Shows" value={stats.shows} href="/marketing/shows" />
        <StatCard label="Press Releases" value={stats.press} href="/marketing/press" />
        <StatCard label="Available Titles" value={stats.available} href="/marketing/available" />
      </div>
      <div className="rounded-lg p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Links</h2>
        <div className="flex flex-col gap-2">
          {[
            { href: '/marketing/shows', label: 'Manage Shows → Add, edit, archive show listings' },
            { href: '/marketing/press', label: 'Press Releases → Publish and manage press coverage' },
            { href: '/marketing/available', label: 'Available Titles → International and domestic rights' },
            { href: '/marketing/genres', label: 'Genres → Manage genre categories' },
            { href: '/marketing/content', label: 'Site Content → Edit homepage, about, and contact copy' },
            { href: '/site', label: '↗ Preview Public Site → Open myentertainment.tv in new tab' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} target={href === '/site' ? '_blank' : undefined} className="text-sm py-2 px-3 rounded hover:underline" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
