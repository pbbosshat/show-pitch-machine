'use client';
// AvailableClient — card grid for /marketing/available with inline edit modal.
//
// Each card has:
//   - Clickable thumbnail/title → opens deck in new tab
//   - Slug chip → navigates to deck-settings
//   - Published/Draft toggle → controls whether the public URL resolves (status field)
//   - Public/Private toggle → controls whether it appears on the public available page (is_active)
//   - Gear button → full edit modal
//
// Cards are draggable to reorder; drop saves sort_order to the API for all affected rows.
// Saves via PUT /api/marketing/available/[id].

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Deck row shape from deck_sites for the available titles catalog.
export interface AvailableTitle {
  id: string;
  title: string;
  slug: string | null;
  status: string;              // 'published' | 'draft' — controls URL access
  rights_type: string | null;
  genre: string | null;
  seasons: number | null;
  episode_count: number | null;
  runtime_mins: number | null;
  markets: string | null;      // JSON string e.g. '["Europe","Asia"]'
  description: string | null;
  contact_email: string | null;
  is_active: number;           // 1 = public (shows in catalog), 0 = private
  sort_order: number;
  image_url: string | null;
  vimeo_url: string | null;
  password: string | null;     // aliased from gate_password by the server query
  site_show_id: string | null;
}

interface FormState {
  title: string;
  slug: string;
  rights_type: string;
  genre: string;
  seasons: string;
  episode_count: string;
  runtime_mins: string;
  markets: string;
  description: string;
  contact_email: string;
  is_active: boolean;
  sort_order: string;
  image_url: string;
  vimeo_url: string;
  password: string;
}

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

const FIELD: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 6,
  background: 'var(--bg-elevated)', color: 'var(--text-primary)',
  border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
};
const ROW: React.CSSProperties = { marginBottom: 12 };

