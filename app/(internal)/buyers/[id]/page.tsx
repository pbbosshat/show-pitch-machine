// Buyer detail — server shell fetches profile data, passes to BuyerTabs client island.
// Loads: buyer contact, mandate history, their greenlits, MYE pitch history, company career notes.

import { notFound } from 'next/navigation';
import BuyerTabs from '@/components/buyers/BuyerTabs';
import Badge from '@/components/ui/Badge';
import type { BuyerContact, MandateUpdate, MarketOrder, Pitch } from '@/types';

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json ?? null;
  } catch { return null; }
}

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = 'http://localhost:3000';

  const [buyer, mandateHistory, greenlits, myeHistory] = await Promise.all([
    fetchJSON<BuyerContact>(`${base}/api/buyers/${id}`),
    fetchJSON<MandateUpdate[]>(`${base}/api/buyers/${id}/mandate-history`),
    fetchJSON<MarketOrder[]>(`${base}/api/buyers/${id}/greenlits`),
    fetchJSON<Pitch[]>(`${base}/api/buyers/${id}/mye-history`),
  ]);

  if (!buyer) notFound();

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {(buyer as BuyerContact & { name: string }).name}
            </h1>
            {(buyer as BuyerContact & { title?: string; company?: string }).title && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {(buyer as BuyerContact & { title?: string }).title}
                {(buyer as BuyerContact & { company?: string }).company && ` · ${(buyer as BuyerContact & { company?: string }).company}`}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center shrink-0">
            {(buyer as BuyerContact & { activity_status?: string }).activity_status && (
              <Badge variant={
                (buyer as BuyerContact & { activity_status?: string }).activity_status === 'active' ? 'greenlit' :
                (buyer as BuyerContact & { activity_status?: string }).activity_status === 'cooling' ? 'inreview' : 'muted'
              }>
                {(buyer as BuyerContact & { activity_status?: string }).activity_status}
              </Badge>
            )}
          </div>
        </div>

        {/* Current mandate summary */}
        {(buyer as BuyerContact & { mandate_statement?: string }).mandate_statement && (
          <blockquote
            className="mt-4 px-4 py-3 rounded-md text-sm italic"
            style={{ borderLeft: '3px solid var(--accent)', background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)' }}
          >
            &ldquo;{(buyer as BuyerContact & { mandate_statement: string }).mandate_statement}&rdquo;
          </blockquote>
        )}
      </div>

      {/* Tabs */}
      <BuyerTabs
        buyerId={id}
        buyerName={(buyer as BuyerContact & { name: string }).name}
        mandateHistory={(mandateHistory as MandateUpdate[]) ?? []}
        greenlits={(greenlits as MarketOrder[]) ?? []}
        myeHistory={(myeHistory as Pitch[]) ?? []}
        companyHistory={(buyer as BuyerContact & { company_history?: string }).company_history ?? null}
      />
    </div>
  );
}
