/**
 * BuyerCTA — "For TV Buyers & Distributors" feeder block.
 *
 * WHY THIS EXISTS:
 * Individual show pages at /available/[slug] are long-tail brand queries that
 * bring qualified eyeballs (TV buyers searching a specific title) to the site.
 * This block converts that traffic into PageRank flow toward the 4 B2B money
 * pages (/sizzle-reel, /how-to-pitch-a-tv-show, /tv-production-company,
 * /tv-show-pitch-deck) by placing contextual, varied internal links below the
 * show's own content (not above — we don't interrupt the show experience).
 *
 * ANCHOR TEXT VARIATION STRATEGY:
 * Google's Penguin algorithm penalizes site-wide identical anchor text.
 * We cycle through 4 different anchor/copy patterns so crawlers see natural
 * variation across the catalog rather than 60+ identical link blocks.
 * The variation is deterministic (based on the slug string hash) so it is
 * stable across renders and does not require a DB column.
 *
 * PAGE RANK FLOW:
 * Every indexed show page links to the same 4 money pages → the money pages
 * accumulate strong internal PageRank from many unique referring show pages.
 * The show pages themselves do not compete with the money pages because they
 * target show-title brand queries, not buyer-intent queries.
 *
 * Usage: <BuyerCTA title="Gone Viral" slug="gone-viral" />
 */

import Link from 'next/link';

// The 4 B2B money pages this component funnels link equity into.
// DO NOT change slugs — these must match the routes shipped in PR #3.
const MONEY_PAGES = {
  sizzleReel:    '/sizzle-reel',
  howToPitch:    '/how-to-pitch-a-tv-show',
  prodCo:        '/tv-production-company',
  pitchDeck:     '/tv-show-pitch-deck',
  catalog:       '/available',
} as const;

// ── Deterministic variation seed ─────────────────────────────────────────────
// Maps a slug to one of 4 copy variants (0–3) so anchor text varies across
// the catalog without needing runtime state or DB columns.
// Simple djb2-style char-code sum — fast, stable, no crypto dependency.
function variantIndex(slug: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(h) % 4) as 0 | 1 | 2 | 3;
}

// ── 4 copy variants — different anchors for each money page ──────────────────
// Each variant uses different anchor text for the same 4 destinations so
// Google sees natural link diversity across the catalog, not sitewide identical anchors.
//
// Variant 0: acquisition / catalog framing
// Variant 1: production / pitch framing
// Variant 2: distributor / sizzle framing
// Variant 3: buyer / deal framing

interface Variant {
  intro: string;           // opening sentence
  catalogAnchor: string;
  sizzleAnchor: string;
  howToPitchAnchor: string;
  prodCoAnchor: string;
  pitchDeckAnchor: string;
}

const VARIANTS: Variant[] = [
  // ── Variant 0: acquisition framing ──────────────────────────────────────
  {
    intro:
      'Looking to license or acquire shows like this? Explore our full',
    catalogAnchor:    'available titles catalog',
    sizzleAnchor:     'watch sizzle reels',
    howToPitchAnchor: 'learn how TV pitches work',
    prodCoAnchor:     'meet our production company',
    pitchDeckAnchor:  'see a sample pitch deck',
  },
  // ── Variant 1: pitch / production framing ───────────────────────────────
  {
    intro:
      'Interested in how shows like this get developed and sold to networks? Browse our',
    catalogAnchor:    'full slate of available programming',
    sizzleAnchor:     'production sizzle reels',
    howToPitchAnchor: 'TV show pitching guide',
    prodCoAnchor:     'TV production company background',
    pitchDeckAnchor:  'pitch deck examples',
  },
  // ── Variant 2: distributor / sizzle framing ──────────────────────────────
  {
    intro:
      'Distributors and international buyers: our complete',
    catalogAnchor:    'catalog of available titles',
    sizzleAnchor:     'sizzle reel library',
    howToPitchAnchor: 'pitching process overview',
    prodCoAnchor:     'unscripted TV production company',
    pitchDeckAnchor:  'TV pitch deck format',
  },
  // ── Variant 3: buyer / deal framing ─────────────────────────────────────
  {
    intro:
      'Ready to make a deal? Network buyers can explore the entire',
    catalogAnchor:    'programming catalog',
    sizzleAnchor:     'series sizzle reels',
    howToPitchAnchor: 'how to pitch a TV show',
    prodCoAnchor:     'about our production company',
    pitchDeckAnchor:  'TV show pitch decks',
  },
];

// ── Inline styles (no Tailwind — matches the rest of the codebase) ───────────
const sectionStyle: React.CSSProperties = {
  borderTop:    '1px solid #1e1e1e',
  borderBottom: '1px solid #1e1e1e',
  background:   '#0a0a0a',
  padding:      '40px 20px',
  marginTop:    40,
};

const headingStyle: React.CSSProperties = {
  fontFamily:    "'Roboto Condensed', sans-serif",
  fontSize:      11,
  fontWeight:    400,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  color:         '#909499',
  margin:        '0 0 14px',
};

const bodyStyle: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize:   14,
  color:      '#a5a7ad',
  lineHeight: 1.75,
  margin:     0,
};

const linkStyle: React.CSSProperties = {
  color:          '#e51d26',
  textDecoration: 'none',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BuyerCTA({ title, slug }: { title: string; slug: string }) {
  const v = VARIANTS[variantIndex(slug)];

  return (
    // Placed below the fold — the show content always comes first so the buyer
    // block never interrupts the primary pitch experience.
    <section
      style={sectionStyle}
      aria-label="For TV buyers and distributors"
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h3 style={headingStyle}>For TV Buyers &amp; Distributors</h3>

        <p style={bodyStyle}>
          {/* Opening sentence — varies by variant */}
          {v.intro}{' '}
          {/* Link 1: catalog — helps buyers find adjacent titles */}
          <Link href={MONEY_PAGES.catalog} style={linkStyle}>
            {v.catalogAnchor}
          </Link>
          {' '}for titles like <em>{title}</em>.{' '}
          {/* Link 2: sizzle reel — high-conversion money page */}
          <Link href={MONEY_PAGES.sizzleReel} style={linkStyle}>
            {v.sizzleAnchor}
          </Link>
          {', '}
          {/* Link 3: how-to-pitch — buyer education / pitch process */}
          <Link href={MONEY_PAGES.howToPitch} style={linkStyle}>
            {v.howToPitchAnchor}
          </Link>
          {', review our '}
          {/* Link 4: tv production company page — credibility signal */}
          <Link href={MONEY_PAGES.prodCo} style={linkStyle}>
            {v.prodCoAnchor}
          </Link>
          {', or download a '}
          {/* Link 5: pitch deck — bottom-of-funnel buyer asset */}
          <Link href={MONEY_PAGES.pitchDeck} style={linkStyle}>
            {v.pitchDeckAnchor}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
