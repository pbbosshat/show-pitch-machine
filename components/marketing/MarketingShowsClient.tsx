'use client';
// MarketingShowsClient — card grid for /marketing/shows with inline edit modal.
// Each card shows the show thumbnail + metadata. Clicking a card opens the edit modal.
// Saves via PUT /api/marketing/shows/[id] and updates local state optimistically.

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export interface SiteShow {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  genre: string | null;
  network: string | null;
  seasons: number | null;
  episode_count: number | null;
  status: string;
  image_url: string | null;
  is_featured: number;
  sort_order: number;
  imdb_url: string | null;
  production_hours: number | null;
}

interface FormState {
  title: string;
  tagline: string;
  description: string;
  genre: string;
  network: string;
  seasons: string;
  episode_count: string;
  status: string;
  image_url: string;
  is_featured: boolean;
  sort_order: string;
  imdb_url: string;
  production_hours: string;
}

function toFormState(s: SiteShow): FormState {
  return {
    title:            s.title,
    tagline:          s.tagline            ?? '',
    description:      s.description        ?? '',
    genre:            s.genre              ?? '',
    network:          s.network            ?? '',
    seasons:          s.seasons       != null ? String(s.seasons)            : '',
    episode_count:    s.episode_count != null ? String(s.episode_count)      : '',
    status:           s.status,
    image_url:        s.image_url          ?? '',
    is_featured:      !!s.is_featured,
    sort_order:       String(s.sort_order  ?? 0),
    imdb_url:         s.imdb_url           ?? '',
    production_hours: s.production_hours != null ? String(s.production_hours) : '',
  };
}

function statusVariant(s: string): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (s === 'active')    return 'greenlit';
  if (s === 'available') return 'inreview';
  if (s === 'archived')  return 'pass';
  return 'muted';
}

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

const ROW: React.CSSProperties = { marginBottom: 12 };

const GENRES = ['Paranormal', 'Sports + Competition', 'Home + Lifestyle', 'Crime', 'Comedy', 'Food + Travel'];

