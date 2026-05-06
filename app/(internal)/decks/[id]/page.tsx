// Internal deck detail / editor page.
// Server component: reads deck site + slides directly from SQLite.
// Renders a three-tab layout (Edit / Buyers / History) using URL searchParams
// so each tab is deep-linkable. Tab bar style matches pitches/[id]/page.tsx.
//
// Route: /decks/[id]?tab=edit|buyers|history
// Layout: wrapped by (internal)/layout.tsx with Nav sidebar

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { queryOne, query } from '@/lib/db';
import DeckDetailClient from './DeckDetailClient';
import BuyersTab from '@/components/decks/BuyersTab';
import HistoryTab from '@/components/decks/HistoryTab';

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
  image_url: string | null;
  vimeo_url: string | null;
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

// ---------------------------------------------------------------------------
// Tab bar — server-rendered anchor links using searchParams (same pattern as
// pitches/[id]/page.tsx). Underline style with var(--accent) for active tab.
// ---------------------------------------------------------------------------

function DeckTabBar({ deckId, activeTab }: { deckId: string; activeTab: string }) {
  const tabs: Array<{ id: string; label: string }> = [
    { id: 'edit',    label: 'Edit' },
    { id: 'buyers',  label: 'Buyers' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 28px',
        background: 'var(--bg-surface)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/decks/${deckId}?tab=${tab.id}`}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, // overlap the container border-bottom
              textDecoration: 'none',
              letterSpacing: '0.01em',
              fontFamily: 'inherit',
              transition: 'color 150ms ease',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page entry point
// ---------------------------------------------------------------------------

export default async function DeckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'edit' } = await searchParams;

  // Validate tab — default to edit on unknown values
  const activeTab = ['edit', 'buyers', 'history'].includes(tab) ? tab : 'edit';

  const siteRaw = queryOne<DeckSite>(
    `SELECT * FROM deck_sites WHERE id = ?`,
    [id]
  );

  if (!siteRaw) notFound();

  // node:sqlite returns null-prototype objects — convert to plain objects
  // so Next.js can serialize them for the Client Component boundary.
  const site = JSON.parse(JSON.stringify(siteRaw)) as DeckSite;

  // Only load slides when the Edit tab is active — no need to hit the DB
  // for the other tabs on every page load.
  let slides: DeckSlide[] = [];
  if (activeTab === 'edit') {
    const slidesRaw = query<DeckSlide>(
      `SELECT * FROM deck_slides WHERE deck_site_id = ? ORDER BY slide_order ASC`,
      [id]
    );
    slides = JSON.parse(JSON.stringify(slidesRaw)) as DeckSlide[];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>
      {/* Tab navigation — sits between the app nav and the tab content */}
      <DeckTabBar deckId={id} activeTab={activeTab} />

      {/* Tab panels — conditionally rendered based on URL param */}
      {activeTab === 'edit' && (
        // DeckDetailClient owns the header/action bar and filmstrip — pass it
        // the full site + slides as before so the Edit tab is unchanged.
        <DeckDetailClient site={site} slides={slides} />
      )}

      {activeTab === 'buyers' && (
        <div style={{ padding: '28px', maxWidth: 900, width: '100%' }}>
          <BuyersTab deckId={id} />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ padding: '28px', maxWidth: 900, width: '100%' }}>
          <HistoryTab deckId={id} />
        </div>
      )}
    </div>
  );
}
