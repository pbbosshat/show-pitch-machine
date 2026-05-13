export const dynamic = 'force-dynamic';

// Internal admin dashboard — all decks in one place.
// available_titles was merged into deck_sites; every show's deck is now a single row here.
//
// Route: /decks
// Layout: (internal)/layout.tsx wraps this with the Nav sidebar.

import { query } from '@/lib/db';
import DecksClient from './DecksClient';
import type { DeckSite } from './DecksClient';

export default async function DecksPage() {
  // query() is async in Postgres mode — await before JSON serialization
  const decksRaw = await query<DeckSite>(
    `SELECT id, slug, title, subtitle, genre, format, ep_count, status, visibility,
            slide_count, is_active, image_url, rights_type, canva_url,
            created_at, updated_at
     FROM deck_sites
     ORDER BY updated_at DESC`
  );
  const decks = JSON.parse(JSON.stringify(decksRaw)) as DeckSite[];

  return <DecksClient initialDecks={decks} />;
}
