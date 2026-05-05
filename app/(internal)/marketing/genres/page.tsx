'use client';
// Marketing Genres — draggable genre cards. Drag to reorder; sort order saved on drop.
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

interface SiteGenre {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  show_count: number;
  show_titles: string | null;
}

export default function MarketingGenres() {
  const [genres, setGenres] = useState<SiteGenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/marketing/genres')
      .then(r => r.json())
      .then(({ data }) => { setGenres(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalShows = genres.reduce((sum, g) => sum + (g.show_count ?? 0), 0);

  // Persist the new sort order after a drop
  const persistOrder = useCallback(async (reordered: SiteGenre[]) => {
    setSaving(true);
    await fetch('/api/marketing/genres', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: reordered.map((g, i) => ({ id: g.id, sort_order: i + 1 })) }),
    });
    setSaving(false);
  }, []);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === dropIndex) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    const reordered = [...genres];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);
    // Update sort_order values to reflect new positions
    const updated = reordered.map((g, i) => ({ ...g, sort_order: i + 1 }));
    setGenres(updated);
    dragIndex.current = null;
    setDragOverIndex(null);
    persistOrder(updated);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  if (loading) {
    return <div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
          Genres
        </h1>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving…</span>}
          <Link
            href="/marketing/genres/new"
            className="px-4 py-2 rounded text-sm font-medium text-white"
            style={{ background: 'var(--accent)', textDecoration: 'none' }}
          >
            + Add Genre
          </Link>
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {genres.length} genres · {totalShows} active shows · drag to reorder
      </p>

      <div className="flex flex-col gap-3">
        {genres.map((g, i) => {
          const shows = g.show_titles ? g.show_titles.split('||').sort() : [];
          const isDragOver = dragOverIndex === i;

          return (
            <div
              key={g.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={e => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className="rounded-lg p-5"
              style={{
                background: 'var(--bg-surface)',
                border: isDragOver ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                cursor: 'grab',
                transition: 'border-color 100ms, opacity 100ms',
                opacity: dragIndex.current === i ? 0.4 : 1,
                userSelect: 'none',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Sort order badge */}
                <span
                  className="text-xs font-bold rounded shrink-0 mt-0.5"
                  style={{
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {g.sort_order}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                    >
                      {g.show_count} show{g.show_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    /genres#{g.slug}
                  </div>
                  {shows.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {shows.map((title) => (
                        <span
                          key={title}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href={`/marketing/genres/${g.id}`}
                  className="text-xs font-medium shrink-0"
                  style={{ color: 'var(--accent)' }}
                  onClick={e => e.stopPropagation()}
                >
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
