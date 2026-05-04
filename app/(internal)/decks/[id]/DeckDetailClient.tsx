'use client';
// DeckDetailClient — interactive editor for a single deck site.
// Features:
//   - Horizontal filmstrip of all slides with thumbnails
//   - Click a slide to expand it into an editor panel below the filmstrip
//   - Editor shows: captured image | AI image side-by-side + editable fields
//   - Capture from Canva / Generate AI Images / Publish / View Live action buttons
//   - Section type dropdown for each slide (hero/stats/content/talent/ask/cta)
//
// All mutations POST to the existing /api/deck-sites/[id]/* routes.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  logline: string | null;
  canva_url: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  network_target: string | null;
  ep_name: string | null;
  status: string;
  visibility: string;
  gate_password: string | null;
  slide_count: number;
  created_at: number;
  updated_at: number;
}

interface DeckSlide {
  id: string;
  deck_site_id: string;
  slide_order: number;
  slide_image_path: string | null;
  ai_image_path: string | null;
  ai_prompt: string | null;
  section_label: string | null;
  section_type: string;
  heading: string | null;
  body: string | null;
  stats_json: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Section type options
// ---------------------------------------------------------------------------

const SECTION_TYPES = [
  { value: 'hero',    label: 'Hero' },
  { value: 'stats',   label: 'Stats' },
  { value: 'content', label: 'Content' },
  { value: 'talent',  label: 'Talent' },
  { value: 'ask',     label: 'The Ask' },
  { value: 'cta',     label: 'CTA' },
];

// ---------------------------------------------------------------------------
// Slide filmstrip thumbnail
// ---------------------------------------------------------------------------

function FilmstripThumb({
  slide,
  isActive,
  onClick,
}: {
  slide: DeckSlide;
  isActive: boolean;
  onClick: () => void;
}) {
  const imgSrc = slide.ai_image_path ?? slide.slide_image_path ?? null;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Thumbnail image box */}
      <div style={{
        width: 140,
        height: 79, // 16/9 aspect of 140px
        borderRadius: 6,
        overflow: 'hidden',
        border: isActive ? '2px solid #CC1212' : '2px solid var(--border-subtle)',
        background: '#0D1120',
        transition: 'border-color 150ms ease',
        position: 'relative',
      }}>
        {imgSrc && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={`Slide ${slide.slide_order}`}
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.15)',
            fontSize: 11,
            fontFamily: "'Roboto Condensed', sans-serif",
          }}>
            {slide.slide_order}
          </div>
        )}
        {/* Slide number chip */}
        <div style={{
          position: 'absolute',
          top: 4,
          left: 4,
          background: isActive ? '#CC1212' : 'rgba(0,0,0,0.65)',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 5px',
          borderRadius: 3,
          fontFamily: "'Roboto Condensed', sans-serif",
        }}>
          {slide.slide_order}
        </div>
      </div>
      {/* Section label under thumbnail */}
      <span style={{
        fontSize: 10,
        color: isActive ? '#CC1212' : 'var(--text-muted)',
        textAlign: 'center',
        lineHeight: 1.3,
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: "'Roboto Condensed', sans-serif",
        fontWeight: isActive ? 700 : 400,
        letterSpacing: '0.06em',
      }}>
        {slide.section_label ?? `Slide ${slide.slide_order}`}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slide editor panel (shown when a slide is selected)
// ---------------------------------------------------------------------------

