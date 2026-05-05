export const dynamic = 'force-dynamic';

// Production Companies directory — server component queries DB directly (bypasses middleware),
// passes full list to client component which handles search + filter in-memory.

import ProdcosClient from '@/components/prodcos/ProdcosClient';
import { query } from '@/lib/db';
import type { ProductionCompany } from '@/types';

export default async function ProdcosPage() {
  // Spread into plain objects — SQLite returns null-prototype rows that Next.js can't serialize for Client Components
  const prodcos = query<ProductionCompany>('SELECT * FROM production_companies ORDER BY name ASC').map(p => ({ ...p }));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Production Companies
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {prodcos.length} companies
        </p>
      </div>
      {/* ProdcosClient handles search, filter, and row click navigation */}
      <ProdcosClient initialProdcos={prodcos} />
    </div>
  );
}
