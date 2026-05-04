// Internal deck detail / editor page.
// Server component: reads deck site + slides directly from SQLite.
// Passes data to DeckDetailClient (client component) which handles:
//   - Slide filmstrip with inline field editing
//   - Capture / Generate AI / Publish / View Live buttons
//   - Side-by-side captured vs AI image comparison per slide
//
// Route: /decks/[id]
// Layout: wrapped by (internal)/layout.tsx with Nav sidebar

import { notFound } from 'next/navigation';
import { queryOne, query } from '@/lib/db';
import DeckDetailClient from './DeckDetailClient';

// ---------------------------------------------------------------------------
// Types (mirrors 007_deck_sites.sql schema)
// ---------------------------------------------------------------------------

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  logline: string | null;
  canva_url: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  network_target: string | null;
  ep_name: string | null;
  status: string;
  visibility: string;
  gate_password: string | null;
  slide_count: number;
  created_at: number;
  updated_at: number;
}

interface DeckSlide {
  id: string;
  deck_site_id: string;
  slide_order: number;
  slide_image_path: string | null;
  ai_image_path: string | null;
  ai_prompt: string | null;
  section_label: string | null;
  section_type: string;
  heading: string | null;
  body: string | null;
  stats_json: string | null;
  created_at: number;
}

export default async function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const siteRaw = queryOne<DeckSite>(
    `SELECT * FROM deck_sites WHERE id = ?`,
    [id]
  );

  if (!siteRaw) notFound();

  // node:sqlite returns null-prototype objects — convert to plain objects
  // so Next.js can serialize them for the Client Component boundary.
  const site = JSON.parse(JSON.stringify(siteRaw)) as DeckSite;
  const slidesRaw = query<DeckSlide>(
    `SELECT * FROM deck_slides WHERE deck_site_id = ? ORDER BY slide_order ASC`,
    [id]
  );
  const slides = JSON.parse(JSON.stringify(slidesRaw)) as DeckSlide[];

  return <DeckDetailClient site={site} slides={slides} />;
}
