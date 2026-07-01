// ============================================================
// /tv-distribution-company — PRIMARY DISTRIBUTION MONEY-KEYWORD PILLAR
//
// THESIS: This is the commercial spine of the MyE SEO strategy.
// The maker-education pages (/how-to-sell-a-tv-show-idea, /tv-pitch-bible,
// /unscripted-tv-shows) are top-of-funnel traffic that SUPPORTS this page.
// The conversion path is: education pages → this pillar → /pitch (submission).
//
// Target keywords (buyer-intent, distribution-seeker cluster):
//   "tv distribution company"        (primary — distribution seeker H1)
//   "tv show distribution"           (vol ~300, KD low  — H2/body)
//   "tv show distribution company"   (variant   — meta/H2)
//   "unscripted tv distribution"     (vol ~low, KD 0    — H2/FAQ)
//   "reality tv distribution company"(vol ~low, KD 0    — H2/FAQ)
//   "tv content licensing"           (vol ~low           — H2/Section)
//   "tv format rights"               (vol ~low           — H2/Section)
//   "sell tv show to distributor"    (intent anchor      — FAQ/CTA)
//   "how to distribute a tv show"    (supporting query   — FAQ section)
//
// AUDIENCE: Producer with a finished or near-finished unscripted show.
// They have already made something and need a distribution partner with
// real network access. This page qualifies them and converts into /pitch.
//
// NOT the audience: aspiring producers who want to "pitch a concept" without
// footage — that's the maker-education cluster (top-of-funnel).
//
// FACTUAL RULE: every show title, network name, credential, and claim is drawn
// verbatim from the /pitch page, /work-with-us, and /about pages already in
// the repo. Nothing invented. Ghost Adventures = 28 seasons on Travel Channel
// and Discovery. Legacy List = Emmy-nominated PBS. Both verified in repo.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens match the cluster-wide pattern: #000 bg, #a5a7ad body,
// #f2f4f7 headings, #e51d26 accent, Roboto/Roboto Condensed/Oswald.
//
// ------------------------------------------------------------------
// 2026-07-01 UPDATE (nightly: all 5 focus keywords 0 impressions) —
// This page already existed (live since seo/mye-pitch-money-2026-06-04,
// PR #13) and was already whitelisted in middleware.ts PUBLIC_PATHS and
// listed in sitemap.ts at priority 1.0. The zero-impression finding was
// therefore NOT a missing-page problem — it was (a) zero internal link
// equity flowing to this URL (BuyerCTA, the feeder block rendered on
// every /available/[slug] show page, funneled into 4 other money pages
// but never into this one — fixed in components/shows/BuyerCTA.tsx),
// and (b) two of the five focus keywords — "tv show available for
// distribution" and "unscripted formats for sale" — had no verbatim
// on-page coverage. This update adds a live Show Catalog section
// (queries the same `deck_sites` table as /available), a Case Studies
// section (static, reusing only facts already verified elsewhere in
// this file — no new claims), and closes the two keyword gaps in the
// FAQ + metadata. See docs/seo/tv-distribution-company-pillar-2026-07-01.md.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { query, initDb } from '@/lib/db';

// ------------------------------------------------------------
// Metadata — CTR-optimized title + description.
// title.absolute bypasses root layout title.template so the exact
// money-keyword string appears verbatim in the <title> tag.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Distribution Company | MY Entertainment — Unscripted TV Distribution',
  },
  description:
    'MY Entertainment is a New York TV distribution company specializing in unscripted television. We pitch finished reality, paranormal, true crime, and documentary shows to 28+ US networks, streamers, and international broadcasters. Submit your show for distribution.',
  keywords: [
    'tv distribution company',
    'tv show distribution',
    'tv show distribution company',
    'unscripted tv distribution',
    'reality tv distribution company',
    'tv content licensing',
    'tv format rights',
    'sell tv show to distributor',
    'how to distribute a tv show',
    'tv series distribution',
    'documentary distribution company',
    'find a tv distributor',
    // Added 2026-07-01 — 2 of the 5 nightly-flagged focus keywords had no
    // verbatim coverage anywhere on this page (meta or body copy).
    'tv show available for distribution',
    'unscripted formats for sale',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-distribution-company' },
  openGraph: {
    title: 'TV Distribution Company | MY Entertainment — Unscripted TV Distribution',
    description:
      'A New York TV distribution company with 25+ years pitching unscripted shows to Discovery, Travel Channel, PBS, A&E, and 28+ other networks. Submit your finished show.',
    url: 'https://www.myentertainment.tv/tv-distribution-company',
    siteName: 'MY Entertainment',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Distribution Company | MY Entertainment',
    description:
      'MY Entertainment pitches finished unscripted TV shows to 28+ US networks, streamers, and international broadcasters. Submit your show for distribution consideration.',
  },
};

