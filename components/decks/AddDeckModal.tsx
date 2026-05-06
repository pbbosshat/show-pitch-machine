'use client';
// AddDeckModal — lightweight "Add Deck" form for creating a native deck record
// without a Canva URL. Use this when you want to build a deck from scratch inside
// Show Pitch Machine. For importing an existing Canva presentation, use the
// "Import Canva" button instead.
//
// Props:
//   onClose — called when the user dismisses the modal (cancel or Escape)
//
// On success: navigates to /decks/{newId} via router.push so the user lands
// on the deck detail/edit page immediately.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

// ---------------------------------------------------------------------------
// Form shape — maps 1-to-1 with the fields the task specified
// ---------------------------------------------------------------------------

interface AddDeckForm {
  title: string;
  subtitle: string;
  genre: string;
  format: string;
  ep_count: string;
  rights_type: string;
}

const EMPTY: AddDeckForm = {
  title:      '',
  subtitle:   '',
  genre:      '',
  format:     '',
  ep_count:   '',
  rights_type: '',
};

// ---------------------------------------------------------------------------
// Shared mini-component: labelled field wrapper
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: 'var(--text-muted)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: 'inherit',
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// Shared input style — matches DecksClient.tsx inputStyle exactly
const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-app)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease',
};

// ---------------------------------------------------------------------------
// AddDeckModal
// ---------------------------------------------------------------------------

export default function AddDeckModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [form, setForm]     = useState<AddDeckForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  // Exact error text from the API, never a generic message
  const [error, setError]   = useState<string | null>(null);

  // Generic field setter — avoids one handler per field
  const set = (field: keyof AddDeckForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side guard — title is the only required field
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/deck-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:      form.title.trim(),
          subtitle:   form.subtitle.trim()   || undefined,
          genre:      form.genre.trim()      || undefined,
          format:     form.format.trim()     || undefined,
          ep_count:   form.ep_count.trim()   || undefined,
          rights_type: form.rights_type.trim() || undefined,
          // No canva_url — this is a native deck, not a Canva import
        }),
      });

      if (!res.ok) {
        // Surface the exact server error — never swallow it
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { data } = await res.json();
      // Navigate to the new deck's edit page
      router.push(`/decks/${data.id}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New Deck">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Title — required */}
        <Field label="Title *">
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Gotta Catch Em All"
            style={input}
            required
            autoFocus
          />
        </Field>

        {/* Subtitle / tagline */}
        <Field label="Subtitle">
          <input
            type="text"
            value={form.subtitle}
            onChange={set('subtitle')}
            placeholder="Tagline or logline"
            style={input}
          />
        </Field>

        {/* Genre + Format in a two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Genre">
            <input
              type="text"
              value={form.genre}
              onChange={set('genre')}
              placeholder="e.g. Crime"
              style={input}
            />
          </Field>
          <Field label="Format">
            <input
              type="text"
              value={form.format}
              onChange={set('format')}
              placeholder="e.g. Limited Series"
              style={input}
            />
          </Field>
        </div>

        {/* Episode Count + Rights Type in a two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Episode Count">
            <input
              type="text"
              value={form.ep_count}
              onChange={set('ep_count')}
              placeholder="e.g. 4 × 60 min"
              style={input}
            />
          </Field>
          <Field label="Rights Type">
            <input
              type="text"
              value={form.rights_type}
              onChange={set('rights_type')}
              placeholder="e.g. Worldwide"
              style={input}
            />
          </Field>
        </div>

        {/* Inline error — shows exact API message, never generic text */}
        {error && (
          <p style={{ fontSize: 13, color: 'var(--accent)', margin: 0 }}>
            {error}
          </p>
        )}

        {/* Action row — Cancel (outlined) + Create Deck (primary) */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 18px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 150ms ease',
              opacity: saving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 20px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.03em',
              transition: 'opacity 150ms ease',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {/* Inline spinner shown while the POST is in-flight */}
            {saving && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {saving ? 'Creating…' : 'Create Deck'}
          </button>
        </div>
      </form>

      {/* Spinner keyframe — scoped to this modal, no globals.css changes needed */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Modal>
  );
}
