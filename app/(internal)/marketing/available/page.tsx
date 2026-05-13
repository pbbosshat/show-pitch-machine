export const dynamic = 'force-dynamic';

// Marketing Available — server component: reads available_titles directly from the DB
// and passes the rows down to AvailableClient for all interactive card-grid features.
// Uses a synchronous DB call (no async fetch) so the page works without the API server running.

import { query } from '@/lib/db';
import { initDb } from '@/lib/db';
import AvailableClient from './AvailableClient';
import type { AvailableTitle } from './AvailableClient';

// Async because initDb() and query() are now Postgres-backed Promises
async function getTitles(): Promise<AvailableTitle[]> {
  try {
    await initDb();
    const rows = await query<AvailableTitle>(
      'SELECT *, gate_password AS password FROM deck_sites ORDER BY is_active DESC, sort_order ASC, title ASC LIMIT 200'
    );
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

export default async function MarketingAvailable() {
  const titles = await getTitles();
  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Available Titles
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          International and domestic rights catalog
        </p>
      </div>
      <AvailableClient titles={titles} />
    </div>
  );
}
