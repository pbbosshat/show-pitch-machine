// Marketing Available — server component: fetches the available-titles catalog
// and passes the data down to AvailableClient for all interactive table features.
import AvailableClient from './AvailableClient';
import type { AvailableTitle } from './AvailableClient';

async function getTitles(): Promise<AvailableTitle[]> {
  try {
    const res = await fetch('http://localhost:3000/api/marketing/available', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

export default async function MarketingAvailable() {
  const titles = await getTitles();
  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
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
        {/* "+ Add Title" button has moved into AvailableClient's controls bar */}
      </div>
      <AvailableClient titles={titles} />
    </div>
  );
}
