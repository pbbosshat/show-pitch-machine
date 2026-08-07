// Deck Settings — server component for /marketing/available/[id]/deck-settings.
// Fetches the available title by id and passes to the client editor.
// Returns 404 if the row is not found, matching Next.js convention.

import { notFound } from 'next/navigation';
import { queryOne, query, initDb } from '@/lib/db';
import DeckSettingsClient, { type AvailableTitle } from './DeckSettingsClient';
import Link from 'next/link';

// Raw DB shape before sizzle_history is parsed from its JSON string column.
interface RawDeckRow extends Omit<AvailableTitle, 'sizzle_history'> {
  sizzle_history: string | null;
}

// Read a single available title from the DB by primary key.
// Serialized through JSON.parse/stringify to strip any non-plain-object values
// (e.g. Buffers, BigInts) before passing down to the client component.
// sizzle_history is stored as a JSON string in SQLite — parse it here so the
// client component always receives a typed SizzleEntry[] (not a raw string).
// Returns null on any DB error or missing row — handled below as 404.
// Async because initDb() and queryOne() are now Postgres-backed Promises
async function getTitle(id: string): Promise<AvailableTitle | null> {
  try {
    await initDb();
    const row = await queryOne<RawDeckRow>('SELECT *, gate_password AS password FROM deck_sites WHERE id = ?', [id]);
    if (!row) return null;
    // Parse sizzle_history JSON; default to empty array if null/malformed
    let sizzleHistory: AvailableTitle['sizzle_history'] = [];
    if (row.sizzle_history) {
      try {
        const parsed = JSON.parse(row.sizzle_history) as unknown;
        if (Array.isArray(parsed)) {
          sizzleHistory = parsed as AvailableTitle['sizzle_history'];
        }
      } catch {
        // Malformed JSON — silently default to empty array
      }
    }
    const title: AvailableTitle = { ...row, sizzle_history: sizzleHistory };
    return JSON.parse(JSON.stringify(title)) as AvailableTitle;
  } catch {
    return null;
  }
}

// Read all marketing shows for the "link to show" picker in the deck editor.
// Same direct-query + JSON serialization pattern as marketing/shows/page.tsx's
// getShows(). Returns [] on any DB error so the page still renders (the picker
// just shows no options rather than 500ing the whole deck-settings page).
async function getShows(): Promise<{ id: string; title: string }[]> {
  try {
    const rows = await query<{ id: string; title: string }>(
      'SELECT id, title FROM site_shows ORDER BY title ASC'
    );
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

export default async function DeckSettingsPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [title, shows] = await Promise.all([getTitle(id), getShows()]);

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
      <DeckSettingsClient title={title} shows={shows} />
    </div>
  );
}
