'use client';
// DashboardBuyerCards — client island for the Active Buyers bento section.
// Extracted from the server dashboard page so the pencil edit button and modal
// can live in client state without making the entire page a client component.
// Each card links to /buyers/:id; the pencil button opens an inline edit modal.

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import StatusDot from '@/components/ui/StatusDot';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { BuyerContact } from '@/types';

interface DashboardBuyerCardsProps {
  initialBuyers: BuyerContact[];
}

// Pencil SVG — inline edit icon, consistent with the design system edit pattern
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function DashboardBuyerCards({ initialBuyers }: DashboardBuyerCardsProps) {
  // buyers tracks local state so edits reflect immediately without a page reload
  const [buyers, setBuyers] = useState<BuyerContact[]>(initialBuyers);

  // Edit modal state
  const [editingBuyer, setEditingBuyer] = useState<BuyerContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    title: '',
    activity_status: 'active' as BuyerContact['activity_status'],
    mandate_statement: '',
    notes: '',
  });

  function closeModal() {
    setEditingBuyer(null);
    setSaveError(null);
    setSaving(false);
  }

  // PUT edited fields to the API and merge into local state on success
  async function handleSave() {
    if (!editingBuyer) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/buyers/${editingBuyer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      // Merge updated values back into the local buyers list
      setBuyers((prev) =>
        prev.map((b) =>
          b.id === editingBuyer.id
            ? {
                ...b,
                title: formValues.title || null,
                activity_status: formValues.activity_status,
                mandate_statement: formValues.mandate_statement || null,
                notes: formValues.notes || null,
              }
            : b
        )
      );
      closeModal();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (buyers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
          No active buyers found
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {buyers.map((buyer) => (
          // Wrapper div provides relative positioning context for the absolute pencil button
          <div key={buyer.id} style={{ position: 'relative' }}>
            <a href={`/buyers/${buyer.id}`}>
              <Card hoverable>
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {buyer.name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {buyer.title ?? 'Executive'}
                </p>

                <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                  <StatusDot status={buyer.activity_status} />
                  {buyer.last_greenlit_date
                    ? <span>greenlit {formatDistanceToNow(new Date(buyer.last_greenlit_date), { addSuffix: true })}</span>
                    : null}
                  <span>{buyer.orders_last_90_days} orders/90d</span>
                </div>

                {buyer.last_mye_contact_date && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Last contact: {formatDistanceToNow(new Date(buyer.last_mye_contact_date), { addSuffix: true })}
                  </p>
                )}

                {buyer.mandate_statement && (
                  <p className="text-xs mt-2 italic truncate" style={{ color: 'var(--text-secondary)' }}>
                    {buyer.mandate_statement}
                  </p>
                )}
              </Card>
            </a>

            {/* Pencil button — positioned outside the <a> so it doesn't trigger navigation */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFormValues({
                  title: buyer.title ?? '',
                  activity_status: buyer.activity_status,
                  mandate_statement: buyer.mandate_statement ?? '',
                  notes: buyer.notes ?? '',
                });
                setEditingBuyer(buyer);
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                zIndex: 10,
                padding: '4px 6px',
                borderRadius: 4,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
              title="Edit"
            >
              <PencilIcon />
            </button>
          </div>
        ))}
      </div>

      {/* ── Inline Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingBuyer}
        onClose={closeModal}
        title={editingBuyer?.name ?? 'Edit Buyer'}
      >
        <div>
          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Title
            </label>
            <input
              value={formValues.title}
              onChange={(e) => setFormValues((v) => ({ ...v, title: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Activity Status */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Activity Status
            </label>
            <select
              value={formValues.activity_status}
              onChange={(e) => setFormValues((v) => ({ ...v, activity_status: e.target.value as BuyerContact['activity_status'] }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="active">active</option>
              <option value="quiet">quiet</option>
              <option value="unknown">unknown</option>
            </select>
          </div>

          {/* Mandate Statement */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Mandate Statement
            </label>
            <textarea
              rows={2}
              value={formValues.mandate_statement}
              onChange={(e) => setFormValues((v) => ({ ...v, mandate_statement: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Notes
            </label>
            <textarea
              rows={2}
              value={formValues.notes}
              onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Error display — exact message per design system rules */}
          {saveError && <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 8 }}>{saveError}</p>}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
