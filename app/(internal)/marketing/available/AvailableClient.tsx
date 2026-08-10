'use client';
// AvailableClient — card grid for /marketing/available.
//
// Purpose: control what shows on the public marketing website.
//   - Drag cards to reorder (persists sort_order)
//   - Toggle Public / Private per card (is_active)
//   - Toggle Live / Draft per card (status)
//
// All editing happens in the /decks flow, not here.

import { useState, useMemo, useRef } from 'react';

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
  markets: string | null;
  description: string | null;
  contact_email: string | null;
  is_active: number;           // 1 = public (shows in catalog), 0 = private
  sort_order: number;
  image_url: string | null;
  vimeo_url: string | null;
  password: string | null;
  site_show_id: string | null;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AvailableClient({ titles: initialTitles }: { titles: AvailableTitle[] }) {
  const [titles, setTitles]               = useState<AvailableTitle[]>(initialTitles);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all');
  const [draggingId, setDraggingId]       = useState<string | null>(null);
  const [dragOverId, setDragOverId]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  // ── Optimistic toggle for is_active (Public/Private) ──────────────────────
  async function toggleActive(t: AvailableTitle, e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
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
      setError(`Update failed: ${(err as Error).message}`);
    }
  }

  // ── Optimistic toggle for status (Published/Draft) ────────────────────────
  async function toggleStatus(t: AvailableTitle, e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
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
      setError(`Update failed: ${(err as Error).message}`);
    }
  }

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  // The whole card is draggable, but the Live/Draft and Public/Private buttons
  // live inside it. Pressing a button and drifting a few px made the browser
  // begin a native drag, which swallows mouseup/click entirely — so the toggle
  // silently did nothing (no optimistic update, no PUT). That was the
  // "buttons aren't clickable / won't stick" bug.
  //
  // Cancelling dragstart is too late: once the drag begins, the click is gone.
  // Instead we turn OFF `draggable` while the pointer is over the toggle bar,
  // so no drag can start there and the buttons behave like normal buttons.
  // Dragging from the artwork/title still reorders as before.
  const [noDragCardId, setNoDragCardId] = useState<string | null>(null);

  // Belt-and-braces: if a drag somehow starts from the toggle bar, cancel it.
  const noDragRef = useRef(false);

  function handleMouseDownCapture(e: React.MouseEvent) {
    noDragRef.current = !!(e.target as HTMLElement).closest?.('[data-no-drag]');
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    if (noDragRef.current) { e.preventDefault(); return; }
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
      {/* Error banner — surfaces the exact server error when a toggle PUT fails,
          instead of silently reverting with only a console.error (project rule:
          always show exact errors to the user). */}
      {error && (
        <div
          role="alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, padding: '10px 14px', borderRadius: 6, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '0.8125rem' }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

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
              draggable={noDragCardId !== t.id}
              onMouseDownCapture={handleMouseDownCapture}
              onDragStart={(e) => handleDragStart(e, t.id)}
              onDragOver={(e) => handleDragOver(e, t.id)}
              onDrop={(e) => handleDrop(e, t.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Thumbnail + title — click opens public deck */}
              <a
                href={t.slug ? `/available/${t.slug}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', textDecoration: 'none', cursor: t.slug ? 'pointer' : 'default' }}
                title={t.slug ? `View "${t.title}" on website` : 'No slug set'}
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
                </div>
              </a>

              {/* Action bar — toggles only. data-no-drag suppresses the card's
                  drag gesture so a slightly-imperfect click still registers. */}
              <div
                data-no-drag
                onMouseEnter={() => setNoDragCardId(t.id)}
                onMouseLeave={() => setNoDragCardId((cur) => (cur === t.id ? null : cur))}
                style={{ padding: '8px 10px 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <button
                  onClick={(e) => toggleStatus(t, e)}
                  title={t.status === 'published' ? 'Click to unpublish (URL stops working)' : 'Click to publish (URL goes live)'}
                  style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', border: `1px solid ${t.status === 'published' ? 'var(--accent)' : 'var(--border-subtle)'}`, background: t.status === 'published' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent', color: t.status === 'published' ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {t.status === 'published' ? 'Live' : 'Draft'}
                </button>

                <button
                  onClick={(e) => toggleActive(t, e)}
                  title={t.is_active ? 'Click to hide from catalog' : 'Click to show in catalog'}
                  style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase', border: `1px solid ${t.is_active ? '#22c55e' : 'var(--border-subtle)'}`, background: t.is_active ? 'rgba(34,197,94,0.12)' : 'transparent', color: t.is_active ? '#22c55e' : 'var(--text-muted)' }}
                >
                  {t.is_active ? 'Public' : 'Private'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