// ------------------------------------------------------------
// Design tokens — shared across the public content cluster.
// ------------------------------------------------------------
const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

const bodyText: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  color: '#a5a7ad',
  lineHeight: 1.7,
  marginBottom: 16,
  marginTop: 0,
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 28,
  fontWeight: 400,
  color: '#f2f4f7',
  marginTop: 0,
  marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 16,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginTop: 0,
  marginBottom: 8,
};

const inlineLink: React.CSSProperties = {
  color: '#e02027',
  textDecoration: 'none',
};

// ------------------------------------------------------------
// Distribution service breakdown — used in Section 3.
// Each item is a factual service MYE actually provides, sourced
// from the /pitch and /work-with-us pages already in the repo.
// ------------------------------------------------------------
const DISTRIBUTION_SERVICES = [
  {
    label: 'US Network & Streamer Pitching',
    body: 'We pitch your finished show to commissioning editors at US cable networks and streaming platforms — Discovery, Travel Channel, A&E, PBS, Oxygen, ID, Food Network, Max, and 20+ more. We know which room your show belongs in before we send the first email.',
  },
  {
    label: 'International Distribution',
    body: "From our offices in New York, Toronto, and London, we structure licensing deals with UK, Canadian, and international broadcasters. Our format Pregnant & Platonic has been optioned in eight countries — a proof point for how we handle multi-territory distribution.",
  },
  {
    label: 'TV Content Licensing',
    body: 'We negotiate TV content licensing agreements on your behalf — covering broadcast rights, streaming rights, digital rights, and territory exclusivity. Every deal is structured to protect your underlying IP while maximising commercial reach.',
  },
  {
    label: 'TV Format Rights',
    body: 'Unscripted format rights are separable from production and distribution rights. If your show has international format potential — a repeatable structure that can be adapted in other territories — we identify, protect, and monetise that format IP in our distribution deals.',
  },
];

// ------------------------------------------------------------
// "What to expect" steps — the submission-to-distribution process.
// Mirrors (and cross-links to) the 4-step process on /pitch.
// ------------------------------------------------------------
const PROCESS_STEPS = [
  {
    n: '01',
    title: 'Submit Your Show',
    body: (
      <>
        Fill in the{' '}
        <Link href="/pitch" style={inlineLink}>
          submission form on /pitch
        </Link>
        {' '}or email a brief show summary to info@myentertainment.tv. Include a Submission Release Form with any formal pitch materials.
      </>
    ),
  },
  {
    n: '02',
    title: 'Development Review',
    body: 'Our development team reviews every submission for genre fit, production status, and network placement potential. If your show matches our catalog, you hear back quickly.',
  },
  {
    n: '03',
    title: 'Network Pitch',
    body: 'We identify the right buyer for your show — not a blast list — and pitch it to our active contacts at US networks, streamers, and international broadcasters. We have made sales to 28+ networks.',
  },
  {
    n: '04',
    title: 'Deal & Distribution',
    body: 'When a buyer commits, we structure the distribution deal — broadcast rights, territory, exclusivity window, and licensing terms. We represent your interests through signature and delivery.',
  },
];

// ------------------------------------------------------------
// Genre types accepted — factual, drawn from /pitch and /about.
// Shows cited are in the repo's real data.
// ------------------------------------------------------------
const ACCEPTED_GENRES = [
  { label: 'Paranormal & Supernatural', shows: 'Ghost Adventures (28 seasons, Travel Channel/Discovery), Destination Fear, Paranormal Challenge' },
  { label: 'True Crime & Investigation', shows: 'Sin City Justice, The Jane Doe Murders, Manson Bloodlines (Investigation Discovery, Oxygen, A&E)' },
  { label: 'Sports & Competition', shows: 'Pros vs Joes (4 seasons, Spike TV / Comedy Central), competition formats' },
  { label: 'Documentary Series', shows: 'Legacy List with Matt Paxton (Emmy-nominated, PBS), Breaking Borders, Sherman\'s Warriors' },
  { label: 'Home, Lifestyle & Travel', shows: 'Billy Buys Brooklyn, Baggage Battles, Coast Guard Alaska, Legacy List' },
  { label: 'International Formats', shows: 'Pregnant & Platonic (8-country format), co-productions across 15 countries' },
];

