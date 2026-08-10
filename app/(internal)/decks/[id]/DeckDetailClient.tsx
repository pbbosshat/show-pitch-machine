'use client';
// DeckDetailClient — full-page deck editor that works without Canva.
//
// Two-column layout:
//   Left  (60%) — Deck Info, Content Sections, Sizzle Reels
//   Right (40%) — Settings, Theme
//
// Canva filmstrip + slide editor rendered at the bottom, conditionally, when
// canva_url is set OR slides have been captured.
//
// All mutations call the existing /api/deck-sites/[id]/* routes.
// Exact API error messages are always surfaced — never generic fallbacks.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types (mirror the deck_sites / deck_slides schema exactly)
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
  image_url: string | null;
  vimeo_url: string | null;
  theme_color?: string | null;
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

// Sizzle type — matches deck_sizzles table shape returned by the API
interface DeckSizzle {
  id: string;
  deck_id: string;
  vimeo_url: string;
  title: string | null;
  password: string | null;
  sort_order: number | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Shared style constants — keeps inline style objects DRY
// ---------------------------------------------------------------------------

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

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: 24,
};

const cardHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 16,
  fontFamily: "'Roboto Condensed', sans-serif",
};

// ---------------------------------------------------------------------------
// Section type options (shared between Content Sections and Canva panels)
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
// ActionBtn — reusable header/action bar button
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
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
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
// SaveBtn — inline save button with loading state
// ---------------------------------------------------------------------------

