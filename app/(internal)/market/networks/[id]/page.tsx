// Network detail page — server component.
// Fetches GET /api/networks/[id] and renders three sections:
//   1. Development Contacts — buyers at this network
//   2. Recent Deals — last 20 deals commissioned here
//   3. Market Orders — last 20 market orders linked to this network
// All sections show an empty state rather than crashing on missing data.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import type { NetworkDetail } from '@/types';
import { getBaseUrl } from '@/lib/baseUrl';

async function fetchNetwork(id: string): Promise<NetworkDetail | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/networks/${id}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch { return null; }
}

// Map activity_status string to a Badge variant the component accepts
function statusVariant(status: string): 'active' | 'quiet' | 'unknown' {
  if (status === 'active') return 'active';
  if (status === 'quiet') return 'quiet';
  return 'unknown';
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

      {/* ── Section 1: Development Contacts ── */}
      <div className="mb-8">
        <h2
          className="text-base mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Development Contacts
          {network.contacts.some((c) => c.is_buyer_seat === 1) && (
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: 'var(--status-greenlit)' }}
            >
              Active buyers
            </span>
          )}
        </h2>

        <div
          className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
          style={{ background: 'var(--bg-surface)' }}
        >
          {network.contacts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              No contacts on file
            </p>
          ) : (
            <>
              {/* Header row */}
              <div
                className="grid text-xs font-semibold tracking-wider uppercase px-4 py-2.5 border-b border-[var(--border-subtle)]"
                style={{
                  gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface-alt)',
                }}
              >
                <span>Name</span>
                <span>Title</span>
                <span>Email</span>
                <span>Status</span>
                <span>Role</span>
              </div>

              {network.contacts.map((contact, idx) => (
                <div
                  key={contact.id}
                  className="grid items-center px-4 py-3 border-b border-[var(--border-subtle)] last:border-0"
                  style={{ gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr' }}
                >
                  {/* Name — linked to buyer profile */}
                  <span className="text-sm font-medium">
                    <Link
                      href={`/buyers/${contact.id}`}
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      {contact.name}
                      {contact.is_buyer_seat === 1 && (
                        <span
                          className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded font-semibold"
                          style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--status-greenlit)', verticalAlign: 'middle' }}
                        >
                          Buyer
                        </span>
                      )}
                    </Link>
                  </span>

                  {/* Title */}
                  <span className="text-sm truncate pr-2" style={{ color: 'var(--text-secondary)' }}>
                    {contact.title ?? '—'}
                  </span>

                  {/* Email */}
                  <span>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-xs"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </span>

                  {/* Activity status badge */}
                  <span>
                    <Badge
                      label={contact.activity_status}
                      variant={statusVariant(contact.activity_status)}
                    />
                  </span>

                  {/* Role type */}
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {contact.role_type ? contact.role_type.replace(/_/g, ' ') : '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: Recent Deals ── */}
      <div className="mb-8">
        <h2
          className="text-base mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Recent Deals
        </h2>

        <div
          className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
          style={{ background: 'var(--bg-surface)' }}
        >
          {network.recent_deals.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              No deals on record
            </p>
          ) : (
            <>
              {/* Header row */}
              <div
                className="grid text-xs font-semibold tracking-wider uppercase px-4 py-2.5 border-b border-[var(--border-subtle)]"
                style={{
                  gridTemplateColumns: '2.5fr 1.5fr 1.5fr 0.8fr 1fr',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface-alt)',
                }}
              >
                <span>Show Title</span>
                <span>Buyer</span>
                <span>Prodco</span>
                <span>Date</span>
                <span>Type</span>
              </div>

              {network.recent_deals.map((deal) => (
                <div
                  key={deal.id}
                  className="grid items-center px-4 py-3 border-b border-[var(--border-subtle)] last:border-0"
                  style={{ gridTemplateColumns: '2.5fr 1.5fr 1.5fr 0.8fr 1fr' }}
                >
                  {/* Show title */}
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {deal.show_title ?? '—'}
                  </span>

                  {/* Buyer — linked if buyer_id present */}
                  <span className="text-sm">
                    {deal.buyer_name ? (
                      deal.buyer_id ? (
                        <Link
                          href={`/buyers/${deal.buyer_id}`}
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          {deal.buyer_name}
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{deal.buyer_name}</span>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </span>

                  {/* Prodco */}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {deal.prodco_name ?? '—'}
                  </span>

                  {/* Year extracted from ms timestamp */}
                  <span
                    className="text-sm tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
                  >
                    {deal.deal_date ? new Date(deal.deal_date).getFullYear() : '—'}
                  </span>

                  {/* Deal type */}
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {deal.deal_type ? deal.deal_type.replace(/_/g, ' ') : '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Section 3: Market Orders ── */}
      <div className="mb-8">
        <h2
          className="text-base mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Market Orders
        </h2>

        <div
          className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
          style={{ background: 'var(--bg-surface)' }}
        >
          {network.market_orders.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              No orders on record
            </p>
          ) : (
            <>
              {/* Header row */}
              <div
                className="grid text-xs font-semibold tracking-wider uppercase px-4 py-2.5 border-b border-[var(--border-subtle)]"
                style={{
                  gridTemplateColumns: '3fr 1.2fr 1.2fr 1.2fr 1fr',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface-alt)',
                }}
              >
                <span>Show Title</span>
                <span>Genre</span>
                <span>Format</span>
                <span>Date</span>
                <span>Source</span>
              </div>

              {network.market_orders.map((order) => (
                <div
                  key={order.id}
                  className="grid items-center px-4 py-3 border-b border-[var(--border-subtle)] last:border-0"
                  style={{ gridTemplateColumns: '3fr 1.2fr 1.2fr 1.2fr 1fr' }}
                >
                  {/* Show title */}
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {order.show_title ?? '—'}
                  </span>

                  {/* Genre */}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {order.genre ?? '—'}
                  </span>

                  {/* Format */}
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {order.format ?? '—'}
                  </span>

                  {/* Date — formatted as locale string with fallback */}
                  <span
                    className="text-xs tabular-nums"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
                  >
                    {order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}
                  </span>

                  {/* Source */}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {order.source ?? '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
