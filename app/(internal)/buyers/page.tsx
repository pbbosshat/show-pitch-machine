// Buyers Directory — server component renders the table shell, client component handles
// search + filter interactivity. Avoids making the whole page a client component.

import BuyersClient from '@/components/buyers/BuyersClient';
import type { BuyerContact } from '@/types';

async function fetchBuyers(): Promise<BuyerContact[]> {
  try {
    const res = await fetch('http://localhost:3000/api/buyers', { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch { return []; }
}

export default async function BuyersPage() {
  const buyers = await fetchBuyers();
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Buyers Directory
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {buyers.length} contacts
        </p>
      </div>
      {/* BuyersClient handles search, filter, and row click navigation */}
      <BuyersClient initialBuyers={buyers} />
    </div>
  );
}
