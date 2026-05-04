// Internal admin dashboard for managing pitch deck microsites.
// Server component: reads deck_sites directly from SQLite and renders the grid.
// Client sub-component (DecksClient) handles the filter tabs and "+ New Deck" modal.
//
// Route: /decks
// Layout: (internal)/layout.tsx wraps this with the Nav sidebar.

import { query } from '@/lib/db';
import DecksClient from './DecksClient';

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  status: string;        // draft | published
  visibility: string;    // public | internal | gated
  slide_count: number;
  created_at: number;
  updated_at: number;
}

export default async function DecksPage() {
  // Fetch all deck sites newest-first — no pagination needed at this scale
  const decksRaw = query<DeckSite>(
    `SELECT id, slug, title, subtitle, genre, format, ep_count, status, visibility,
            slide_count, created_at, updated_at
     FROM deck_sites
     ORDER BY created_at DESC`
  );
  // node:sqlite returns null-prototype objects — convert for client boundary
  const decks = JSON.parse(JSON.stringify(decksRaw)) as DeckSite[];

  return <DecksClient initialDecks={decks} />;
}
