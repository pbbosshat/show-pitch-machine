// Show DB — server component fetches all shows directly from SQLite (no HTTP round-trip).
// Passes the full dataset to ShowDbClient which handles search, filter, sort, and inline edit.
// Pattern mirrors app/(internal)/buyers/page.tsx exactly.

import ShowDbClient from '@/components/shows/ShowDbClient';
import { query } from '@/lib/db';
import type { Show } from '@/types';

// Fetch all shows ordered so MYE-produced shows appear first, then by most recent greenlit date.
// This runs server-side at request time (no caching needed — local SQLite is fast).
function fetchShows(): Show[] {
  try {
    // node:sqlite rows have null prototypes — JSON roundtrip converts them to plain objects
    // so Next.js can serialize them across the server→client boundary.
    const rows = query<Show>(
      `SELECT * FROM shows ORDER BY is_our_show DESC, greenlit_date DESC NULLS LAST`
    );
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

export default function ShowsPage() {
  const shows = fetchShows();
  return (
    <div className="p-6 space-y-5">
      {/* ShowDbClient owns all interactivity — search, filters, sort, column selector, edit modal */}
      <ShowDbClient initialShows={shows} />
    </div>
  );
}