function SaveBtn({
  saving,
  label = 'Save',
  loadingLabel = 'Saving...',
  onClick,
}: {
  saving: boolean;
  label?: string;
  loadingLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        background: 'var(--accent)',
        color: '#fff',
        border: 'none',
        padding: '8px 18px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.6 : 1,
        fontFamily: 'inherit',
      }}
    >
      {saving ? loadingLabel : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SaveMsg — inline success/error feedback
// ---------------------------------------------------------------------------

function SaveMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const isError = msg !== 'Saved' && !msg.startsWith('Done');
  return (
    <span style={{ fontSize: 12, color: isError ? '#F87171' : '#22C55E' }}>
      {msg}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FieldRow — labelled input wrapper
// ---------------------------------------------------------------------------

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — Deck Info
// ---------------------------------------------------------------------------

function DeckInfoCard({ site, onSaved }: { site: DeckSite; onSaved: (updated: DeckSite) => void }) {
  const [fields, setFields] = useState({
    title:          site.title          ?? '',
    subtitle:       site.subtitle       ?? '',
    logline:        site.logline        ?? '',
    genre:          site.genre          ?? '',
    format:         site.format         ?? '',
    ep_count:       site.ep_count       ?? '',
    network_target: site.network_target ?? '',
    image_url:      site.image_url      ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<string | null>(null);

  const set = (field: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/deck-sites/${site.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onSaved(json.data);
      setMsg('Saved');
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>Deck Info</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Title *">
          <input type="text" value={fields.title} onChange={set('title')} placeholder="Show title" style={inputStyle} />
        </FieldRow>
        <FieldRow label="Subtitle">
          <input type="text" value={fields.subtitle} onChange={set('subtitle')} placeholder="Optional tagline" style={inputStyle} />
        </FieldRow>
        <FieldRow label="Logline">
          <textarea value={fields.logline} onChange={set('logline')} placeholder="One-sentence hook..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Genre">
            <input type="text" value={fields.genre} onChange={set('genre')} placeholder="Documentary" style={inputStyle} />
          </FieldRow>
          <FieldRow label="Format">
            <input type="text" value={fields.format} onChange={set('format')} placeholder="Limited Series" style={inputStyle} />
          </FieldRow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Episode Count">
            <input type="text" value={fields.ep_count} onChange={set('ep_count')} placeholder="6" style={inputStyle} />
          </FieldRow>
          <FieldRow label="Network Target">
            <input type="text" value={fields.network_target} onChange={set('network_target')} placeholder="Netflix, HBO..." style={inputStyle} />
          </FieldRow>
        </div>
        <FieldRow label="Cover Image URL">
          <input type="text" value={fields.image_url} onChange={set('image_url')} placeholder="https://..." style={inputStyle} />
        </FieldRow>
        {/* Preview thumbnail when a URL is present */}
        {fields.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fields.image_url} alt="Cover preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-subtle)', display: 'block' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SaveBtn saving={saving} label="Save Info" onClick={handleSave} />
          <SaveMsg msg={msg} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionBlock — one editable content section row inside Card 2
// ---------------------------------------------------------------------------

function SectionBlock({ slide, onSaved, onDeleted }: {
  slide: DeckSlide;
  onSaved: (updated: DeckSlide) => void;
  onDeleted: (id: string) => void;
}) {
  const [fields, setFields] = useState({
    section_label: slide.section_label ?? '',
    section_type:  slide.section_type  ?? 'content',
    heading:       slide.heading       ?? '',
    body:          slide.body          ?? '',
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);

  const set = (field: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/deck-sites/${slide.deck_site_id}/slides/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onSaved(json.data);
      setMsg('Saved');
      setTimeout(() => setMsg(null), 2000);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this section? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/deck-sites/${slide.deck_site_id}/slides/${slide.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      onDeleted(slide.id);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.06em', flexShrink: 0 }}>
          #{slide.slide_order}
        </span>
        <input type="text" value={fields.section_label} onChange={set('section_label')} placeholder="THE CONCEPT" style={{ ...inputStyle, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px' }} />
        <select value={fields.section_type} onChange={set('section_type')} style={{ ...inputStyle, width: 110, flexShrink: 0, padding: '5px 8px', cursor: 'pointer', fontSize: 11 }}>
          {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <FieldRow label="Heading">
        <input type="text" value={fields.heading} onChange={set('heading')} placeholder="Section heading..." style={inputStyle} />
      </FieldRow>
      <FieldRow label="Body">
        <textarea value={fields.body} onChange={set('body')} placeholder="Body copy..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </FieldRow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SaveBtn saving={saving} onClick={handleSave} />
        <SaveMsg msg={msg} />
        <button onClick={handleDelete} disabled={deleting} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1, fontFamily: 'inherit' }}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 2 — Content Sections
// ---------------------------------------------------------------------------

function ContentSectionsCard({ siteId, initialSlides, onSlidesChanged }: {
  siteId: string;
  initialSlides: DeckSlide[];
  onSlidesChanged: (slides: DeckSlide[]) => void;
}) {
  const [slides, setSlides] = useState<DeckSlide[]>(initialSlides);
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const updateAndPropagate = (next: DeckSlide[]) => { setSlides(next); onSlidesChanged(next); };
  const handleSectionSaved   = (updated: DeckSlide) => updateAndPropagate(slides.map((s) => s.id === updated.id ? updated : s));
  const handleSectionDeleted = (id: string) => updateAndPropagate(slides.filter((s) => s.id !== id));

  const handleAddSection = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/deck-sites/${siteId}/slides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide_order: slides.length + 1, section_type: 'content', heading: '', body: '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      updateAndPropagate([...slides, json.data]);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>Content Sections</div>
      {slides.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No sections yet. Add one below.</p>}
      {slides.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {slides.map((slide) => (
            <SectionBlock key={slide.id} slide={slide} onSaved={handleSectionSaved} onDeleted={handleSectionDeleted} />
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ActionBtn onClick={handleAddSection} disabled={adding}>{adding ? 'Adding...' : '+ Add Section'}</ActionBtn>
        {addError && <span style={{ fontSize: 12, color: '#F87171' }}>{addError}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SizzleRow — one editable sizzle reel entry
// ---------------------------------------------------------------------------

function SizzleRow({ sizzle, deckId, onSaved, onDeleted }: {
  sizzle: DeckSizzle;
  deckId: string;
  onSaved: (updated: DeckSizzle) => void;
  onDeleted: (id: string) => void;
}) {
  const [fields, setFields] = useState({ vimeo_url: sizzle.vimeo_url ?? '', title: sizzle.title ?? '', password: sizzle.password ?? '' });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);

  const set = (field: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/deck-sites/${deckId}/sizzles/${sizzle.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onSaved(json.data); setMsg('Saved'); setTimeout(() => setMsg(null), 2000);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this sizzle reel?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/deck-sites/${deckId}/sizzles/${sizzle.id}`, { method: 'DELETE' });
      if (!res.ok) { const json = await res.json().catch(() => ({})); throw new Error(json.error ?? `HTTP ${res.status}`); }
      onDeleted(sizzle.id);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Delete failed'); setDeleting(false); }
  };

  return (
    <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FieldRow label="Vimeo URL">
        <input type="text" value={fields.vimeo_url} onChange={set('vimeo_url')} placeholder="https://vimeo.com/..." style={inputStyle} />
      </FieldRow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FieldRow label="Title (optional)"><input type="text" value={fields.title} onChange={set('title')} placeholder="Sizzle reel" style={inputStyle} /></FieldRow>
        <FieldRow label="Password (optional)"><input type="text" value={fields.password} onChange={set('password')} placeholder="secret" style={inputStyle} /></FieldRow>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SaveBtn saving={saving} onClick={handleSave} />
        <SaveMsg msg={msg} />
        <button onClick={handleDelete} disabled={deleting} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1, fontFamily: 'inherit' }}>
          {deleting ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddSizzleForm — inline form for adding a new sizzle reel
// ---------------------------------------------------------------------------

function AddSizzleForm({ deckId, sortOrder, onAdded, onCancel }: {
  deckId: string;
  sortOrder: number;
  onAdded: (sizzle: DeckSizzle) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState({ vimeo_url: '', title: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (field: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!fields.vimeo_url.trim()) { setError('Vimeo URL is required'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/deck-sites/${deckId}/sizzles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, sort_order: sortOrder }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onAdded(json.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Add failed'); setSaving(false); }
  };

  return (
    <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...cardHeaderStyle, marginBottom: 8 }}>New Sizzle Reel</div>
      <FieldRow label="Vimeo URL *">
        <input type="text" value={fields.vimeo_url} onChange={set('vimeo_url')} placeholder="https://vimeo.com/..." style={inputStyle} autoFocus />
      </FieldRow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FieldRow label="Title"><input type="text" value={fields.title} onChange={set('title')} placeholder="Optional" style={inputStyle} /></FieldRow>
        <FieldRow label="Password"><input type="text" value={fields.password} onChange={set('password')} placeholder="Optional" style={inputStyle} /></FieldRow>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <SaveBtn saving={saving} label="Add Sizzle" onClick={handleSubmit} />
        <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        {error && <span style={{ fontSize: 12, color: '#F87171' }}>{error}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — Sizzle Reels
// ---------------------------------------------------------------------------

function SizzleReelsCard({ siteId }: { siteId: string }) {
  const [sizzles, setSizzles]         = useState<DeckSizzle[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch(`/api/deck-sites/${siteId}/sizzles`)
      .then((r) => r.json())
      // Guard the shape, not just null: a malformed `data` (e.g. an object) used
      // to reach setSizzles and blow up the whole page on `.map()`. This card
      // failing should never take down the deck editor.
      .then((json) => { if (json.error) throw new Error(json.error); setSizzles(Array.isArray(json.data) ? json.data : []); })
      .catch((err: unknown) => setFetchError(err instanceof Error ? err.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>Sizzle Reels</div>
      {loading && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>}
      {fetchError && <p style={{ fontSize: 13, color: '#F87171' }}>{fetchError}</p>}
      {!loading && !fetchError && sizzles.length === 0 && !showAddForm && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>No sizzle reels attached yet.</p>
      )}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {sizzles.map((sz) => (
            <SizzleRow key={sz.id} sizzle={sz} deckId={siteId}
              onSaved={(u) => setSizzles((p) => p.map((s) => s.id === u.id ? u : s))}
              onDeleted={(id) => setSizzles((p) => p.filter((s) => s.id !== id))}
            />
          ))}
          {showAddForm && (
            <AddSizzleForm
              deckId={siteId}
              sortOrder={sizzles.length + 1}
              onAdded={(sz) => { setSizzles((p) => [...p, sz]); setShowAddForm(false); }}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </div>
      )}
      {!loading && !showAddForm && <ActionBtn onClick={() => setShowAddForm(true)}>+ Add Sizzle</ActionBtn>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — Settings
// ---------------------------------------------------------------------------

function SettingsCard({ site, onSaved }: { site: DeckSite; onSaved: (updated: DeckSite) => void }) {
  const [fields, setFields] = useState({ slug: site.slug ?? '', visibility: site.visibility ?? 'internal', status: site.status ?? 'draft', gate_password: site.gate_password ?? '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<string | null>(null);

  useEffect(() => {
    setFields({ slug: site.slug ?? '', visibility: site.visibility ?? 'internal', status: site.status ?? 'draft', gate_password: site.gate_password ?? '' });
  }, [site.slug, site.visibility, site.status, site.gate_password]);

  const set = (field: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/deck-sites/${site.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onSaved(json.data); setMsg('Saved'); setTimeout(() => setMsg(null), 2500);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>Settings</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Slug">
          <input type="text" value={fields.slug} onChange={set('slug')} placeholder="my-show-title" style={inputStyle} />
          {fields.slug && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>/deck/{fields.slug}</span>}
        </FieldRow>
        <FieldRow label="Visibility">
          <select value={fields.visibility} onChange={set('visibility')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="gated">Gated (password)</option>
          </select>
        </FieldRow>
        {fields.visibility === 'gated' && (
          <FieldRow label="Gate Password">
            <input type="text" value={fields.gate_password} onChange={set('gate_password')} placeholder="Password buyers must enter" style={inputStyle} />
          </FieldRow>
        )}
        <FieldRow label="Status">
          <select value={fields.status} onChange={set('status')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </FieldRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SaveBtn saving={saving} label="Save Settings" onClick={handleSave} />
          <SaveMsg msg={msg} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 5 — Theme
// ---------------------------------------------------------------------------

function ThemeCard({ site, onSaved }: { site: DeckSite; onSaved: (updated: DeckSite) => void }) {
  const defaultColor = '#CC1C2C';
  const [color, setColor]   = useState(site.theme_color ?? defaultColor);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/deck-sites/${site.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme_color: color }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onSaved(json.data); setMsg('Saved'); setTimeout(() => setMsg(null), 2500);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  };

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>Theme</div>
      <FieldRow label="Accent Color">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="color" value={color.length === 7 ? color : defaultColor} onChange={(e) => setColor(e.target.value)} style={{ width: 44, height: 36, padding: 2, borderRadius: 6, border: '1px solid var(--border-subtle)', cursor: 'pointer', background: 'var(--bg-app)', flexShrink: 0 }} />
          <input type="text" value={color} onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setColor(v); }} maxLength={7} placeholder={defaultColor} style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
          <div style={{ width: 36, height: 36, borderRadius: 6, background: color.length === 7 ? color : defaultColor, border: '1px solid var(--border-subtle)', flexShrink: 0 }} />
        </div>
      </FieldRow>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <SaveBtn saving={saving} label="Save Theme" onClick={handleSave} />
        <SaveMsg msg={msg} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilmstripThumb — slide thumbnail in the Canva filmstrip (kept from original)
// ---------------------------------------------------------------------------

function FilmstripThumb({ slide, isActive, onClick }: { slide: DeckSlide; isActive: boolean; onClick: () => void }) {
  const imgSrc = slide.ai_image_path ?? slide.slide_image_path ?? null;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button onClick={onClick} style={{ flexShrink: 0, width: 140, display: 'flex', flexDirection: 'column', gap: 6, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative' }}>
      <div style={{ width: 140, height: 79, borderRadius: 6, overflow: 'hidden', border: isActive ? '2px solid var(--accent)' : '2px solid var(--border-subtle)', background: '#0D1120', transition: 'border-color 150ms ease', position: 'relative' }}>
        {imgSrc && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={`Slide ${slide.slide_order}`} onError={() => setImgFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 11, fontFamily: "'Roboto Condensed', sans-serif" }}>
            {slide.slide_order}
          </div>
        )}
        <div style={{ position: 'absolute', top: 4, left: 4, background: isActive ? 'var(--accent)' : 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, fontFamily: "'Roboto Condensed', sans-serif" }}>
          {slide.slide_order}
        </div>
      </div>
      <span style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: isActive ? 700 : 400, letterSpacing: '0.06em' }}>
        {slide.section_label ?? `Slide ${slide.slide_order}`}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SlideEditor — Canva slide detail panel (kept from original, used in Canva section)
// ---------------------------------------------------------------------------

function SlideEditor({ slide, onSaved }: { slide: DeckSlide; onSaved: (updated: DeckSlide) => void }) {
  const [fields, setFields] = useState({
    section_label: slide.section_label ?? '',
    section_type:  slide.section_type  ?? 'content',
    heading:       slide.heading       ?? '',
    body:          slide.body          ?? '',
  });
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const set = (field: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch(`/api/deck-sites/${slide.deck_site_id}/slides/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`); }
      const { data } = await res.json();
      onSaved(data); setSaveMsg('Saved'); setTimeout(() => setSaveMsg(null), 2000);
    } catch (err) { setSaveMsg(err instanceof Error ? err.message : 'Save failed'); } finally { setSaving(false); }
  };

  const hasCaptured = !!slide.slide_image_path;
  const hasAi       = !!slide.ai_image_path;

  return (
    <div style={{ padding: '24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Image comparison row — only rendered when at least one image exists */}
      {(hasCaptured || hasAi) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'Roboto Condensed', sans-serif" }}>Captured Slide</div>
            {hasCaptured ? (
              <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#0D1120', border: '1px solid var(--border-subtle)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.slide_image_path!} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ) : (
              <div style={{ borderRadius: 6, aspectRatio: '16/9', background: '#0D1120', border: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No capture yet</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#F5A623', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'Roboto Condensed', sans-serif" }}>AI Generated</div>
            {hasAi ? (
              <div style={{ borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9', background: '#0D1120', border: '1px solid rgba(245,166,35,0.3)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.ai_image_path!} alt="AI generated" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ) : (
              <div style={{ borderRadius: 6, aspectRatio: '16/9', background: 'rgba(245,166,35,0.04)', border: '1px dashed rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(245,166,35,0.5)', fontSize: 12 }}>No AI image yet</div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Section Label</span>
          <input type="text" value={fields.section_label} onChange={set('section_label')} placeholder="THE CONCEPT" style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Section Type</span>
          <select value={fields.section_type} onChange={set('section_type')} style={{ ...inputStyle, cursor: 'pointer' }}>
            {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Heading</span>
        <input type="text" value={fields.heading} onChange={set('heading')} placeholder="A CRIME WAVE NOBODY SAW COMING" style={inputStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Body Copy</span>
        <textarea value={fields.body} onChange={set('body')} placeholder="Body copy for this section..." rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }} />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
          {saving ? 'Saving...' : 'Save Slide'}
        </button>
        {saveMsg && <span style={{ fontSize: 12, color: saveMsg === 'Saved' ? '#22C55E' : '#F87171' }}>{saveMsg}</span>}
      </div>
    </div>
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
  const [site, setSite] = useState<DeckSite>(initialSite);
  // slides lifted here so Canva section stays in sync with Content Sections edits
  const [slides, setSlides] = useState<DeckSlide[]>(initialSlides);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(initialSlides[0]?.id ?? null);
  const [actionStatus, setActionStatus]   = useState<Record<string, string>>({});

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? null;

  // Show Canva section when canva_url is set OR any slides have been captured
  const showCanvaSection = !!site.canva_url || slides.length > 0;

  // POST action on the deck (capture / generate) with inline status feedback
  const runAction = async (action: string, label: string) => {
    setActionStatus((s) => ({ ...s, [action]: `${label}...` }));
    try {
      const res = await fetch(`/api/deck-sites/${site.id}/${action}`, { method: 'POST' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${res.status}`); }
      setActionStatus((s) => ({ ...s, [action]: 'Done' }));
      setTimeout(() => setActionStatus((s) => ({ ...s, [action]: '' })), 3000);
      router.refresh();
    } catch (err) {
      setActionStatus((s) => ({ ...s, [action]: err instanceof Error ? err.message : 'Failed' }));
    }
  };

  const handlePublish = async () => {
    if (!window.confirm(`Publish this deck? It will be visible at /deck/${site.slug}`)) return;
    try {
      const res = await fetch(`/api/deck-sites/${site.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'published' }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? `HTTP ${res.status}`); }
      const { data } = await res.json();
      setSite(data);
    } catch (err) { alert(err instanceof Error ? err.message : 'Publish failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* ── Header / Action Bar ─────────────────────────────────────────────── */}
      <div style={{ padding: '16px 28px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/decks')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          &larr; Decks
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Barlow Condensed', 'Oswald', sans-serif", letterSpacing: '-0.01em' }}>
              {site.title}
            </h1>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: site.status === 'published' ? 'rgba(34,197,94,0.12)' : 'rgba(245,166,35,0.12)', color: site.status === 'published' ? '#22C55E' : '#F5A623', fontFamily: "'Roboto Condensed', sans-serif" }}>
              {site.status.toUpperCase()}
            </span>
          </div>
          {(site.format || site.genre) && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1 }}>
              {[site.format, site.genre].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Publish / View Live — Capture + AI moved to Canva section at bottom */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {site.status !== 'published' ? (
            <ActionBtn variant="primary" onClick={handlePublish}>Publish</ActionBtn>
          ) : (
            <ActionBtn variant="ghost" href={`/deck/${site.slug}`}>View Live</ActionBtn>
          )}
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: 24, padding: '28px 28px 0', alignItems: 'start' }}>
        {/* ── Left column (60%) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <DeckInfoCard site={site} onSaved={setSite} />
          <ContentSectionsCard siteId={site.id} initialSlides={initialSlides} onSlidesChanged={setSlides} />
          <SizzleReelsCard siteId={site.id} />
        </div>

        {/* ── Right column (40%) — sticky while scrolling ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 24 }}>
          <SettingsCard site={site} onSaved={setSite} />
          <ThemeCard site={site} onSaved={setSite} />
        </div>
      </div>

      {/* ── Canva section — full-width, conditional ─────────────────────────── */}
      {showCanvaSection && (
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Card header with Capture / AI action buttons */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...cardHeaderStyle, marginBottom: 0 }}>Canva Import</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionBtn onClick={() => runAction('capture', 'Capturing')} disabled={!!actionStatus['capture']}>
                  {actionStatus['capture'] || '📷 Capture from Canva'}
                </ActionBtn>
                <ActionBtn onClick={() => runAction('generate', 'Generating')} disabled={!!actionStatus['generate']}>
                  {actionStatus['generate'] || '✨ Generate AI Images'}
                </ActionBtn>
              </div>
            </div>

            {/* Filmstrip */}
            <div style={{ padding: '16px 24px', overflowX: 'auto', borderBottom: slides.length > 0 ? '1px solid var(--border-subtle)' : undefined }}>
              {slides.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
                  No slides captured yet. Use &ldquo;Capture from Canva&rdquo; to import slides.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: 'max-content' }}>
                  {slides.map((slide) => (
                    <FilmstripThumb key={slide.id} slide={slide} isActive={slide.id === activeSlideId} onClick={() => setActiveSlideId(slide.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Slide editor — shown when a slide is selected */}
            {activeSlide && (
              <>
                <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}>
                    Slide {activeSlide.slide_order} &mdash; {activeSlide.section_label ?? 'Untitled'}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)', fontFamily: "'Roboto Condensed', sans-serif" }}>
                    {activeSlide.section_type}
                  </span>
                </div>
                <SlideEditor slide={activeSlide} onSaved={(u) => setSlides((p) => p.map((s) => s.id === u.id ? u : s))} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div style={{ height: 48 }} />
    </div>
  );
}
