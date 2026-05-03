// Shows Database — server component fetches all shows, client component handles
// search and filter interactivity without re-fetching from the server.

import ShowsClient from '@/components/shows/ShowsClient';
import type { Show } from '@/types';

async function fetchShows(): Promise<Show[]> {
  try {
    const res = await fetch('http://localhost:3000/api/shows', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

export default async function ShowsPage() {
  const shows = await fetchShows();

  // Build unique filter values from the shows data
  const networks = [...new Set(shows.map((s) => s.network).filter(Boolean))].sort() as string[];
  const genres   = [...new Set(shows.map((s) => s.genre).filter(Boolean))].sort() as string[];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Show Database
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {shows.length} shows indexed
        </p>
      </div>

      <ShowsClient initialShows={shows} networks={networks} genres={genres} />
    </div>
  );
}
