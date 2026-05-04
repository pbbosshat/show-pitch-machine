'use client';
// DecksClient — interactive client layer for the /decks admin page.
// Handles:
//   - Status filter tabs (All / Draft / Published)
//   - "+ New Deck" modal with create form
//   - Card grid rendering with thumbnails, badges, and action buttons
//
// Receives the server-fetched deck list via props so the initial render
// is fully SSR (no client-side loading flash).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  status: string;
  visibility: string;
  slide_count: number;
  created_at: number;
  updated_at: number;
}

interface NewDeckForm {
  title: string;
  canva_url: string;
  genre: string;
  format: string;
  ep_count: string;
  network_target: string;
  ep_name: string;
  logline: string;
}

const EMPTY_FORM: NewDeckForm = {
  title: '',
  canva_url: '',
  genre: '',
  format: '',
  ep_count: '',
  network_target: '',
  ep_name: '',
  logline: '',
};

// ---------------------------------------------------------------------------
// Status / visibility badge helpers
// ---------------------------------------------------------------------------

/** Rendered for deck status: draft (amber) or published (green) */
function StatusBadge({ status }: { status: string }) {
  const color = status === 'published' ? '#22C55E' : '#F5A623';
  const bg    = status === 'published' ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      borderRadius: 4,
      background: bg,
      color,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      fontFamily: "'Roboto Condensed', sans-serif",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {status.toUpperCase()}
    </span>
  );
}

/** Rendered for visibility: public (green globe), internal (gray eye-slash), gated (amber lock) */
function VisibilityBadge({ visibility }: { visibility: string }) {
  const configs: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    public:   { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  icon: '🌐', label: 'PUBLIC' },
    internal: { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', icon: '👁',  label: 'INTERNAL' },
    gated:    { color: '#F5A623', bg: 'rgba(245,166,35,0.1)',   icon: '🔒', label: 'GATED' },
  };
  const c = configs[visibility] ?? configs.internal;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 8px',
      borderRadius: 4,
      background: c.bg,
      color: c.color,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      fontFamily: "'Roboto Condensed', sans-serif",
    }}>
      <span style={{ fontSize: 10 }}>{c.icon}</span>
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Deck card thumbnail
// ---------------------------------------------------------------------------