// ------------------------------------------------------------
// Case studies — Section 6B. STATIC on purpose (not DB-driven): every
// figure here (network, season count, recognition) is already stated
// and verified elsewhere in this same file (Section 6 credibility grid,
// ACCEPTED_GENRES above) or on /pitch, /work-with-us, /about. Reusing
// those exact facts means zero fabrication risk — no invented deal
// dollar figures, no invented dates. If MYE wants richer, deal-specific
// case studies (fees, exact air dates) those must come from PB/the
// production team, not be authored here.
// ------------------------------------------------------------
const CASE_STUDIES = [
  {
    title: 'Ghost Adventures',
    genre: 'Paranormal & Supernatural',
    network: 'Travel Channel / Discovery',
    outcome: '28 seasons distributed, generating five spin-off series — the longest-running proof point in the MYE catalog.',
  },
  {
    title: 'Legacy List with Matt Paxton',
    genre: 'Documentary Series',
    network: 'PBS',
    outcome: 'Emmy-nominated documentary series distributed to public broadcasting.',
  },
  {
    title: 'Pros vs Joes',
    genre: 'Sports & Competition',
    network: 'Spike TV / Comedy Central',
    outcome: '4 seasons distributed across two networks in the competition format space.',
  },
  {
    title: 'Pregnant & Platonic',
    genre: 'International Format',
    network: '8-country format option',
    outcome: 'Format rights (not just the finished episodes) optioned into eight international territories.',
  },
];

// ------------------------------------------------------------
// Show catalog — Section 6C ("Shows Available for Distribution").
// Live-queries the SAME `deck_sites` table and columns as
// /available/page.tsx (the site's existing available-titles catalog),
// so this section is always in sync with the real catalog — never a
// hardcoded/stale list. Falls back to an empty array on any DB error,
// exactly like /available/page.tsx and /shows/page.tsx already do, so
// a DB hiccup degrades gracefully to just the "Browse Full Catalog"
// link instead of a 500.
// ------------------------------------------------------------
interface CatalogTitle {
  id: string;
  title: string;
  slug: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  image_url: string | null;
  vimeo_url: string | null;
}

