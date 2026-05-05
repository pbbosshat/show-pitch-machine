// Deck Settings — server component for /marketing/available/[id]/deck-settings.
// Fetches the available title by id and passes to the client editor.
// Returns 404 if the row is not found, matching Next.js convention.

import { notFound } from 'next/navigation';
import { queryOne, initDb } from '@/lib/db';
import DeckSettingsClient, { type AvailableTitle } from './DeckSettingsClient';
import Link from 'next/link';

// Read a single available title from the DB by primary key.
// Serialized through JSON.parse/stringify to strip any non-plain-object values
// (e.g. Buffers, BigInts) before passing down to the client component.
// Returns null on any DB error or missing row — handled below as 404.
function getTitle(id: string): AvailableTitle | null {
  try {
    initDb();
    const row = queryOne<AvailableTitle>('SELECT *, gate_password AS password FROM deck_sites WHERE id = ?', [id]);
    if (!row) return null;
    return JSON.parse(JSON.stringify(row));
  } catch {
    return null;
  }
}

export default async function DeckSettingsPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const title = getTitle(id);

  // Hard 404 — Next.js renders the nearest not-found.tsx boundary.
  if (!title) notFound();

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb + page heading */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/marketing/available"
          style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}
        >
          ← Available Titles
        </Link>
        <span style={{ color: 'var(--border-subtle)' }}>/</span>
        <h1
          className="text-2xl font-bold"
          style={{
            color: 'var(--text-primary)',
            fontFamily: "'Barlow Condensed', sans-serif",
            margin: 0,
          }}
        >
          Deck Settings — {title.title}
        </h1>
      </div>

      {/* Full client-side editor — receives the hydrated row */}
      <DeckSettingsClient title={title} />
    </div>
  );
}