function SlideEditor({ slide, onSaved }: { slide: DeckSlide; onSaved: (updated: DeckSlide) => void }) {
  const [fields, setFields] = useState({
    section_label: slide.section_label ?? '',
    section_type:  slide.section_type ?? 'content',
    heading:       slide.heading ?? '',
    body:          slide.body ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const set = (field: keyof typeof fields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // PUT to the slides sub-resource — assumed endpoint pattern matches the API
      const res = await fetch(`/api/deck-sites/${slide.deck_site_id}/slides/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { data } = await res.json();
      onSaved(data);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const hasCaptured = !!slide.slide_image_path;
  const hasAi       = !!slide.ai_image_path;

  return (
    <div style={{ padding: '24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Image comparison row */}
      {(hasCaptured || hasAi) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Captured slide */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'Roboto Condensed', sans-serif" }}>
              Captured Slide
            </div>
            {hasCaptured ? (
              <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#0D1120', border: '1px solid var(--border-subtle)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.slide_image_path!} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ) : (
              <div style={{ borderRadius: 6, aspectRatio: '16/9', background: '#0D1120', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No capture yet
              </div>
            )}
          </div>

          {/* AI-generated image */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#F5A623', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'Roboto Condensed', sans-serif" }}>
              AI Generated
            </div>
            {hasAi ? (
              <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#0D1120', border: '1px solid rgba(245,166,35,0.3)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.ai_image_path!} alt="AI generated" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ) : (
              <div style={{ borderRadius: 6, aspectRatio: '16/9', background: 'rgba(245,166,35,0.04)', border: '1px dashed rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(245,166,35,0.5)', fontSize: 12 }}>
                No AI image yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editable fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Section Label</span>
          <input type="text" value={fields.section_label} onChange={set('section_label')} placeholder="THE CONCEPT" style={inputStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Section Type</span>
          <select value={fields.section_type} onChange={set('section_type')} style={{ ...inputStyle, cursor: 'pointer' }}>
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Heading</span>
        <input type="text" value={fields.heading} onChange={set('heading')} placeholder="A CRIME WAVE NOBODY SAW COMING" style={inputStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Body Copy</span>
        <textarea
          value={fields.body}
          onChange={set('body')}
          placeholder="Body copy for this section…"
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }}
        />
      </label>

      {/* Save button + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving…' : 'Save Slide'}
        </button>
        {saveMsg && (
          <span style={{ fontSize: 12, color: saveMsg === 'Saved' ? '#22C55E' : 'var(--accent)' }}>
            {saveMsg}
          </span>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

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
};

// ---------------------------------------------------------------------------
// Action bar button
// ---------------------------------------------------------------------------

function ActionBtn({
  children,
  onClick,
  variant = 'ghost',
  disabled = false,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary' | 'danger';
  disabled?: boolean;
  href?: string;
}) {
  const colors: Record<string, React.CSSProperties> = {
    primary: { background: '#CC1212', color: '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    danger:  { background: 'transparent', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' },
  };

  const style: React.CSSProperties = {
    ...colors[variant],
    padding: '7px 14px',
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    transition: 'opacity 150ms ease',
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main export — DeckDetailClient
// ---------------------------------------------------------------------------

export default function DeckDetailClient({
  site: initialSite,
  slides: initialSlides,
}: {
  site: DeckSite;
  slides: DeckSlide[];
}) {
  const router = useRouter();
  const [site, setSite]     = useState<DeckSite>(initialSite);
  const [slides, setSlides] = useState<DeckSlide[]>(initialSlides);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(
    initialSlides[0]?.id ?? null
  );
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? null;

  /** Run a POST action on the deck and show inline status feedback */
  const runAction = async (action: string, label: string) => {
    setActionStatus((s) => ({ ...s, [action]: `${label}…` }));
    try {
      const res = await fetch(`/api/deck-sites/${site.id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setActionStatus((s) => ({ ...s, [action]: 'Done ✓' }));
      setTimeout(() => setActionStatus((s) => ({ ...s, [action]: '' })), 3000);
      // Refresh the page to pick up new slide data
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setActionStatus((s) => ({ ...s, [action]: msg }));
    }
  };

  const handlePublish = async () => {
    const confirmed = window.confirm('Publish this deck? It will be visible at /deck/' + site.slug);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/deck-sites/${site.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      setSite(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish failed');
    }
  };

  const handleSlideUpdate = (updated: DeckSlide) => {
    setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* ── Header / Action Bar ─────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 28px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {/* Back breadcrumb */}
        <button
          onClick={() => router.push('/decks')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← Decks
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

        {/* Title + status badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Barlow Condensed', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
              {site.title}
            </h1>
            {/* Status chip */}
            <span style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: site.status === 'published' ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)',
              color: site.status === 'published' ? '#22C55E' : '#F5A623',
              fontFamily: "'Roboto Condensed', sans-serif",
            }}>
              {site.status.toUpperCase()}
            </span>
          </div>
          {site.format && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>
              {[site.format, site.genre].filter(Boolean).join(' · ')}
              {site.slide_count > 0 && ` · ${site.slide_count} slides`}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ActionBtn
            onClick={() => runAction('capture', 'Capturing')}
            disabled={!!actionStatus['capture']}
          >
            {actionStatus['capture'] || '📷 Capture from Canva'}
          </ActionBtn>

          <ActionBtn
            onClick={() => runAction('generate', 'Generating')}
            disabled={!!actionStatus['generate']}
          >
            {actionStatus['generate'] || '✨ Generate AI Images'}
          </ActionBtn>

          {site.status !== 'published' ? (
            <ActionBtn variant="primary" onClick={handlePublish}>
              🚀 Publish
            </ActionBtn>
          ) : (
            <ActionBtn
              variant="ghost"
              href={`/deck/${site.slug}`}
            >
              View Live ↗
            </ActionBtn>
          )}

          {site.status === 'published' && (
            <ActionBtn
              onClick={() => window.open(`/deck/${site.slug}`, '_blank')}
            >
              View Live ↗
            </ActionBtn>
          )}
        </div>
      </div>

      {/* ── Filmstrip ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        overflowX: 'auto',
      }}>
        {slides.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
            No slides captured yet. Use &ldquo;Capture from Canva&rdquo; to import slides.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: 'max-content' }}>
            {slides.map((slide) => (
              <FilmstripThumb
                key={slide.id}
                slide={slide}
                isActive={slide.id === activeSlideId}
                onClick={() => setActiveSlideId(slide.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Slide editor (expands below filmstrip) ──────────────────────────── */}
      {activeSlide && (
        <div style={{ margin: '24px 28px 0', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Panel header */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}>
              Slide {activeSlide.slide_order} — {activeSlide.section_label ?? 'Untitled'}
            </span>
            <span style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: 'rgba(148,163,184,0.1)',
              color: 'var(--text-muted)',
              fontFamily: "'Roboto Condensed', sans-serif",
            }}>
              {activeSlide.section_type}
            </span>
          </div>
          <SlideEditor slide={activeSlide} onSaved={handleSlideUpdate} />
        </div>
      )}

      {/* Bottom padding */}
      <div style={{ height: 48 }} />
    </div>
  );
}
