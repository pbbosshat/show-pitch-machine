// Shows Database — server component queries DB directly (avoids auth-middleware redirect),
// passes full list to ShowsClient which handles search and filter interactivity.

import ShowsClient from '@/components/shows/ShowsClient';
import { query } from '@/lib/db';
import type { Show } from '@/types';

function fetchShows(): Show[] {
  try {
    const rows = query<Show>('SELECT * FROM shows ORDER BY greenlit_date DESC NULLS LAST');
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

export default function ShowsPage() {
  const shows = fetchShows();

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
