'use client';
// DashboardGreenlits — client island for the Today's Greenlits bento section.
// Extracted from the server dashboard page so the pencil edit button and modal
// can live in client state without converting the entire dashboard to a client component.
// Each show card has an absolute-positioned pencil button that opens an inline edit modal.

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Show } from '@/types';

interface DashboardGreenlitsProps {
  initialGreenlits: Show[];
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

export default function DashboardGreenlits({ initialGreenlits }: DashboardGreenlitsProps) {
  // greenlits tracks local state so edits reflect immediately without a page reload
  const [greenlits, setGreenlits] = useState<Show[]>(initialGreenlits);

  // Edit modal state
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    title: '',
    network: '',
    genre: '',
    episode_count: '',
    status: '',
    notes: '',
  });

  function closeModal() {
    setEditingShow(null);
    setSaveError(null);
    setSaving(false);
  }

  // PUT edited fields to the API and merge into local state on success
  async function handleSave() {
    if (!editingShow) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/shows/${editingShow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formValues.title,
          network: formValues.network || null,
          genre: formValues.genre || null,
          episode_count: formValues.episode_count ? Number(formValues.episode_count) : null,
          status: formValues.status || null,
          notes: formValues.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      // Merge updated values back into the local greenlits list
      setGreenlits((prev) =>
        prev.map((s) =>
          s.id === editingShow.id
            ? {
                ...s,
                title: formValues.title,
                network: formValues.network || null,
                genre: formValues.genre || null,
                episode_count: formValues.episode_count ? Number(formValues.episode_count) : null,
                status: formValues.status || null,
              }
            : s
        )
      );
      closeModal();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (greenlits.length === 0) {
    return (
      <Card>
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
          No greenlits today yet
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {greenlits.map((show) => (
          // Wrapper div provides relative positioning context for the absolute pencil button
          <div key={show.id} style={{ position: 'relative' }}>
            <Card hoverable>
              <p
                className="text-sm font-bold leading-tight"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
              >
                {show.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {show.network ?? 'Network TBD'}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {show.genre && <Badge label={show.genre} variant="muted" />}
                {show.episode_count && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {show.episode_count} eps
                  </span>
                )}
              </div>
            </Card>

            {/* Pencil button — absolutely positioned over the card, doesn't navigate */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFormValues({
                  title: show.title,
                  network: show.network ?? '',
                  genre: show.genre ?? '',
                  episode_count: show.episode_count?.toString() ?? '',
                  status: show.status ?? '',
                  notes: '',
                });
                setEditingShow(show);
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
        isOpen={!!editingShow}
        onClose={closeModal}
        title={editingShow?.title ?? 'Edit Show'}
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

          {/* Network */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Network
            </label>
            <input
              value={formValues.network}
              onChange={(e) => setFormValues((v) => ({ ...v, network: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Genre */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Genre
            </label>
            <input
              value={formValues.genre}
              onChange={(e) => setFormValues((v) => ({ ...v, genre: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Episode Count */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Episode Count
            </label>
            <input
              type="number"
              value={formValues.episode_count}
              onChange={(e) => setFormValues((v) => ({ ...v, episode_count: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Status
            </label>
            <input
              value={formValues.status}
              onChange={(e) => setFormValues((v) => ({ ...v, status: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
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
