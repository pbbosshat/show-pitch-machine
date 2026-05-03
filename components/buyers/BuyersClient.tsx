'use client';
// BuyersClient — search + filter + table for the buyers directory.
// Receives all buyers as a prop (already fetched server-side) and filters in-memory.
// Row click navigates to the buyer profile page.

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Input from '@/components/ui/Input';
import StatusDot from '@/components/ui/StatusDot';
import Badge from '@/components/ui/Badge';
import type { BuyerContact, ActivityStatus } from '@/types';

type StatusFilter = 'all' | ActivityStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'active',  label: 'Active' },
  { value: 'quiet',   label: 'Quiet' },
  { value: 'unknown', label: 'Unknown' },
];

interface BuyersClientProps {
  initialBuyers: BuyerContact[];
}

export default function BuyersClient({ initialBuyers }: BuyersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Filter buyers by search text and activity status — runs in-memory, no extra fetch
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialBuyers.filter((b) => {
      const matchesStatus = statusFilter === 'all' || b.activity_status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.title ?? '').toLowerCase().includes(q) ||
        (b.mandate_statement ?? '').toLowerCase().includes(q)
      );
    });
  }, [initialBuyers, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search + filter controls */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search buyers, titles, mandates…"
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Activity status pills */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border"
              style={{
                background: statusFilter === f.value ? 'var(--accent)' : 'transparent',
                color: statusFilter === f.value ? '#fff' : 'var(--text-secondary)',
                borderColor: statusFilter === f.value ? 'var(--accent)' : 'var(--border-subtle)',
                transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border border-[var(--border-subtle)] overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* Table header */}
        <div
          className="grid text-xs font-semibold tracking-wider uppercase px-4 py-2.5 border-b border-[var(--border-subtle)]"
          style={{
            gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1.5fr',
            color: 'var(--text-muted)',
            background: 'var(--bg-surface-alt)',
          }}
        >
          <span>Name</span>
          <span>Title</span>
          <span>Status</span>
          <span>Orders/90d</span>
          <span>Last Greenlit</span>
          <span>Last MYE Contact</span>
        </div>

        {/* Table rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No buyers match your search
          </div>
        ) : (
          filtered.map((buyer) => (
            <div
              key={buyer.id}
              className="grid items-center px-4 py-3 border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--bg-surface-alt)]"
              style={{
                gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1.5fr',
                transition: 'background var(--motion-base) var(--ease)',
              }}
              onClick={() => router.push(`/buyers/${buyer.id}`)}
            >
              {/* Name */}
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {buyer.name}
              </span>

              {/* Title */}
              <span className="text-sm truncate pr-2" style={{ color: 'var(--text-secondary)' }}>
                {buyer.title ?? '—'}
              </span>

              {/* Activity dot + badge */}
              <span className="flex items-center gap-2">
                <StatusDot status={buyer.activity_status} />
                <Badge
                  label={buyer.activity_status}
                  variant={buyer.activity_status as 'active' | 'quiet' | 'unknown'}
                />
              </span>

              {/* Orders last 90 days */}
              <span
                className="text-sm tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}
              >
                {buyer.orders_last_90_days}
              </span>

              {/* Last greenlit */}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {buyer.last_greenlit_date
                  ? formatDistanceToNow(new Date(buyer.last_greenlit_date), { addSuffix: true })
                  : '—'}
              </span>

              {/* Last MYE contact */}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {buyer.last_mye_contact_date
                  ? formatDistanceToNow(new Date(buyer.last_mye_contact_date), { addSuffix: true })
                  : 'No history'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
