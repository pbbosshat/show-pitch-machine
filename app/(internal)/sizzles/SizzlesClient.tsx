'use client';

import { useState } from 'react';
import SizzleCard, { type SizzleCardData } from '@/components/shows/SizzleCard';
import AddSizzleModal from '@/components/shows/AddSizzleModal';

function matchesTerm(sizzle: SizzleCardData, term: string): boolean {
  const haystack = [
    sizzle.project_title,
    sizzle.sheet_source,
    sizzle.vimeo_url,
    sizzle.platform,
    sizzle.raw_value,
    sizzle.notes,
    sizzle.vimeo_password,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(term);
}

export default function SizzlesClient({ sizzles: serverSizzles }: { sizzles: SizzleCardData[] }) {
  // Local copy so newly-created sizzles can be prepended without a full page reload.
  // The page is `force-dynamic` server-side, but optimistically updating here keeps
  // the post-upload experience instant.
  const [sizzles, setSizzles] = useState<SizzleCardData[]>(serverSizzles);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const term = search.trim().toLowerCase();
  const filtered = term ? sizzles.filter((s) => matchesTerm(s, term)) : sizzles;
  const withUrl = filtered.filter((s) => s.vimeo_url);
  const withoutUrl = filtered.filter((s) => !s.vimeo_url);

  // Callback handed to AddSizzleModal — runs when the API has finished writing
  // the row + uploading the video. Prepend so the new card is the first thing
  // the user sees in the "With Video Link" section.
  function handleCreated(newSizzle: SizzleCardData) {
    setSizzles((prev) => [newSizzle, ...prev]);
    setAddOpen(false);
  }

  return (
    <div className="space-y-8">

      {addOpen && (
        <AddSizzleModal onCreated={handleCreated} onClose={() => setAddOpen(false)} />
      )}

      {/* ── Search bar + Add Video button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search by title, notes, platform, sheet, URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            maxWidth: 420,
            padding: '7px 12px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        {term && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filtered.length} of {sizzles.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* "+ Add Video" sits on the right so it stays visually anchored away from
             the search input even when filter chips eventually land between them. */}
        <button
          onClick={() => setAddOpen(true)}
          style={{
            marginLeft: 'auto',
            background: 'var(--accent, #e51d26)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 13,
            padding: '8px 16px',
            letterSpacing: '0.03em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
          aria-label="Add a new sizzle reel"
        >
          <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 800 }}>+</span>
          Add Video
        </button>
      </div>

      {/* ── Section 1: Sizzles with a video URL ── */}
      {withUrl.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              With Video Link
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {withUrl.length} reel{withUrl.length !== 1 ? 's' : ''} — ready to share
            </span>
          </div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {withUrl.map((sizzle) => (
              <SizzleCard key={sizzle.id} sizzle={sizzle} />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: Confirmed exists but no URL captured yet ── */}
      {withoutUrl.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              Confirmed Exists
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {withoutUrl.length} reel{withoutUrl.length !== 1 ? 's' : ''} — noted in sheet, URL not captured
            </span>
          </div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {withoutUrl.map((sizzle) => (
              <SizzleCard key={sizzle.id} sizzle={sizzle} />
            ))}
          </div>
        </section>
      )}

      {/* ── No search results ── */}
      {filtered.length === 0 && sizzles.length > 0 && (
        <div
          className="rounded-lg border p-12 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No sizzles match &ldquo;{search}&rdquo; — try a different term.
          </p>
        </div>
      )}

      {/* ── Empty state (no data at all) ── */}
      {sizzles.length === 0 && (
        <div
          className="rounded-lg border p-12 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No sizzle reels found. Run the sheet sync to populate this catalog.
          </p>
        </div>
      )}

    </div>
  );
}
