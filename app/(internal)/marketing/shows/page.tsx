export const dynamic = 'force-dynamic';

// Marketing Shows — server wrapper that queries site_shows directly (no HTTP fetch, no auth loop).
// Edits made here via the modal write to the DB and immediately reflect on the public /shows page.
import MarketingShowsClient, { type SiteShow, type DeckLink } from '@/components/marketing/MarketingShowsClient';
import Link from 'next/link';
import { query } from '@/lib/db';

function getShows(): SiteShow[] {
  try {
    const rows = query<SiteShow>('SELECT * FROM site_shows ORDER BY sort_order ASC, title ASC LIMIT 200');
    // node:sqlite returns null-prototype objects; JSON round-trip makes them plain for RSC serialization
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

// Fetch all available_titles that are linked to a site_show so we can display deck chips on each card.
function getDeckLinks(): DeckLink[] {
  try {
    const rows = query<DeckLink>(
      'SELECT id, title, slug, site_show_id FROM deck_sites WHERE site_show_id IS NOT NULL'
    );
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

export default function MarketingShows() {
  const shows = getShows();
  const deckLinks = getDeckLinks();

  // Group deck links by site_show_id so each card can look up its linked packages in O(1)
  const decksByShowId: Record<string, DeckLink[]> = {};
  for (const deck of deckLinks) {
    if (!decksByShowId[deck.site_show_id]) decksByShowId[deck.site_show_id] = [];
    decksByShowId[deck.site_show_id].push(deck);
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Shows
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {shows.length} show{shows.length !== 1 ? 's' : ''} in the public catalog — click any card to edit
          </p>
        </div>
        <Link
          href="/marketing/shows/new"
          className="px-4 py-2 rounded text-sm font-medium text-white"
          style={{ background: 'var(--accent)', textDecoration: 'none' }}
        >
          + Add Show
        </Link>
      </div>

      <MarketingShowsClient initialShows={shows} decksByShowId={decksByShowId} />
    </div>
  );
}
