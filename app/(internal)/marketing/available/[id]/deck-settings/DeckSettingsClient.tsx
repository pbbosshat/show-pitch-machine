'use client';
// DeckSettingsClient — full-page editor for a single available title's one-page deck.
// Mirrors the public /available/[slug] deck structure section-by-section so editors
// see exactly what fields drive each part of the public page.
//
// Save flow: PUT /api/marketing/available/[id] → optimistic local state update on success.
// Error display: exact API error message shown inline (never a generic message).

import { useState, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

// Deck row shape from deck_sites for the one-page catalog editor.
// Exported so the server component can import the type for its return value.
export interface AvailableTitle {
  id: string;
  title: string;
  slug: string | null;
  rights_type: string | null;
  genre: string | null;
  seasons: number | null;
  episode_count: number | null;
  runtime_mins: number | null;
  markets: string | null;       // JSON string e.g. '["Europe","Asia"]'
  description: string | null;
  contact_email: string | null;
  is_active: number;            // SQLite stores booleans as 1 / 0
  sort_order: number;
  image_url: string | null;
  vimeo_url: string | null;
  password: string | null;      // aliased from gate_password by the server query
  site_show_id: string | null;
}

// All editable fields as strings for controlled inputs.
// Numbers are kept as strings so empty inputs don't snap to 0.
interface FormState {
  title: string;
  slug: string;
  rights_type: string;
  genre: string;
  seasons: string;
  episode_count: string;
  runtime_mins: string;
  markets: string;         // comma-separated for editing; serialized to array on save
  description: string;
  contact_email: string;
  is_active: boolean;
  sort_order: string;
  image_url: string;
  vimeo_url: string;
  password: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Convert a DB row into flat, string-typed form state.
// markets arrives as a JSON array string — convert to comma-separated for the text input.
function toFormState(t: AvailableTitle): FormState {
  let marketsStr = '';
  if (t.markets) {
    try { marketsStr = (JSON.parse(t.markets) as string[]).join(', '); }
    catch { marketsStr = t.markets; }
  }
  return {
    title:         t.title,
    slug:          t.slug          ?? '',
    rights_type:   t.rights_type   ?? '',
    genre:         t.genre         ?? '',
    seasons:       t.seasons       != null ? String(t.seasons)       : '',
    episode_count: t.episode_count != null ? String(t.episode_count) : '',
    runtime_mins:  t.runtime_mins  != null ? String(t.runtime_mins)  : '',
    markets:       marketsStr,
    description:   t.description   ?? '',
    contact_email: t.contact_email ?? '',
    is_active:     !!t.is_active,
    sort_order:    String(t.sort_order ?? 0),
    image_url:     t.image_url     ?? '',
    vimeo_url:     t.vimeo_url     ?? '',
    password:      t.password      ?? '',
  };
}

// ── Design system constants ───────────────────────────────────────────────────
// Uses CSS custom properties from the global design system so the editor inherits
// dark/light mode and accent colour automatically.

const SECTION: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: '20px 24px',
  marginBottom: 20,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid var(--border-subtle)',
};

const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 6,
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const ROW: React.CSSProperties = { marginBottom: 14 };

const HELPER: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginTop: 4,
};

// Genre options — kept in sync with AvailableClient.tsx
const GENRES = [
  'Paranormal',
  'Sports + Competition',
  'Home + Lifestyle',
  'Crime',
  'Comedy',
  'Food + Travel',
];

// ── Component ────────────────────────────────────────────────────────────────