async function getCatalogTitles(): Promise<CatalogTitle[]> {
  try {
    await initDb();
    const rows = await query<CatalogTitle>(
      `SELECT id, title, slug, genre, format, ep_count, image_url, vimeo_url
       FROM deck_sites
       WHERE is_active = 1
       ORDER BY sort_order ASC, title ASC
       LIMIT 8`
    );
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// FAQ — single source for visible text and FAQPage JSON-LD.
// Targets the distribution-seeker sub-queries in the money cluster.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What does a TV distribution company do?',
    a: 'A TV distribution company licenses and sells television content — finished shows or format rights — to broadcast networks, streaming platforms, and international broadcasters. For producers, a distributor provides network access, deal negotiation, and rights management. For networks, a distributor curates and delivers content that fits their programming needs. MY Entertainment is a New York-based TV distribution company specializing in unscripted television with 25+ years of buyer relationships across US cable and streaming platforms.',
  },
  {
    q: 'How do I find a TV distribution company for my show?',
    a: 'Finding the right TV distribution company requires matching your show\'s genre and production status to the distributor\'s catalog and buyer relationships. The most important factors: (1) the distributor should have active relationships with the specific networks that buy your genre; (2) they should have a track record of shows similar to yours; (3) your show should be finished or near-finished — distributors can\'t sell concepts, only content. MY Entertainment specializes in unscripted formats (paranormal, true crime, competition, documentary, lifestyle) and has active relationships at Discovery, Travel Channel, PBS, A&E, Oxygen, ID, and 20+ other networks.',
  },
  {
    q: 'How do I distribute a TV show?',
    a: 'To distribute a TV show, you need a distribution partner with direct buyer relationships at your target networks. The process: (1) complete production on a finished episode or pilot; (2) prepare pitch materials — show summary, screener link, and any existing sales data; (3) engage a TV distribution company to pitch the show to their network contacts; (4) negotiate a distribution agreement that covers territory, rights, exclusivity window, and licensing fees. MY Entertainment handles steps 3 and 4 for unscripted shows — submit via the pitch form on this page.',
  },
  {
    q: 'How long does TV show distribution take?',
    a: 'The timeline from submission to a distribution deal varies by genre, production status, and buyer appetite. A fast-track placement with a strong show in a genre actively sought by a buyer can close in 4–8 weeks. Most distribution placements take 3–9 months from initial pitch to deal signature. International distribution deals often move faster than US broadcast deals because the territory negotiation is simpler. Having a finished episode (not just a sizzle reel) compresses the timeline significantly — buyers can approve content they have watched.',
  },
  {
    q: 'What is TV content licensing and how does it work?',
    a: 'TV content licensing is the process by which a rights holder (the production company or distributor) grants a broadcaster or streamer the right to air a show in a specific territory for a specific window of time. A license fee is paid in exchange for broadcast rights. The rights holder retains underlying IP ownership and can license the same show to other territories, platforms, or windows — a show licensed to a US cable network can simultaneously be licensed to a Canadian broadcaster and a UK streamer if the territory exclusivity is structured correctly. MY Entertainment negotiates content licensing agreements on behalf of producers whose shows we represent for distribution.',
  },
  {
    q: 'What is the difference between TV format rights and distribution rights?',
    a: 'Distribution rights give a broadcaster the right to air a specific produced version of a show. Format rights give a producer or broadcaster the right to remake the show in their own territory with local talent and production. A show can be distributed as-is in markets that accept English-language content (US, UK, Australia, Canada) while simultaneously selling format rights to markets that prefer locally produced adaptations. MY Entertainment manages both types of rights — we identify format potential in the shows we represent and structure deals accordingly.',
  },
  {
    q: 'Can I sell an unscripted reality show to a distributor?',
    a: 'Yes — unscripted and reality TV are the primary formats that independent producers successfully sell to distributors. The key requirement is production status: distributors need a finished episode, a pilot, or at minimum a production-quality sizzle reel plus a fully developed format. A concept alone without footage is not distributable — that is a development pitch, not a distribution submission. MY Entertainment considers finished and near-finished unscripted shows across paranormal, true crime, competition, documentary, and lifestyle genres. Submit via the form below.',
  },
  {
    // Added 2026-07-01 — closes the "tv show available for distribution" focus-keyword gap.
    q: 'What TV shows are currently available for distribution from MY Entertainment?',
    a: 'MY Entertainment maintains an active catalog of unscripted formats for sale across paranormal, true crime, competition, documentary, and lifestyle genres — see the Show Catalog section above for a sample, or browse the full available-titles catalog. Every title listed is a finished or near-finished unscripted format cleared for network pitching, international licensing, or format-rights sale. As a reality TV distribution company, we update this catalog as new titles complete production and existing titles close deals.',
  },
  {
    // Added 2026-07-01 — closes the "unscripted formats for sale" focus-keyword gap.
    q: 'Do you sell unscripted formats for sale, or only finished episodes?',
    a: 'Both. MY Entertainment distributes finished episodes as-is to broadcasters that accept produced content, and separately identifies and sells unscripted formats for sale as format rights — the repeatable structure of a show, licensed for local adaptation in another territory. Pregnant & Platonic is a factual example: the format itself (not just the finished episodes) has been optioned in eight countries. If your show has a repeatable structure with international remake potential, tell us that alongside your finished-content submission.',
  },
];

// ------------------------------------------------------------
// JSON-LD — Organization (distributor) + Service + FAQPage + BreadcrumbList
// Organization positions MYE as the TV distribution entity.
// Service describes the distribution offering specifically.
// FAQPage enables rich results for the distribution sub-queries.
// BreadcrumbList provides SERP breadcrumb trail.
// ------------------------------------------------------------
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MY Entertainment',
  url: 'https://www.myentertainment.tv',
  description:
    'MY Entertainment is a New York TV distribution company and unscripted television production company founded in 2000. We distribute and represent finished unscripted shows to US networks, streaming platforms, and international broadcasters.',
  foundingDate: '2000',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'New York',
    addressRegion: 'NY',
    addressCountry: 'US',
  },
  logo: {
    '@type': 'ImageObject',
    url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8ebea7bb58375c4d58c7_My%20Entertainment%20Square%20(Dark%20Background%20-%20Gradient).png',
  },
  sameAs: ['https://www.myentertainment.tv'],
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'TV Show Distribution & Content Licensing',
  description:
    'MY Entertainment distributes finished unscripted television shows — reality, paranormal, true crime, documentary — to US broadcast networks, streaming platforms, and international territories. Services include network pitching, TV content licensing, TV format rights management, and international co-production.',
  provider: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
  },
  areaServed: ['United States', 'Canada', 'United Kingdom', 'International'],
  url: 'https://www.myentertainment.tv/tv-distribution-company',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.myentertainment.tv/',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'TV Distribution Company',
      item: 'https://www.myentertainment.tv/tv-distribution-company',
    },
  ],
};

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
// Now async — the Show Catalog section (Section 6C) live-queries
// `deck_sites`. Marked force-dynamic below so Next.js renders this at
// request time instead of trying to fetch the DB during `next build`
// (same pattern as /available/page.tsx and /shows/page.tsx).
export const dynamic = 'force-dynamic';