const GENRES = ['Paranormal', 'Sports + Competition', 'Home + Lifestyle', 'Crime', 'Comedy', 'Food + Travel'];

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AvailableClient({ titles: initialTitles }: { titles: AvailableTitle[] }) {
  const router = useRouter();

  const [titles, setTitles]   = useState<AvailableTitle[]>(initialTitles);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Drag-to-reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Edit modal state
  const [editing, setEditing]     = useState<AvailableTitle | null>(null);
  const [form, setForm]           = useState<FormState | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit(t: AvailableTitle) {
    setEditing(t);
    setForm(toFormState(t));
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

  // ── Optimistic toggle for is_active (Public/Private) ──────────────────────
  async function toggleActive(t: AvailableTitle, e: React.MouseEvent) {
    e.stopPropagation();
    const nextActive = !t.is_active;
    setTitles((prev) => prev.map((row) => row.id === t.id ? { ...row, is_active: nextActive ? 1 : 0 } : row));
    try {
      const res = await fetch(`/api/marketing/available/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
    } catch (err) {
      console.error('toggleActive failed:', err);
      setTitles((prev) => prev.map((row) => row.id === t.id ? { ...row, is_active: t.is_active } : row));
    }
  }

  // ── Optimistic toggle for status (Published/Draft) ────────────────────────
  async function toggleStatus(t: AvailableTitle, e: React.MouseEvent) {
    e.stopPropagation();
    const nextStatus = t.status === 'published' ? 'draft' : 'published';
    setTitles((prev) => prev.map((row) => row.id === t.id ? { ...row, status: nextStatus } : row));
    try {
      const res = await fetch(`/api/marketing/available/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
    } catch (err) {
      console.error('toggleStatus failed:', err);
      setTitles((prev) => prev.map((row) => row.id === t.id ? { ...row, status: t.status } : row));
    }
  }

  // ── Drag-to-reorder handlers ──────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggingId) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDragOverId(null); return; }

    const srcIdx = titles.findIndex((t) => t.id === draggingId);
    const dstIdx = titles.findIndex((t) => t.id === targetId);
    if (srcIdx === -1 || dstIdx === -1) return;

    const next = [...titles];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(dstIdx, 0, moved);
    setTitles(next);
    setDraggingId(null);
    setDragOverId(null);

    // Persist updated sort_order for every row (fire-and-forget)
    next.forEach((t, idx) => {
      fetch(`/api/marketing/available/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: idx }),
      }).catch((err) => console.error('[reorder] failed:', t.id, err));
    });
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  // ── Save edit modal ───────────────────────────────────────────────────────
  async function handleSave() {
    if (!editing || !form) return;
    setSaving(true);
    setSaveError(null);
    try {
      const marketsArray = form.markets.split(',').map((s) => s.trim()).filter(Boolean);
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
        sort_order:    form.sort_order !== '' ? Number(form.sort_order) : 0,
        image_url:     form.image_url     || null,
        vimeo_url:     form.vimeo_url     || null,
        password:      form.password      || null,
      };
      const res = await fetch(`/api/marketing/available/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setTitles((prev) =>
        prev.map((t) =>
          t.id === editing.id
            ? { ...t, ...payload, is_active: payload.is_active ? 1 : 0, sort_order: payload.sort_order ?? 0, markets: marketsArray.length ? JSON.stringify(marketsArray) : null }
            : t
        )
      );
      closeModal();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Filter pipeline ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return titles.filter((t) => {
      if (statusFilter === 'active'   && !t.is_active) return false;
      if (statusFilter === 'inactive' &&  t.is_active) return false;
      if (!q) return true;
      return [t.title, t.genre, t.rights_type].some((v) => v?.toLowerCase().includes(q));
    });
  }, [titles, search, statusFilter]);

  return (
    <>
      <style>{`
        .avail-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1100px) { .avail-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px)  { .avail-grid { grid-template-columns: repeat(2, 1fr); } }
        .avail-card {
          cursor: grab;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          transition: border-color 150ms, box-shadow 150ms, opacity 150ms;
        }
        .avail-card:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
        }
        .avail-card.dragging { opacity: 0.4; cursor: grabbing; }
        .avail-card.drag-over { border-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,0.25); }
        .avail-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; background: var(--bg-surface-alt); }
        .avail-thumb-placeholder { width: 100%; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: var(--bg-surface-alt); color: var(--text-muted); font-size: 11px; }
      `}</style>

      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, genre, rights type…"
          style={{ flex: 1, minWidth: 200, maxWidth: 320, padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-alt)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}
        />

        {(['all', 'active', 'inactive'] as StatusFilter[]).map((val) => {
          const active = statusFilter === val;
          return (
            <button
              key={val}
              onClick={() => setStatusFilter(active ? 'all' : val)}
              style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`, background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', transition: 'background 0.15s, color 0.15s', textTransform: 'capitalize' }}
            >
              {val === 'all' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          );
        })}

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} of {titles.length} · drag to reorder
        </span>

        <Link
          href="/marketing/available/new"
          style={{ padding: '7px 16px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
        >
          + Add Title
        </Link>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div style={{ borderRadius: 8, padding: '48px 16px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No titles match your filters.</p>
        </div>
      ) : (
        <div className="avail-grid">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`avail-card${draggingId === t.id ? ' dragging' : ''}${dragOverId === t.id ? ' drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, t.id)}
              onDragOver={(e) => handleDragOver(e, t.id)}
              onDrop={(e) => handleDrop(e, t.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Thumbnail + title — click opens deck */}
              <a
                href={t.slug ? `/available/${t.slug}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textDecoration: 'none', cursor: t.slug ? 'pointer' : 'default' }}
                title={t.slug ? `View one-page deck for "${t.title}"` : 'No slug set'}
                draggable={false}
              >
                {t.image_url ? (
                  <img src={t.image_url} alt={t.title} className="avail-thumb" loading="lazy" draggable={false} />
                ) : (
                  <div className="avail-thumb-placeholder">No image</div>
                )}

                <div style={{ padding: '10px 12px 12px' }}>
                  <p style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.25, marginBottom: 6 }}>
                    {t.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {t.rights_type && (
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 6px' }}>
                        {t.rights_type}
                      </span>
                    )}
                  </div>
                  {t.genre && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{t.genre}</p>}
                  {t.password && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{t.password}</span>
                    </div>
                  )}
                </div>
              </a>

              {/* Action bar */}
              <div style={{ padding: '8px 10px 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>

                {/* Slug chip → deck-settings */}
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/marketing/available/${t.id}/deck-settings`); }}
                  title="Edit deck settings & slug"
                  style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}
                >
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.slug ? `/available/${t.slug}` : '+ set slug'}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>

                {/* Published / Draft toggle */}
                <button
                  onClick={(e) => toggleStatus(t, e)}
                  title={t.status === 'published' ? 'Click to unpublish (URL stops working)' : 'Click to publish (URL goes live)'}
                  style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', border: `1px solid ${t.status === 'published' ? 'var(--accent)' : 'var(--border-subtle)'}`, background: t.status === 'published' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent', color: t.status === 'published' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {t.status === 'published' ? 'Live' : 'Draft'}
                </button>

                {/* Public / Private toggle */}
                <button
                  onClick={(e) => toggleActive(t, e)}
                  title={t.is_active ? 'Click to hide from catalog' : 'Click to show in catalog'}
                  style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', border: `1px solid ${t.is_active ? '#22c55e' : 'var(--border-subtle)'}`, background: t.is_active ? 'rgba(34,197,94,0.12)' : 'transparent', color: t.is_active ? '#22c55e' : 'var(--text-muted)' }}
                >
                  {t.is_active ? 'Public' : 'Private'}
                </button>

                {/* Gear → full edit modal */}
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(t); }}
                  title="Edit details"
                  style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal isOpen={editing !== null} onClose={closeModal} title={editing?.title ?? 'Edit Title'} wide>
        {form && (
          <>
            {form.image_url && (
              <div style={{ marginBottom: 16 }}>
                <img src={form.image_url} alt="Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6, background: 'var(--bg-surface-alt)' }} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={ROW}>
                <label style={LABEL}>Title</label>
                <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} style={FIELD} />
              </div>
              <div style={ROW}>
                <label style={LABEL}>Slug</label>
                <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)} style={FIELD} placeholder="auto-generated from title if blank" />
              </div>
              <div style={ROW}>
                <label style={LABEL}>Genre</label>
                <select value={form.genre} onChange={(e) => set('genre', e.target.value)} style={FIELD}>
                  <option value="">— None —</option>
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div style={ROW}>
                <label style={LABEL}>Rights Type</label>
                <select value={form.rights_type} onChange={(e) => set('rights_type', e.target.value)} style={FIELD}>
                  <option value="">— None —</option>
                  <option value="international">International</option>
                  <option value="domestic">Domestic</option>
                  <option value="format">Format</option>
                  <option value="coproduction">Co-production</option>
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
                <label style={LABEL}>Runtime (mins)</label>
                <input type="number" value={form.runtime_mins} onChange={(e) => set('runtime_mins', e.target.value)} style={FIELD} min={0} />
              </div>
              <div style={ROW}>
                <label style={LABEL}>Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} style={FIELD} min={0} />
              </div>
              <div style={ROW}>
                <label style={LABEL}>Contact Email</label>
                <input type="text" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} style={FIELD} />
              </div>
              <div style={ROW}>
                <label style={LABEL}>Password</label>
                <input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} style={FIELD} placeholder="Leave blank for open access" />
              </div>
              <div style={{ ...ROW, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" id="avail_is_active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                <label htmlFor="avail_is_active" style={{ ...LABEL, marginBottom: 0, cursor: 'pointer' }}>Public (shows in catalog)</label>
              </div>
            </div>

            <div style={ROW}>
              <label style={LABEL}>Markets</label>
              <input type="text" value={form.markets} onChange={(e) => set('markets', e.target.value)} style={FIELD} placeholder="Europe, Asia, Latin America" />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Comma-separated</p>
            </div>
            <div style={ROW}>
              <label style={LABEL}>Description</label>
              <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} style={{ ...FIELD, resize: 'vertical' }} />
            </div>
            <div style={ROW}>
              <label style={LABEL}>Image URL</label>
              <input type="url" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} style={FIELD} placeholder="https://cdn.prod.website-files.com/..." />
              {form.image_url && <img src={form.image_url} alt="Image preview" style={{ marginTop: 8, width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 4, background: 'var(--bg-surface-alt)' }} />}
            </div>
            <div style={ROW}>
              <label style={LABEL}>Vimeo URL</label>
              <input type="url" value={form.vimeo_url} onChange={(e) => set('vimeo_url', e.target.value)} style={FIELD} placeholder="https://vimeo.com/123456/abc123" />
            </div>

            {saveError && <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 4 }}>{saveError}</p>}

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