export default function MarketingShowsClient({ initialShows }: { initialShows: SiteShow[] }) {
  const [shows, setShows] = useState<SiteShow[]>(initialShows);
  const [editing, setEditing]     = useState<SiteShow | null>(null);
  const [form, setForm]           = useState<FormState | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit(show: SiteShow) {
    setEditing(show);
    setForm(toFormState(show));
    setSaveError(null);
  }

  function closeModal() {
    setEditing(null);
    setForm(null);
    setSaveError(null);
  }

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSave() {
    if (!editing || !form) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        seasons:          form.seasons          !== '' ? Number(form.seasons)          : null,
        episode_count:    form.episode_count    !== '' ? Number(form.episode_count)    : null,
        sort_order:       form.sort_order       !== '' ? Number(form.sort_order)       : 0,
        production_hours: form.production_hours !== '' ? Number(form.production_hours) : 0,
        is_featured:      form.is_featured,
      };
      const res = await fetch(`/api/marketing/shows/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);

      // Optimistically merge the updated fields into the local list
      setShows((prev) =>
        prev.map((s) =>
          s.id === editing.id
            ? { ...s, ...payload, is_featured: payload.is_featured ? 1 : 0, sort_order: payload.sort_order ?? 0, production_hours: payload.production_hours ?? 0 }
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

  return (
    <>
      {/* Card grid — 4 columns at wide widths, responsive down to 2 */}
      <style>{`
        .mktg-shows-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1100px) { .mktg-shows-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px)  { .mktg-shows-grid { grid-template-columns: repeat(2, 1fr); } }
        .mktg-show-card {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          transition: border-color 150ms, box-shadow 150ms;
        }
        .mktg-show-card:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
        }
        .mktg-show-thumb {
          width: 100%;
          aspect-ratio: 16/9;
          object-fit: cover;
          display: block;
          background: var(--bg-surface-alt);
        }
        .mktg-show-thumb-placeholder {
          width: 100%;
          aspect-ratio: 16/9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-surface-alt);
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>

      {shows.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>No shows yet.</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Run <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 3 }}>npx tsx scripts/seed-marketing.ts</code> to seed all shows.
          </p>
        </div>
      ) : (
        <div className="mktg-shows-grid">
          {shows.map((show) => (
            <div
              key={show.id}
              className="mktg-show-card"
              onClick={() => openEdit(show)}
              title={`Edit "${show.title}"`}
            >
              {/* Thumbnail */}
              {show.image_url ? (
                <img
                  src={show.image_url}
                  alt={show.title}
                  className="mktg-show-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="mktg-show-thumb-placeholder">No image</div>
              )}

              {/* Card body */}
              <div style={{ padding: '10px 12px 12px' }}>
                <div className="flex items-start justify-between gap-1">
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{
                      color: 'var(--text-primary)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      flex: 1,
                    }}
                  >
                    {show.title}
                    {!!show.is_featured && (
                      <span style={{ color: 'var(--accent)', marginLeft: 4 }} title="Featured">★</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {show.network && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {show.network}
                    </span>
                  )}
                  <Badge variant={statusVariant(show.status)}>{show.status}</Badge>
                </div>

                {show.genre && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {show.genre}
                  </p>
                )}

                {/* Production hours — shown on card so it's visible at a glance */}
                {(show.production_hours != null && show.production_hours > 0) && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>
                    {show.production_hours.toLocaleString()} hrs / yr
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal isOpen={editing !== null} onClose={closeModal} title={editing?.title ?? 'Edit Show'} wide>
        {form && (
          <>
            {/* Image preview */}
            {form.image_url && (
              <div style={{ marginBottom: 16 }}>
                <img
                  src={form.image_url}
                  alt="Preview"
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6, background: 'var(--bg-surface-alt)' }}
                />
              </div>
            )}

            {/* Two-column layout for compact fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={ROW}>
                <label style={LABEL}>Title</label>
                <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} style={FIELD} />
              </div>

              <div style={ROW}>
                <label style={LABEL}>Network</label>
                <input type="text" value={form.network} onChange={(e) => set('network', e.target.value)} style={FIELD} />
              </div>

              <div style={ROW}>
                <label style={LABEL}>Genre</label>
                <select value={form.genre} onChange={(e) => set('genre', e.target.value)} style={FIELD}>
                  <option value="">— None —</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div style={ROW}>
                <label style={LABEL}>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} style={FIELD}>
                  <option value="active">Active</option>
                  <option value="available">Available</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div style={ROW}>
                <label style={LABEL}>Seasons</label>
                <input type="number" value={form.seasons} onChange={(e) => set('seasons', e.target.value)} style={FIELD} min={0} />
              </div>

              <div style={ROW}>
                <label style={LABEL}>Episode Count</label>
                <input type="number" value={form.episode_count} onChange={(e) => set('episode_count', e.target.value)} style={FIELD} min={0} />
              </div>

              <div style={ROW}>
                <label style={LABEL}>Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} style={FIELD} min={0} />
              </div>

              <div style={ROW}>
                <label style={LABEL}>Production Hours / Year</label>
                <input type="number" value={form.production_hours} onChange={(e) => set('production_hours', e.target.value)} style={FIELD} min={0} placeholder="0" />
              </div>

              <div style={{ ...ROW, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={form.is_featured}
                  onChange={(e) => set('is_featured', e.target.checked)}
                  style={{ width: 14, height: 14, cursor: 'pointer' }}
                />
                <label htmlFor="is_featured" style={{ ...LABEL, marginBottom: 0, cursor: 'pointer' }}>Featured</label>
              </div>
            </div>

            <div style={ROW}>
              <label style={LABEL}>Tagline</label>
              <input type="text" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} style={FIELD} />
            </div>

            <div style={ROW}>
              <label style={LABEL}>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ ...FIELD, resize: 'vertical' }} />
            </div>

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

            <div style={ROW}>
              <label style={LABEL}>External Link (IMDB / YouTube / Streaming)</label>
              <input
                type="url"
                value={form.imdb_url}
                onChange={(e) => set('imdb_url', e.target.value)}
                style={FIELD}
                placeholder="https://..."
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                If set, the public /shows page links here (new tab) instead of /shows/[slug].
              </p>
            </div>

            {saveError && (
              <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 4 }}>{saveError}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
