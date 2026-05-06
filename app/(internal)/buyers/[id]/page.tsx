// Buyer detail — server shell fetches profile data, passes to BuyerTabs client island.
// Loads: buyer contact, mandate history, their greenlits, MYE pitch history, company career notes.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import BuyerTabs from '@/components/buyers/BuyerTabs';
import Badge from '@/components/ui/Badge';
import UnverifiedSection from '@/components/ui/UnverifiedSection';
import type { BuyerContact, MandateUpdate, MarketOrder, Pitch } from '@/types';
import { getBaseUrl } from '@/lib/baseUrl';

// Extended interface for the denormalized buyer detail response from GET /api/buyers/[id]
// The API joins buyer_companies and buyer_employer_history — these fields aren't on BuyerContact base.
// email_threads added in Phase 2B — GET /api/buyers/[id] now returns Gmail thread summaries.
interface BuyerDetailData extends BuyerContact {
  company_name: string | null;
  company_type: string | null;
  company_hq_city: string | null;
  employer_history: Array<{
    id: string;
    company_name: string;
    company_type: string | null;
    title: string | null;
    is_buyer_seat: number;
    start_date: number | null;
    end_date: number | null;
  }>;
  prodco_count: number;
  email_threads?: Array<{
    id: string;
    thread_id: string;
    subject: string | null;
    participants: string;
    first_message_date: string | null;
    last_message_date: string | null;
    message_count: number;
    snippet: string | null;
    direction: string | null;
  }>;
}

// Forward the session cookie so middleware doesn't redirect server-side fetches to /login
async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(url, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json ?? null;
  } catch { return null; }
}

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = getBaseUrl();

  const [buyer, mandateHistory, greenlits, myeHistory] = await Promise.all([
    fetchJSON<BuyerDetailData>(`${base}/api/buyers/${id}`),
    fetchJSON<MandateUpdate[]>(`${base}/api/buyers/${id}/mandate-history`),
    fetchJSON<MarketOrder[]>(`${base}/api/buyers/${id}/greenlits`),
    fetchJSON<Pitch[]>(`${base}/api/buyers/${id}/mye-history`),
  ]);

  if (!buyer) notFound();

  // Determine badge variant from activity_status string
  const statusVariant =
    buyer.activity_status === 'active' ? ('greenlit' as const) :
    buyer.activity_status === 'quiet'  ? ('inreview' as const) : ('muted' as const);

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {buyer.name}
            </h1>
            {buyer.title && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {buyer.title}
                {/* Prefer company_name from join; fall back to legacy company field. Link to network page when company_id exists. */}
                {(buyer.company_name ?? (buyer as BuyerDetailData & { company?: string }).company) && (
                  <>
                    {' · '}
                    {buyer.company_id ? (
                      <Link
                        href={`/market/networks/${buyer.company_id}`}
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {buyer.company_name ?? (buyer as BuyerDetailData & { company?: string }).company}
                      </Link>
                    ) : (
                      buyer.company_name ?? (buyer as BuyerDetailData & { company?: string }).company
                    )}
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center shrink-0">
            {buyer.activity_status && (
              <Badge variant={statusVariant}>{buyer.activity_status}</Badge>
            )}
          </div>
        </div>

        {/* Current mandate summary */}
        {buyer.mandate_statement && (
          <blockquote
            className="mt-4 px-4 py-3 rounded-md text-sm italic"
            style={{ borderLeft: '3px solid var(--accent)', background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)' }}
          >
            &ldquo;{buyer.mandate_statement}&rdquo;
          </blockquote>
        )}
      </div>

      {/* Unverified data callout — shows when buyer contact data has not been manually confirmed */}
      <UnverifiedSection
        entityId={buyer.id}
        entityType="buyer"
        verifyEndpoint={`/api/buyers/${buyer.id}/verify`}
        isVerified={buyer.is_verified ?? 0}
        fields={[
          { label: 'Email', value: buyer.email ?? null, fieldName: 'email' },
          { label: 'Title', value: buyer.title ?? null, fieldName: 'title' },
        ]}
      />

      {/* Tabs — pass structured employer_history and prodco_count from the new API fields */}
      <BuyerTabs
        buyerId={id}
        buyerName={buyer.name}
        mandateHistory={(mandateHistory as MandateUpdate[]) ?? []}
        greenlits={(greenlits as MarketOrder[]) ?? []}
        myeHistory={(myeHistory as Pitch[]) ?? []}
        companyHistory={buyer.company_history ?? null}
        employerHistory={buyer.employer_history ?? []}
        prodcoCount={buyer.prodco_count ?? 0}
        emailThreads={buyer.email_threads ?? []}
      />
    </div>
  );
}
