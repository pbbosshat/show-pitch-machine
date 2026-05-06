// Network detail page — server component.
// Fetches GET /api/networks/[id] and delegates the three data sections
// (Contacts, Deals, Orders) to NetworkDetailClient as a tabbed interface.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import type { NetworkDetail } from '@/types';
import { getBaseUrl } from '@/lib/baseUrl';
import NetworkDetailClient from '@/components/networks/NetworkDetailClient';

async function fetchNetwork(id: string): Promise<NetworkDetail | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(`${getBaseUrl()}/api/networks/${id}`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch { return null; }
}

export default async function NetworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const network = await fetchNetwork(id);

  if (!network) notFound();

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Header ── */}
      <div className="mb-6">
        {/* Back nav */}
        <Link
          href="/market/networks"
          className="text-xs mb-3 inline-flex items-center gap-1"
          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          ← Networks
        </Link>

        <h1
          className="text-3xl mt-1"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          {network.name}
        </h1>

        {/* Tier + type badges + HQ */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {network.tier && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                background: network.tier === 'A' ? 'rgba(var(--accent-rgb, 99,102,241),0.15)' : 'var(--bg-surface-alt)',
                color: network.tier === 'A' ? 'var(--accent)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Tier {network.tier}
            </span>
          )}
          {network.type && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'var(--bg-surface-alt)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {network.type}
            </span>
          )}
          {network.hq_city && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {network.hq_city}
            </span>
          )}
        </div>
      </div>

      {/* ── Notes ── */}
      {network.notes && (
        <p
          className="mb-6 text-sm italic"
          style={{ color: 'var(--text-muted)' }}
        >
          {network.notes}
        </p>
      )}

      {/* ── Tabbed data sections (Contacts / Deals / Orders) ── */}
      <NetworkDetailClient network={network} />

    </div>
  );
}