export default function DeckSettingsClient({ title }: { title: AvailableTitle }) {
  // Initialise form from the server-fetched row.
  const [form, setForm] = useState<FormState>(() => toFormState(title));

  // Save lifecycle state.
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-clear the "Saved ✓" confirmation after 2 seconds.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  // Generic setter for any form field.
  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Save handler ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      // Parse comma-separated markets string into a clean array for the API.
      const marketsArray = form.markets
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title:         form.title,
        slug:          form.slug          || null,
        rights_type:   form.rights_type   || null,
        genre:         form.genre         || null,
        seasons:       form.seasons       !== '' ? Number(form.seasons)       : null,
        episode_count: form.episode_count !== '' ? Number(form.episode_count) : null,
        runtime_mins:  form.runtime_mins  !== '' ? Number(form.runtime_mins)  : null,
        markets:       marketsArray,
        description:   form.description   || null,
        contact_email: form.contact_email || null,
        is_active:     form.is_active,
        sort_order:    form.sort_order    !== '' ? Number(form.sort_order)    : 0,
        image_url:     form.image_url     || null,
        vimeo_url:     form.vimeo_url     || null,
        password:      form.password      || null,
      };

      const res = await fetch(`/api/marketing/available/${title.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { data?: AvailableTitle; error?: string };
      if (!res.ok) throw new Error(data.error ?? res.statusText);

      // Re-sync form state from the server's canonical response so the slug
      // (which the API may have slugified) matches what is stored.
      if (data.data) {
        setForm(toFormState(data.data));
      }

      setSaved(true);
    } catch (err) {
      // Show exact error text — never swallow or genericise the message.
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ── Section 1: Identity & URL ─────────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Identity &amp; URL</p>

        <div style={ROW}>
          <label style={LABEL}>Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            style={FIELD}
            placeholder="e.g. haunted-highways"
          />
          {/* Live URL preview — updates on every keystroke */}
          {form.slug && (
            <p style={HELPER}>
              Public URL:{' '}
              <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                /available/{form.slug}
              </span>
            </p>
          )}
        </div>

        {/* "View Live Deck" button — only enabled when a slug exists */}
        <a
          href={form.slug ? `/available/${form.slug}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 6,
            background: form.slug ? 'var(--accent)' : 'var(--bg-surface-alt)',
            color: form.slug ? '#fff' : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            pointerEvents: form.slug ? 'auto' : 'none',
            opacity: form.slug ? 1 : 0.5,
            cursor: form.slug ? 'pointer' : 'not-allowed',
          }}
          aria-disabled={!form.slug}
        >
          View Live Deck →
        </a>
      </div>

      {/* ── Section 2: Hero Image ─────────────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Hero Image</p>

        <div style={ROW}>
          <label style={LABEL}>Image URL</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => set('image_url', e.target.value)}
            style={FIELD}
            placeholder="https://cdn.prod.website-files.com/..."
          />
        </div>

        {/* Inline image preview — 16/9 aspect ratio, matches the public deck hero */}
        {form.image_url && (
          <img
            src={form.image_url}
            alt="Hero preview"
            style={{
              width: '100%',
              aspectRatio: '16/9',
              objectFit: 'cover',
              borderRadius: 6,
              background: 'var(--bg-surface-alt)',
              display: 'block',
            }}
          />
        )}
      </div>

      {/* ── Section 3: Show Title & Metadata ─────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Show Title &amp; Metadata</p>

        <div style={ROW}>
          <label style={LABEL}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            style={FIELD}
          />
        </div>

        {/* Genre + Rights Type — two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={ROW}>
            <label style={LABEL}>Genre</label>
            <select
              value={form.genre}
              onChange={(e) => set('genre', e.target.value)}
              style={FIELD}
            >
              <option value="">— None —</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div style={ROW}>
            <label style={LABEL}>Rights Type</label>
            <select
              value={form.rights_type}
              onChange={(e) => set('rights_type', e.target.value)}
              style={FIELD}
            >
              <option value="">— None —</option>
              <option value="international">International</option>
              <option value="domestic">Domestic</option>
              <option value="format">Format</option>
              <option value="coproduction">Co-production</option>
            </select>
          </div>

          {/* Numeric metadata pills: Seasons, Episodes, Runtime, Sort Order */}
          <div style={ROW}>
            <label style={LABEL}>Seasons</label>
            <input
              type="number"
              value={form.seasons}
              onChange={(e) => set('seasons', e.target.value)}
              style={FIELD}
              min={0}
            />
          </div>

          <div style={ROW}>
            <label style={LABEL}>Episode Count</label>
            <input
              type="number"
              value={form.episode_count}
              onChange={(e) => set('episode_count', e.target.value)}
              style={FIELD}
              min={0}
            />
          </div>

          <div style={ROW}>
            <label style={LABEL}>Runtime (mins)</label>
            <input
              type="number"
              value={form.runtime_mins}
              onChange={(e) => set('runtime_mins', e.target.value)}
              style={FIELD}
              min={0}
            />
          </div>

          <div style={ROW}>
            <label style={LABEL}>Sort Order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => set('sort_order', e.target.value)}
              style={FIELD}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* ── Section 4: Video ──────────────────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Video</p>

        <div style={ROW}>
          <label style={LABEL}>Vimeo URL</label>
          <input
            type="url"
            value={form.vimeo_url}
            onChange={(e) => set('vimeo_url', e.target.value)}
            style={FIELD}
            placeholder="https://vimeo.com/123456/abc123"
          />
          <p style={HELPER}>e.g. https://vimeo.com/123456/abc123</p>
        </div>
      </div>

      {/* ── Section 5: Description ────────────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Description</p>

        <div style={ROW}>
          <label style={LABEL}>Description</label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            style={{ ...FIELD, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* ── Section 6: Markets ────────────────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Markets</p>

        <div style={ROW}>
          <label style={LABEL}>Markets</label>
          <input
            type="text"
            value={form.markets}
            onChange={(e) => set('markets', e.target.value)}
            style={FIELD}
            placeholder="Europe, Asia, Latin America"
          />
          <p style={HELPER}>Comma-separated: Europe, Asia, Latin America</p>
        </div>
      </div>

      {/* ── Section 7: Access & Contact ───────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Access &amp; Contact</p>

        <div style={ROW}>
          <label style={LABEL}>Contact Email</label>
          <input
            type="text"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
            style={FIELD}
          />
        </div>

        <div style={ROW}>
          <label style={LABEL}>Password</label>
          <input
            type="text"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            style={FIELD}
            placeholder="Leave blank for open access"
          />
        </div>
      </div>

      {/* ── Section 8: Status ─────────────────────────────────────────── */}
      <div style={SECTION}>
        <p style={SECTION_TITLE}>Status</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="deck_is_active"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
          <label
            htmlFor="deck_is_active"
            style={{ ...LABEL, marginBottom: 0, cursor: 'pointer' }}
          >
            Active (visible on public site)
          </label>
        </div>
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {/* "Saved ✓" confirmation — shown briefly on success, auto-clears via useEffect */}
        {saved && (
          <span style={{ fontSize: 13, color: '#22c55e' }}>Saved ✓</span>
        )}

        {/* Exact error message from the API — never a generic fallback */}
        {saveError && (
          <span style={{ fontSize: 13, color: 'var(--status-pass)' }}>{saveError}</span>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px',
            borderRadius: 6,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
