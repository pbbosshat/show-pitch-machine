'use client';

// NetworkDetailClient — tabbed interface for the network detail page.
// Splits the three static sections (Contacts, Deals, Orders) into pill-tab panels
// so users can focus on one dataset at a time without scrolling past the others.
// Receives the full NetworkDetail object from the server component parent.

import { useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import type { NetworkDetail } from '@/types';

// Props — just the fully-fetched network object from the server component
interface Props {
  network: NetworkDetail;
}

// Tab identifiers — one per data section
type Tab = 'contacts' | 'deals' | 'orders';

// Map activity_status string to a Badge variant the component accepts.
// Duplicated here from the server page so both render paths stay self-contained.
function statusVariant(status: string): 'active' | 'quiet' | 'unknown' {
  if (status === 'active') return 'active';
  if (status === 'quiet') return 'quiet';
  return 'unknown';
}

export default function NetworkDetailClient({ network }: Props) {
  // Active tab state — defaults to Contacts as the primary dataset
  const [activeTab, setActiveTab] = useState<Tab>('contacts');

  return (
    <div>
      {/* ── Tab pill row ── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('contacts')}
          className="px-3 py-1.5 text-xs font-medium rounded-md border"
          style={{
            background: activeTab === 'contacts' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'contacts' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'contacts' ? 'var(--accent)' : 'var(--border-subtle)',
            transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            cursor: 'pointer',
          }}
        >
          Contacts{network.contacts.length > 0 && <span> ({network.contacts.length})</span>}
        </button>

        <button
          onClick={() => setActiveTab('deals')}
          className="px-3 py-1.5 text-xs font-medium rounded-md border"
          style={{
            background: activeTab === 'deals' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'deals' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'deals' ? 'var(--accent)' : 'var(--border-subtle)',
            transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            cursor: 'pointer',
          }}
        >
          Deals{network.recent_deals.length > 0 && <span> ({network.recent_deals.length})</span>}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className="px-3 py-1.5 text-xs font-medium rounded-md border"
          style={{
            background: activeTab === 'orders' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'orders' ? '#fff' : 'var(--text-secondary)',
            borderColor: activeTab === 'orders' ? 'var(--accent)' : 'var(--border-subtle)',
            transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
            cursor: 'pointer',
          }}
        >
          Orders{network.market_orders.length > 0 && <span> ({network.market_orders.length})</span>}
        </button>
      </div>

      {/* ── Contacts tab panel ── */}
      {activeTab === 'contacts' && (
        <div className="mb-8">
          {/* Active buyers callout — shown above the table when relevant */}
          {network.contacts.some((c) => c.is_buyer_seat === 1) && (
            <p className="text-xs mb-3" style={{ color: 'var(--status-greenlit)' }}>
              Active buyers
            </p>
          )}

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

                {network.contacts.map((contact) => (
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
      )}

      {/* ── Deals tab panel ── */}
      {activeTab === 'deals' && (
        <div className="mb-8">
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
      )}

      {/* ── Orders tab panel ── */}
      {activeTab === 'orders' && (
        <div className="mb-8">
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
      )}
    </div>
  );
}