function DeckThumbnail({ deck }: { deck: DeckSite }) {
  // Convention: slide_1.png lives at /deck-assets/{id}/slides/slide_1.png
  const thumbPath = `/deck-assets/${deck.id}/slides/slide_1.png`;
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed || deck.slide_count === 0) {
    // Dark placeholder with MY logo centered
    return (
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        background: 'linear-gradient(135deg, #0D1120 0%, #080D18 100%)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: 'rgba(204,18,18,0.5)', fontFamily: "'Oswald', sans-serif" }}>MY</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', fontFamily: "'Roboto Condensed', sans-serif", textTransform: 'uppercase' }}>
          No slides yet
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#0D1120', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbPath}
        alt={`${deck.title} slide 1`}
        onError={() => setImgFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deck card
// ---------------------------------------------------------------------------

function DeckCard({ deck }: { deck: DeckSite }) {
  const router = useRouter();
  const isPublished = deck.status === 'published';

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 10,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 150ms ease, border-color 150ms ease',
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong, #CBD5E1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Thumbnail */}
      <div style={{ padding: '10px 10px 0' }}>
        <DeckThumbnail deck={deck} />
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Status + visibility badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusBadge status={deck.status} />
          <VisibilityBadge visibility={deck.visibility} />
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.25,
          margin: 0,
          fontFamily: "'Barlow Condensed', 'Oswald', sans-serif",
        }}>
          {deck.title}
        </h3>

        {/* Format / genre line */}
        {(deck.format || deck.genre) && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            {[deck.format, deck.genre].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Slide count */}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          {deck.slide_count} {deck.slide_count === 1 ? 'slide' : 'slides'}
        </p>
      </div>

      {/* Action buttons */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '10px 16px',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {isPublished ? (
          <>
            {/* Published deck: View + Copy URL */}
            <button
              onClick={() => window.open(`/deck/${deck.slug}`, '_blank')}
              style={btnStyle('ghost')}
            >
              View
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/deck/${deck.slug}`)}
              style={btnStyle('ghost')}
            >
              Copy URL
            </button>
          </>
        ) : (
          <>
            {/* Draft deck: Capture + Edit */}
            <button
              onClick={async () => {
                await fetch(`/api/deck-sites/${deck.id}/capture`, { method: 'POST' });
              }}
              style={btnStyle('ghost')}
            >
              Capture
            </button>
            <button
              onClick={() => router.push(`/decks/${deck.id}`)}
              style={btnStyle('primary')}
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Shared button style factory — keeps card buttons consistent */
function btnStyle(variant: 'ghost' | 'primary'): React.CSSProperties {
  if (variant === 'primary') {
    return {
      padding: '6px 14px',
      borderRadius: 6,
      border: 'none',
      background: 'var(--accent)',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'opacity 150ms ease',
    };
  }
  return {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 150ms ease',
  };
}

// ---------------------------------------------------------------------------
// New Deck form (inside the modal)
// ---------------------------------------------------------------------------

function NewDeckForm({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [form, setForm]     = useState<NewDeckForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (field: keyof NewDeckForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/deck-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:          form.title.trim(),
          canva_url:      form.canva_url.trim()      || undefined,
          genre:          form.genre.trim()          || undefined,
          format:         form.format.trim()         || undefined,
          ep_count:       form.ep_count.trim()       || undefined,
          network_target: form.network_target.trim() || undefined,
          ep_name:        form.ep_name.trim()        || undefined,
          logline:        form.logline.trim()        || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { data } = await res.json();
      onSuccess(data.id);
    } catch (err) {
      // Show exact error message per design principles — no generic "failed" copy
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Required */}
      <FormField label="Title *">
        <input
          type="text"
          value={form.title}
          onChange={set('title')}
          placeholder="e.g. Gotta Catch Em All"
          style={inputStyle}
          required
        />
      </FormField>

      <FormField label="Canva URL">
        <input type="url" value={form.canva_url} onChange={set('canva_url')} placeholder="https://www.canva.com/design/..." style={inputStyle} />
      </FormField>

      {/* Two-column row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="Genre">
          <input type="text" value={form.genre} onChange={set('genre')} placeholder="e.g. Crime" style={inputStyle} />
        </FormField>
        <FormField label="Format">
          <input type="text" value={form.format} onChange={set('format')} placeholder="e.g. 4-Part Investigation" style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="Episode Count">
          <input type="text" value={form.ep_count} onChange={set('ep_count')} placeholder="e.g. 4 × 60 min" style={inputStyle} />
        </FormField>
        <FormField label="Network Target">
          <input type="text" value={form.network_target} onChange={set('network_target')} placeholder="e.g. Investigation Discovery" style={inputStyle} />
        </FormField>
      </div>

      <FormField label="Executive Producer">
        <input type="text" value={form.ep_name} onChange={set('ep_name')} placeholder="e.g. Jane Smith" style={inputStyle} />
      </FormField>

      <FormField label="Logline">
        <textarea
          value={form.logline}
          onChange={set('logline')}
          placeholder="One-sentence pitch…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
        />
      </FormField>

      {/* Error display — shows exact API error message */}
      {error && (
        <p style={{ fontSize: 13, color: 'var(--accent)', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        style={{
          ...btnStyle('primary'),
          padding: '10px 18px',
          fontSize: 13,
          letterSpacing: '0.04em',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Creating…' : 'Create Deck'}
      </button>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
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
// Main export — DecksClient
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'draft' | 'published';

export default function DecksClient({ initialDecks }: { initialDecks: DeckSite[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = initialDecks.filter((d) => {
    if (filter === 'all')       return true;
    if (filter === 'draft')     return d.status === 'draft';
    if (filter === 'published') return d.status === 'published';
    return true;
  });

  const handleNewDeckSuccess = (id: string) => {
    setModalOpen(false);
    startTransition(() => {
      router.push(`/decks/${id}`);
    });
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all',       label: `All (${initialDecks.length})` },
    { id: 'draft',     label: `Draft (${initialDecks.filter((d) => d.status === 'draft').length})` },
    { id: 'published', label: `Published (${initialDecks.filter((d) => d.status === 'published').length})` },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* MY crimson logo accent */}
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#CC1212',
            fontFamily: "'Oswald', 'Barlow Condensed', sans-serif",
            letterSpacing: '-0.01em',
          }}>
            MY
          </span>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            fontFamily: "'Barlow Condensed', 'Oswald', sans-serif",
            letterSpacing: '-0.01em',
          }}>
            Deck Sites
          </h1>
        </div>

        {/* + New Deck CTA */}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#CC1212',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.03em',
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          New Deck
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: filter === tab.id ? '#CC1212' : 'var(--border-subtle)',
              background: filter === tab.id ? 'rgba(204,18,18,0.08)' : 'transparent',
              color: filter === tab.id ? '#CC1212' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: filter === tab.id ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deck card grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>🎬</div>
          <p style={{ fontSize: 14, margin: 0 }}>
            {filter === 'all' ? 'No deck sites yet. Create the first one.' : `No ${filter} decks.`}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {filtered.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}

      {/* Create Deck modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Deck Site">
        <NewDeckForm onSuccess={handleNewDeckSuccess} />
      </Modal>
    </div>
  );
}