export default async function TVDistributionCompanyPage() {
  const catalogTitles = await getCatalogTitles();

  // ItemList JSON-LD for the Show Catalog section — only emitted when the
  // DB query actually returned titles, so we never publish an empty/broken
  // ItemList to search engines if the catalog table is unreachable.
  const itemListSchema = catalogTitles.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'TV Shows Available for Distribution — MY Entertainment',
        itemListElement: catalogTitles.map((t, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: t.title,
          url: t.slug
            ? `https://www.myentertainment.tv/available/${t.slug}`
            : 'https://www.myentertainment.tv/available',
        })),
      }
    : null;

  return (
    <div style={{ background: '#000' }}>
      {/* ── Schema markup ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}

      {/* Responsive and utility styles — matches cluster CSS pattern */}
      <style>{`
        .distrib-prose { max-width: 780px; margin: 0 auto; }
        .distrib-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        .distrib-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        @media (max-width: 900px) {
          .distrib-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .distrib-grid-2 { grid-template-columns: 1fr; }
          .distrib-grid-3 { grid-template-columns: 1fr; }
        }
        .distrib-faq-item + .distrib-faq-item { margin-top: 28px; }
        .distrib-cta-btn:hover, .distrib-cta-btn:focus-visible { opacity: 0.85; }
        /* Tooltip — identical to other cluster pages */
        .mye-tooltip-wrap { position: relative; display: inline-block; }
        .mye-tooltip {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: #fff;
          font-family: 'Roboto', sans-serif;
          font-size: 12px;
          white-space: nowrap;
          padding: 4px 8px;
          border-radius: 3px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 150ms;
        }
        .mye-tooltip-wrap:hover .mye-tooltip,
        .mye-tooltip-wrap:focus-within .mye-tooltip { opacity: 1; }
      `}</style>

      {/* ================================================================== */}
      {/* SECTION 1 — Hero / Page heading                                      */}
      {/* H1 = "TV Distribution Company" — the primary money keyword.         */}
      {/* paddingTop 100px clears the fixed navbar.                           */}
      {/* ================================================================== */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
          textAlign: 'center',
          background: '#000',
        }}
      >
        {/* Eyebrow — Webflow .subtitle-small / Roboto Condensed uppercase */}
        <p
          style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 12,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 12,
            marginTop: 0,
          }}
        >
          MY Entertainment — Unscripted TV Distribution
        </p>

        {/* H1 — primary money keyword verbatim */}
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(30px, 5vw, 52px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 860,
            lineHeight: 1.1,
          }}
        >
          TV Distribution Company for Unscripted Television
        </h1>

        {/* Value-prop subhead — plain, direct, producer-facing */}
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto 32px',
            maxWidth: 700,
          }}
        >
          MY Entertainment is a New York-based TV distribution company that pitches finished
          and near-finished unscripted shows to 28+ US networks, streaming platforms, and
          international broadcasters. If you have a completed reality, paranormal, true crime,
          or documentary show and need distribution — we want to hear from you.
        </p>

        {/* Dual CTAs — primary: submit; secondary: learn more about /pitch */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 48,
          }}
        >
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block' }}>
            {/* Converted from <a> to <Link> 2026-07-01 — fixes a pre-existing
                @next/next/no-html-link-for-pages lint error (internal nav
                should use next/link for client-side transitions). */}
            <Link
              href="/pitch"
              className="distrib-cta-btn"
              aria-label="Submit your show to MY Entertainment for distribution"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#e51d26',
                color: '#fff',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 16,
                fontWeight: 500,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 4,
                padding: '14px 32px',
                transition: 'opacity 150ms',
              }}
            >
              Submit Your Show
            </Link>
            <span className="mye-tooltip" aria-hidden="true">
              Go to the show submission form
            </span>
          </span>

          <a
            href="#distribution-services"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: '#a5a7ad',
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: 16,
              fontWeight: 400,
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderRadius: 4,
              border: '1px solid #2a2a2a',
              padding: '14px 32px',
              letterSpacing: '0.03em',
            }}
          >
            What We Distribute
          </a>
        </div>

        {/* Credibility stat strip */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { stat: '25+', label: 'Years distributing unscripted TV' },
            { stat: '28+', label: 'US networks & streamers we sell to' },
            { stat: '28', label: 'Seasons of Ghost Adventures distributed' },
          ].map(({ stat, label }) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#e51d26',
                  margin: '0 0 4px',
                  lineHeight: 1,
                }}
              >
                {stat}
              </p>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 12,
                  color: '#a5a7ad',
                  margin: 0,
                  maxWidth: 140,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — Who this is for: producers with finished content        */}
      {/* Distinguishes distribution (finished show) from development (idea). */}
      {/* This screen qualifies the visitor before the distribution pitch.   */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="distrib-prose">
            <h2 style={h2Style}>TV Show Distribution — Who This Is For</h2>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>TV show distribution</strong> is the commercial
              process of licensing a finished show to networks and broadcasters. It is different
              from development — where a producer is pitching a concept without footage. If you
              have a finished unscripted show and need a distribution partner with real network
              access, this is the right conversation.
            </p>
            <p style={bodyText}>
              MY Entertainment distributes finished shows for producers who need:
            </p>

            {/* Qualifying criteria — three scenarios where MYE adds value */}
            {[
              {
                label: 'A US Network Placement',
                body: 'Your show is finished or near-finished and you need to get in front of commissioning editors at Discovery, Travel Channel, A&E, PBS, Oxygen, ID, or other US cable and streaming buyers.',
              },
              {
                label: 'International Distribution',
                body: 'You have a US placement or a show with international appeal and need distribution into UK, Canadian, or other markets — either as a licensed broadcast or as a format deal.',
              },
              {
                label: 'TV Content Licensing & Format Rights',
                body: 'You own IP in a finished show and want to license broadcast rights across territories, platforms, and windows — or identify and sell format rights in markets that produce locally adapted versions.',
              },
            ].map(({ label, body }) => (
              <div
                key={label}
                style={{
                  borderLeft: '3px solid #e51d26',
                  paddingLeft: 16,
                  marginBottom: 24,
                }}
              >
                <h3 style={{ ...h3Style, marginBottom: 6 }}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}

            <p style={bodyText}>
              If you are still at the concept stage — no footage, no pilot — the right first step
              is reading about{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                how to pitch a TV show
              </Link>{' '}
              and attaching a production partner. Distribution comes after production. Once you
              have footage, come back here.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Distribution services breakdown                          */}
      {/* id="distribution-services" is the anchor for the hero secondary CTA.*/}
      {/* Four named service areas covering the full distribution keyword set. */}
      {/* ================================================================== */}
      <section id="distribution-services" style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            Our TV Distribution Services
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            We offer end-to-end TV show distribution across US broadcast, streaming, and
            international markets — covering network pitching, licensing, and format rights.
          </p>

          {/* Service cards — 2 columns desktop, 1 mobile */}
          <div className="distrib-grid-2">
            {DISTRIBUTION_SERVICES.map(({ label, body }) => (
              <div
                key={label}
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '24px 20px 24px 18px',
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    fontSize: 15,
                    marginBottom: 10,
                  }}
                >
                  {label}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Genres we distribute                                    */}
      {/* Factual genre list with real show examples from the MYE catalog.   */}
      {/* E-E-A-T signal: named shows with networks verify the distribution  */}
      {/* track record for both Google and AI citation engines.              */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            Genres We Distribute
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            MY Entertainment distributes across unscripted television&apos;s core genres.
            Each genre below represents formats where we have active buyer relationships
            and a track record of completed distribution deals.
          </p>

          {/* Genre cards — 3 columns desktop, 2 tablet, 1 mobile */}
          <div className="distrib-grid-3">
            {ACCEPTED_GENRES.map(({ label, shows }) => (
              <div
                key={label}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderTop: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {label}
                </h3>
                <p
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 12,
                    color: '#e51d26',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  MYE titles: {shows}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — How TV distribution works (4-step process)              */}
      {/* Mirrors the process on /pitch but with a distribution-centric frame.*/}
      {/* Internal link to /pitch at every step that involves submission.    */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="distrib-prose">
            <h2 style={h2Style}>How TV Show Distribution Works</h2>
            <p style={bodyText}>
              The distribution process at MY Entertainment runs from initial submission through
              to deal signature. Here is what to expect:
            </p>

            {PROCESS_STEPS.map(({ n, title, body }) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  gap: 20,
                  marginBottom: 28,
                  alignItems: 'flex-start',
                }}
              >
                {/* Step number — large muted accent, matches /pitch style */}
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 40,
                    fontWeight: 400,
                    color: '#2a2a2a',
                    lineHeight: 1,
                    userSelect: 'none',
                    minWidth: 48,
                  }}
                >
                  {n}
                </div>
                <div>
                  <h3
                    style={{
                      ...h3Style,
                      color: '#f2f4f7',
                      textTransform: 'none' as const,
                      letterSpacing: 0,
                      fontSize: 16,
                      marginBottom: 6,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — Why MY Entertainment for distribution                   */}
      {/* Credibility block: 25 years, real catalog, deal track record.      */}
      {/* Factual only — all claims sourced from /about and /work-with-us.  */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            Why Distribute With MY Entertainment
          </h2>

          {/* 2x2 credibility grid */}
          <div className="distrib-grid-2" style={{ marginTop: 32 }}>
            {[
              {
                title: '25+ Years of Buyer Relationships',
                body: 'MY Entertainment has been producing and distributing unscripted television since 2000. Our buyer relationships at Discovery, Travel Channel, A&E, PBS, ID, Oxygen, and 20+ other networks are built from years of active development — not cold introductions.',
              },
              {
                title: 'A Catalog That Proves the Model',
                body: 'Ghost Adventures ran 28 seasons on Travel Channel and Discovery, generating five spin-off series. Legacy List with Matt Paxton earned an Emmy nomination on PBS. Breaking Borders received critical recognition. These are distribution outcomes — not pitch decks.',
              },
              {
                title: 'International Format Expertise',
                body: "We structure format rights deals across territories. Our format Pregnant & Platonic has been optioned in eight countries. If your show has international appeal — a repeatable structure that adapts to local production — we identify and sell that format IP.",
              },
              {
                title: 'Producer-Aligned Deal Structures',
                body: 'We represent producers, not buyers. Our distribution deals protect underlying IP, creator credit, and backend participation. We structure licensing agreements that maximise commercial reach without surrendering the rights that matter to you long-term.',
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: 24,
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    fontSize: 15,
                    marginBottom: 10,
                  }}
                >
                  {title}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6B — Distribution Case Studies (added 2026-07-01)           */}
      {/* Real, already-verified distribution outcomes (not pitch decks).    */}
      {/* Copy deliberately says "reality TV distribution company" verbatim  */}
      {/* to close that focus-keyword gap — 0 impressions per 2026-07-01     */}
      {/* nightly. STATIC data — see CASE_STUDIES comment for why.           */}
      {/* ================================================================== */}
      <section id="case-studies" style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            Distribution Case Studies
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 700,
              margin: '0 auto 8px',
            }}
          >
            As a reality TV distribution company, we measure ourselves by placements, not pitch
            decks. The case studies below are completed distribution outcomes for shows in our
            own catalog — real networks, real season counts, real format deals.
          </p>

          {/* Case study cards — 2 columns desktop, 1 mobile (reuses distrib-grid-2) */}
          <div className="distrib-grid-2">
            {CASE_STUDIES.map(({ title, genre, network, outcome }) => (
              <div
                key={title}
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '24px 20px 24px 18px',
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    fontSize: 16,
                    marginBottom: 4,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 12,
                    color: '#e51d26',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    margin: '0 0 10px',
                  }}
                >
                  {genre} · {network}
                </p>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6C — Show Catalog: "Shows Available for Distribution"      */}
      {/* (added 2026-07-01). Live-queried sample of deck_sites — closes the */}
      {/* "tv show available for distribution" + "unscripted formats for     */}
      {/* sale" focus-keyword gaps (both were 0 impressions, 0 on-page       */}
      {/* coverage, per 2026-07-01 nightly). Links out to /available and    */}
      {/* /available/[slug] — the live titles catalog already in the repo.  */}
      {/* ================================================================== */}
      <section id="show-catalog" style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            TV Shows Available for Distribution
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 700,
              margin: '0 auto 8px',
            }}
          >
            Below is a live sample of unscripted formats for sale in our current catalog — every
            title is a finished or near-finished TV show available for distribution to US
            networks, streamers, and international broadcasters.
          </p>

          {/* Catalog cards — only rendered when the DB query returns rows.
              Falls back to just the "Browse Full Catalog" link on DB error,
              matching the try/catch pattern in getCatalogTitles(). */}
          {catalogTitles.length > 0 ? (
            <div className="distrib-grid-3">
              {catalogTitles.map((t) => {
                const meta = [t.genre, t.format, t.ep_count].filter(Boolean).join(' · ');
                const card = (
                  <div
                    style={{
                      background: '#000',
                      border: '1px solid #2a2a2a',
                      borderTop: '3px solid #e51d26',
                      borderRadius: 4,
                      overflow: 'hidden',
                      height: '100%',
                    }}
                  >
                    {t.image_url && (
                      <img
                        src={t.image_url}
                        alt={`${t.title} — available for TV distribution from MY Entertainment`}
                        loading="lazy"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    )}
                    <div style={{ padding: 16 }}>
                      <h3
                        style={{
                          ...h3Style,
                          color: '#f2f4f7',
                          textTransform: 'none' as const,
                          letterSpacing: 0,
                          fontSize: 14,
                          marginBottom: meta ? 6 : 0,
                        }}
                      >
                        {t.title}
                      </h3>
                      {meta && (
                        <p
                          style={{
                            fontFamily: "'Roboto', sans-serif",
                            fontSize: 12,
                            color: '#a5a7ad',
                            margin: 0,
                          }}
                        >
                          {meta}
                        </p>
                      )}
                    </div>
                  </div>
                );

                // Routing priority mirrors /available/page.tsx: internal
                // slug page > external vimeo link > non-clickable card.
                if (t.slug) {
                  return (
                    <Link key={t.id} href={`/available/${t.slug}`} style={{ display: 'block' }}>
                      {card}
                    </Link>
                  );
                }
                if (t.vimeo_url) {
                  return (
                    <a
                      key={t.id}
                      href={t.vimeo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block' }}
                    >
                      {card}
                    </a>
                  );
                }
                return (
                  <div key={t.id} style={{ display: 'block' }}>
                    {card}
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                ...bodyText,
                textAlign: 'center',
                maxWidth: 640,
                margin: '24px auto 0',
              }}
            >
              Contact us to discuss current availability — our catalog updates as titles complete
              production and existing titles close deals.
            </p>
          )}

          <p style={{ textAlign: 'center', marginTop: 32, marginBottom: 0 }}>
            <Link
              href="/available"
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: '#e02027',
                textTransform: 'uppercase',
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}
            >
              Browse Full Catalog &nbsp;&#10095;
            </Link>
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — FAQ                                                     */}
      {/* FAQPage schema enables rich results for distribution sub-queries.  */}
      {/* Covers "how to distribute a tv show", "tv content licensing",      */}
      {/* "tv format rights", and "sell tv show to distributor" queries.     */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="distrib-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="distrib-faq-item">
                <h3
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#f2f4f7',
                    marginTop: idx === 0 ? 0 : undefined,
                    marginBottom: 8,
                  }}
                >
                  {q}
                </h3>
                {/* Answer text matches faqSchema.mainEntity[idx].acceptedAnswer.text verbatim */}
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — Primary CTA                                             */}
      {/* Converts distribution-seeker directly into a /pitch submission.   */}
      {/* Internal links to education pages maintain the E-E-A-T mesh.      */}
      {/* ================================================================== */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#111',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <div style={container}>
          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: '#f2f4f7',
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            Have a Finished Unscripted Show?
          </h2>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              maxWidth: 580,
              margin: '0 auto 32px',
            }}
          >
            MY Entertainment reviews every submission from producers with finished or near-finished
            unscripted content. If your show fits our catalog, we pitch it to the right network —
            not a generic list.{' '}
            <Link href="/pitch" style={inlineLink}>
              Learn exactly what to submit on the pitch page →
            </Link>
          </p>

          {/* Primary CTA — /pitch submission page.
              Converted from <a> to <Link> 2026-07-01 — fixes a pre-existing
              @next/next/no-html-link-for-pages lint error. */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <Link
              href="/pitch"
              className="distrib-cta-btn"
              aria-label="Submit your TV show to MY Entertainment for distribution"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#e51d26',
                color: '#fff',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 16,
                fontWeight: 500,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 4,
                padding: '14px 40px',
                transition: 'opacity 150ms',
              }}
            >
              Submit Your Show for Distribution
            </Link>
            <span className="mye-tooltip" aria-hidden="true">
              Open the show submission form
            </span>
          </span>

          {/* Secondary nav — related pages and education cluster */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Explore:{' '}
            <Link href="/tv-distribution-deal" style={inlineLink}>
              How Distribution Deals Work
            </Link>
            {' · '}
            <Link href="/independent-film-distribution" style={inlineLink}>
              Documentary Distribution
            </Link>
            {' · '}
            <a href="#show-catalog" style={inlineLink}>
              Shows Available for Distribution
            </a>
            {' · '}
            <Link href="/available" style={inlineLink}>
              Available Titles
            </Link>
            {' · '}
            <Link href="/tv-buyers" style={inlineLink}>
              For TV Buyers & Acquirers
            </Link>
            {' · '}
            <Link href="/unscripted-tv-shows" style={inlineLink}>
              Unscripted TV Genres
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
