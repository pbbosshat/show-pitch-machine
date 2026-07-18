// ============================================================
// /how-to-sell-a-tv-show — Master Pillar: Pitch → Distribution Deal
//
// THESIS (Fable-reviewed, 2026-07-17): the nightly rank tracker originally
// proposed "how to distribute a tv show" as a target — but that phrase is
// creator-seeking-distribution framing with near-zero real search volume
// (the existing /tv-distribution-deal page already owns that narrow angle
// and gets ~0 impressions on it). The corrected, seller-side angle is
// "how to sell a tv show" — the phrase real searchers (producers, IP
// holders, showrunners) actually type when they want to understand the
// FULL path from pitch to a signed distribution deal. That full-journey
// scope is genuinely new ground: no existing page on this site spans
// pitch mechanics AND distribution-deal mechanics AND international sale
// in one place. This page is the hub; it summarizes each stage and links
// out to the deeper spoke pages (/tv-show-pitch, /how-to-pitch-a-tv-show,
// /tv-distribution-deal, /tv-show-pitch-deck, /sizzle-reel, /international,
// /tv-buyers) rather than duplicating their depth — avoiding keyword
// cannibalization while capturing the broad "how to sell/distribute/pitch
// a tv show" query cluster.
//
// AUDIENCE: a producer, showrunner, or IP holder — at any stage from a
// packaged idea to a finished pilot — who wants to understand how TV
// shows actually get sold and distributed before they submit anywhere.
//
// FACTUAL RULE: every credit, network name, stat, and company fact below
// is sourced verbatim from this repo's own Organization schema (layout.tsx)
// and the already-published /pitch, /tv-distribution-deal, and
// /tv-distribution-company pages. Nothing invented. MY Entertainment
// develops, produces, and distributes UNSCRIPTED (non-fiction) content —
// this page is written from that lens throughout, not scripted drama.
//
// Server Component — no 'use client'. All styles inline, matching the
// rest of the (public) cluster (bg #000, headings #f2f4f7, body #a5a7ad,
// accent #e51d26, Roboto / Roboto Condensed / Oswald).
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses the root layout's "%s | MY
// Entertainment" template so the exact spec'd title string ships as-is.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'How to Sell & Distribute a TV Show (2026 Guide) | MYE',
  },
  description:
    "How TV shows get sold and distributed — pitch decks, sizzle reels, who's buying, deal terms, and how to submit your show to MY Entertainment's slate.",
  keywords: [
    'how to sell a tv show',
    'how to distribute a tv show',
    'how to pitch a tv show',
    'sell a tv show to a network',
    'how does a tv show get sold',
    'selling a tv show',
    'tv show distribution deal',
    'how to get a tv show picked up',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/how-to-sell-a-tv-show' },
  openGraph: {
    title: 'How to Sell & Distribute a TV Show (2026 Guide) | MYE',
    description:
      "How TV shows get sold and distributed — pitch decks, sizzle reels, who's buying, deal terms, and how to submit your show to MY Entertainment's slate.",
    url: 'https://www.myentertainment.tv/how-to-sell-a-tv-show',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Sell & Distribute a TV Show (2026 Guide)',
    description:
      "Pitch decks, sizzle reels, who's buying, deal terms, and how to submit your show to MY Entertainment's slate.",
  },
};

// ------------------------------------------------------------
// Design tokens — copied verbatim from the rest of the (public) cluster
// (see /tv-distribution-deal, /tv-show-pitch) so this page is visually
// consistent without importing a shared module none of the sibling
// pages use either.
// ------------------------------------------------------------
const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

const prose: React.CSSProperties = {
  maxWidth: 780,
  margin: '0 auto',
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
  fontSize: 15,
  fontWeight: 400,
  color: '#f2f4f7',
  marginTop: 0,
  marginBottom: 8,
};

const accentLabel: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 12,
  color: '#e51d26',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  marginTop: 0,
  marginBottom: 4,
};

const inlineLink: React.CSSProperties = {
  color: '#e02027',
  textDecoration: 'none',
};

const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
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
};

const ctaSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
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
};

// ------------------------------------------------------------
// Reusable dual-CTA block — rendered in the hero, mid-page (after the
// submission-process section), and again at the end, per spec.
// ------------------------------------------------------------
function DualCta({ idSuffix }: { idSuffix: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      <a
        href="/pitch"
        className="sell-cta-btn"
        aria-label="Submit your show to MY Entertainment"
        style={ctaPrimary}
        id={`submit-cta-${idSuffix}`}
      >
        Submit Your Show
      </a>
      <Link href="/available" className="sell-cta-btn" style={ctaSecondary}>
        Browse Available Titles
      </Link>
    </div>
  );
}

// ------------------------------------------------------------
// SECTION 2 data — "Is your show sellable?" checklist, written from the
// unscripted lens. Genres list matches Organization.genre in layout.tsx
// verbatim — do not add genres MYE doesn't work in (e.g. scripted drama).
// ------------------------------------------------------------
const SELLABILITY_FACTORS = [
  {
    label: 'A clear hook',
    body: 'What is this show in one sentence, and why does it need to exist now? Buyers hear hundreds of loglines a year — the ones that get a second meeting are specific, not generic ("a paranormal team investigates America’s most haunted places" beats "a show about ghosts").',
  },
  {
    label: 'A returnable format',
    body: 'Unscripted buyers commission for multiple seasons, not one-offs. A strong format repeats: the same premise can generate new episodes (new location, new case, new competitor) without exhausting the concept in a single season.',
  },
  {
    label: 'Genre fit',
    body: 'MY Entertainment develops, produces, and distributes unscripted content in paranormal, sports and competition, home and lifestyle, crime, comedy, food and travel, and reality TV. A scripted drama or a narrow-interest hobby show is not a fit here — know your buyer’s catalog before you pitch.',
  },
  {
    label: 'Access and talent',
    body: 'Do you have access to the people, locations, or story rights the show depends on? A true-crime or docuseries pitch built on an exclusive interview or family cooperation is stronger than one built on public-record research alone.',
  },
  {
    label: 'Production readiness',
    body: 'You do not need a finished series to start the conversation — but the further along you are (a shot pilot, a cut sizzle, a locked format) the faster a buyer can say yes, because they are deciding on something they can actually watch.',
  },
];

// ------------------------------------------------------------
// SECTION 4 data — who buys TV shows, by channel type.
// ------------------------------------------------------------
const BUYER_TYPES = [
  {
    label: 'Broadcast & Cable Networks',
    body: 'Linear networks still commission and license the majority of unscripted programming. MY Entertainment has sold to Discovery, Travel Channel, A&E, PBS, Food Network, Oxygen, Investigation Discovery, Comedy Central, National Geographic, and BBC, among 28+ networks and streamers over 25+ years.',
  },
  {
    label: 'Streaming Platforms',
    body: 'Streamers buy both licensed series (content that already aired elsewhere) and original commissions. They tend to favor bingeable formats and strong single-season arcs alongside returnable ones — know which model your pitch fits before you approach one.',
  },
  {
    label: 'FAST & AVOD Channels',
    body: 'Free ad-supported streaming channels are a fast-growing secondary market for completed unscripted libraries — a way to monetize a finished catalog title after (or alongside) its primary broadcast window, typically through a distributor with existing platform relationships.',
  },
  {
    label: 'International Broadcasters',
    body: 'A show that has aired domestically can be licensed to broadcasters in other territories, or sold as a format for local remake. MY Entertainment structures international and format deals through its Toronto and London offices across 15+ countries.',
  },
];

// ------------------------------------------------------------
// FAQ — FAQPage schema data.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'How do you sell a TV show?',
    a: 'You sell a TV show by packaging it (logline, pitch deck, and ideally a sizzle reel or one-sheet), getting it in front of the right buyer for its genre, and, if there is interest, negotiating a deal — an option or commission if it is a concept, or a distribution deal if it is already produced. Most producers do this through an established production or distribution company with existing buyer relationships rather than pitching networks cold, because unsolicited outside submissions rarely reach a commissioning editor’s desk.',
  },
  {
    q: 'Do I need a finished show to sell it, or is an idea enough?',
    a: 'Both are sellable, but the path differs. A strong idea with a clear format and access can be optioned or developed toward a commission — see our guide to selling a TV show idea. A finished or near-finished episode moves faster because buyers can evaluate something they can actually watch, and it opens the door to a straightforward distribution deal rather than a development process.',
  },
  {
    q: 'What is a sizzle reel, and do I need one?',
    a: 'A sizzle reel is a short (usually 2–5 minute) proof-of-concept video that shows tone, talent, and visual style before a full episode exists. It is not required to start a conversation, but for unscripted formats it is often the single most persuasive asset in a pitch package — buyers can feel the show, not just read about it.',
  },
  {
    q: 'Who actually buys TV shows?',
    a: 'Four buyer types: broadcast and cable networks (still the largest commissioning base for unscripted content), streaming platforms, FAST/AVOD channels (a growing market for finished libraries), and international broadcasters licensing a show or its format for another territory. Which one is right for your show depends on genre, production status, and whether you are selling a concept or a finished asset.',
  },
  {
    q: 'How long does it take to sell a TV show?',
    a: 'A fast-track placement with the right show in a genre a buyer is actively seeking can move in 4–8 weeks. Most deals — development commissions and distribution deals alike — take 3–9 months from first pitch to signature, because networks operate on their own commissioning calendars, not the producer’s. A finished episode compresses this significantly versus a concept still in development.',
  },
  {
    q: 'Do I need an agent to sell a TV show?',
    a: 'Not necessarily. A talent or literary agent typically represents writers and concepts in development; a production or distribution company serves the equivalent function for unscripted producers — pitching finished and in-development shows to buyers and negotiating the resulting deal. MY Entertainment acts as that partner for unscripted producers without requiring a separate agent relationship.',
  },
  {
    q: 'How does MY Entertainment help sell and distribute a TV show?',
    a: 'MY Entertainment is a New York unscripted TV production and distribution company founded in 2000, with offices in Toronto and London, behind Ghost Adventures (28 seasons on Discovery/Travel Channel), Destination Fear, Pros vs Joes, Paranormal Challenge, and Legacy List. We evaluate submissions for genre fit and production status, pitch the right shows to the right buyers among our 28+ network and streamer relationships, and negotiate the resulting deal — development or distribution — on the producer’s behalf. Submit your show at /pitch.',
  },
];

// JSON-LD schemas
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Sell a TV Show: From Pitch to Distribution Deal',
  description:
    "How TV shows get sold and distributed — pitch decks, sizzle reels, who's buying, deal terms, and how to submit your show to MY Entertainment's slate.",
  url: 'https://www.myentertainment.tv/how-to-sell-a-tv-show',
  author: { '@type': 'Organization', name: 'MY Entertainment', url: 'https://www.myentertainment.tv' },
  publisher: { '@type': 'Organization', name: 'MY Entertainment', url: 'https://www.myentertainment.tv' },
  inLanguage: 'en-US',
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
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.myentertainment.tv/' },
    { '@type': 'ListItem', position: 2, name: 'How to Sell a TV Show', item: 'https://www.myentertainment.tv/how-to-sell-a-tv-show' },
  ],
};

export default function HowToSellATVShowPage() {
  return (
    <div style={{ background: '#000' }}>
      {/* Schema markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <style>{`
        .sell-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        .sell-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        .sell-onesheet-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        @media (max-width: 900px) {
          .sell-grid-3 { grid-template-columns: repeat(2, 1fr); }
          .sell-onesheet-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .sell-grid-3 { grid-template-columns: 1fr; }
          .sell-grid-2 { grid-template-columns: 1fr; }
          .sell-onesheet-grid { grid-template-columns: 1fr; }
        }
        .sell-faq-item + .sell-faq-item { margin-top: 28px; }
        .sell-cta-btn:hover, .sell-cta-btn:focus-visible { opacity: 0.85; }
        .sell-onesheet-card:hover { border-color: #e51d26; }
      `}</style>

      {/* ================================================================== */}
      {/* HERO — H1 = spec'd exact string. Dual CTA #1.                       */}
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
          MY Entertainment — Selling &amp; Distributing TV Shows
        </p>

        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(28px, 5vw, 50px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 900,
            lineHeight: 1.1,
          }}
        >
          How to Sell a TV Show: From Pitch to Distribution Deal
        </h1>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto 32px',
            maxWidth: 720,
          }}
        >
          A complete guide to how television shows actually get sold and distributed — the
          marketplace, the pitch package, who is buying, how to get in the room, and what a
          distribution deal looks like once a buyer says yes. Written by MY Entertainment, a
          25+ year unscripted TV production and distribution company.
        </p>

        <DualCta idSuffix="hero" />

        {/* Stat strip — verified facts, reused from /tv-distribution-deal */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48 }}>
          {[
            { stat: '25+', label: 'Years selling & distributing unscripted TV' },
            { stat: '28+', label: 'Networks & streamers we’ve sold to' },
            { stat: '15+', label: 'Countries across our format & international deals' },
          ].map(({ stat, label }) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 36, fontWeight: 700, color: '#e51d26', margin: '0 0 4px', lineHeight: 1 }}>{stat}</p>
              <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: '#a5a7ad', margin: 0, maxWidth: 180 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 1 — How the TV Marketplace Works                           */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>How the TV Marketplace Works</h2>
            <p style={bodyText}>
              Selling a TV show means moving it from an idea or a finished piece of content into
              the hands of a buyer who will pay to air it, license it, or commission more of it.
              That buyer is almost always a network, a streaming platform, or an international
              broadcaster — and the vast majority of what they acquire arrives through a
              production company or distributor with an established relationship, not a cold
              submission from an unknown producer.
            </p>
            <p style={bodyText}>
              Buyers run on commissioning cycles: they set genre and budget priorities for a
              given season, take pitches against those priorities, and greenlight a small
              fraction of what they hear. Distribution works on a parallel but separate track —
              once a show is finished (or nearly so), it can be licensed directly to a buyer
              without going through a development process at all, because there is nothing left
              to develop.
            </p>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              Which track applies to your show — development or distribution — depends
              entirely on how far along it is. The rest of this guide walks through both, in
              order: packaging your pitch, finding the right buyer, getting in front of them, and
              what happens once they say yes.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — Is Your Show Sellable? (unscripted lens)                */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={h2Style}>Is Your Show Sellable?</h2>
          <p style={{ ...bodyText, maxWidth: 780 }}>
            Before packaging anything, be honest about whether your show fits what buyers are
            actually acquiring right now. MY Entertainment develops, produces, and distributes
            unscripted content only — reality, competition, lifestyle, crime, comedy, and
            documentary formats, not scripted drama. Five factors determine whether an unscripted
            show is sellable:
          </p>

          <div className="sell-grid-3">
            {SELLABILITY_FACTORS.map(({ label, body }) => (
              <div
                key={label}
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderTop: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: 20,
                }}
              >
                <h3 style={h3Style}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — The Pitch Package: Deck, Sizzle, One-Sheet              */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>The Pitch Package: Deck, Sizzle Reel, One-Sheet</h2>
            <p style={bodyText}>
              Every pitch rests on three assets, and buyers rarely take a meeting without at
              least the first two:
            </p>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>Pitch deck</strong> — the written treatment:
              logline, format, key talent or characters, episode structure, and comp shows
              (existing series that prove the audience exists). See our{' '}
              <Link href="/tv-show-pitch-deck" style={inlineLink}>full pitch deck guide</Link>.{' '}
              <strong style={{ color: '#f2f4f7' }}>Sizzle reel</strong> — a short proof-of-concept
              video that shows tone and talent before a full episode exists; see our{' '}
              <Link href="/sizzle-reel" style={inlineLink}>sizzle reel guide</Link>.{' '}
              <strong style={{ color: '#f2f4f7' }}>One-sheet</strong> — a single-page leave-behind
              a buyer can review after the meeting, without needing you in the room to explain it.
            </p>
            {/*
              FIX (2026-07-18): removed the 3 hardcoded "Live One-Sheet" example cards
              (haunted-world, pvj, home-game) — none of the 3 has a live row in the
              `deck_sites` table, so all 3 linked to a 404. Rather than hand-pick
              replacement slugs (which would go stale again the moment deck_sites
              changes), this now points to the /available catalog itself, which is
              always in sync with what's actually published. See app/(public)/available/
              page.tsx for the live catalog and app/sitemap.ts for the same fix applied
              to the sitemap's /available/[slug] entries.
            */}
            <p style={{ ...bodyText, marginBottom: 24 }}>
              For a finished or near-finished show, the one-sheet becomes the primary selling
              document. See{' '}
              <Link href="/available" style={inlineLink}>real examples from MY Entertainment&rsquo;s current catalog</Link>,
              live on this site today.
            </p>

            <p style={{ ...bodyText, marginTop: 24, marginBottom: 0 }}>
              Want the full step-by-step process for building your own pitch package?{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>Read how to pitch a TV show</Link>{' '}
              or see the{' '}
              <Link href="/tv-show-pitch" style={inlineLink}>full pitch overview</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Who Buys TV Shows                                       */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={h2Style}>Who Buys TV Shows</h2>
          <p style={{ ...bodyText, maxWidth: 780 }}>
            There are four categories of TV buyer, and a show rarely fits all four equally —
            knowing which one matches your genre and production status narrows where to focus.
          </p>

          <div className="sell-grid-2">
            {BUYER_TYPES.map(({ label, body }) => (
              <div
                key={label}
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '20px 20px 20px 18px',
                }}
              >
                <p style={accentLabel}>{label}</p>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>

          <p style={{ ...bodyText, maxWidth: 780, marginTop: 24, marginBottom: 0 }}>
            See our full breakdown of{' '}
            <Link href="/tv-buyers" style={inlineLink}>TV buyers &amp; licensing</Link>{' '}
            or browse the{' '}
            <Link href="/international" style={inlineLink}>international distribution</Link>{' '}
            side of the business.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — How to Get in the Room                                  */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>How to Get in the Room</h2>
            <p style={bodyText}>
              Even a sellable show with a strong package goes nowhere if it never reaches the
              right person. Three paths get you there:
            </p>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>TV markets.</strong> Industry markets and
              conferences (MIPCOM, NATPE, RealScreen Summit, and similar events) exist
              specifically to connect buyers and sellers — but they require existing
              relationships or a delegate badge to be useful, not just attendance.
            </p>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>Agents and reps.</strong> A talent or literary
              agent can open doors for a concept still in development, but few agents actively
              represent unscripted formats through to a distribution deal — that is typically
              a production or distribution company&rsquo;s function, not an agent&rsquo;s.
            </p>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              <strong style={{ color: '#f2f4f7' }}>Partnering vs. going direct.</strong> Networks
              overwhelmingly prioritize pitches that arrive through a production company or
              distributor with a track record — an unsolicited pitch from an unknown producer
              rarely reaches a commissioning editor&rsquo;s desk. A partner with active buyer
              relationships in your genre is, in practice, the fastest way into the room. See{' '}
              <Link href="/tv-production-company" style={inlineLink}>TV production company</Link>{' '}
              and{' '}
              <Link href="/tv-distribution-company" style={inlineLink}>TV distribution company</Link>{' '}
              for what that partnership looks like with MY Entertainment.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — The Submission Process → mid-page Dual CTA #2           */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>The Submission Process</h2>
            <p style={bodyText}>
              MY Entertainment reviews every submission for genre fit and production status
              before pitching it to buyers. What we look for:
            </p>
            <p style={bodyText}>
              A show summary (what it is, format, episode count, run time), your pitch deck or
              one-sheet, a sizzle reel or screener if one exists, and, for finished content, a
              completed submission release. Concepts still in development need a strong logline
              and format — access and talent, if attached, strengthen the pitch considerably.
            </p>
            <p style={{ ...bodyText, marginBottom: 40 }}>
              If the show is a fit, we pitch it to the right buyers among our network and
              streamer relationships and manage the resulting negotiation — development deal
              or distribution deal — on your behalf.
            </p>
          </div>

          <DualCta idSuffix="mid" />
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — From Option to Greenlight                               */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>From Option to Greenlight</h2>
            <p style={bodyText}>
              For a concept still in development, a sale rarely happens in one step. It typically
              moves through: an <strong style={{ color: '#f2f4f7' }}>option</strong> (a buyer or
              partner secures exclusive rights to develop and pitch the show for a defined
              period), a <strong style={{ color: '#f2f4f7' }}>pitch</strong> to the buyer&rsquo;s
              commissioning team, a <strong style={{ color: '#f2f4f7' }}>pilot or presentation</strong>{' '}
              if the buyer wants to see it in motion before committing, and finally a{' '}
              <strong style={{ color: '#f2f4f7' }}>greenlight</strong> — a commissioned series
              order.
            </p>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              Unscripted formats generally move faster through this pipeline than scripted
              development — a strong sizzle reel can sometimes substitute for a full pilot, and
              commissioning decisions can happen within a single buying cycle rather than
              years-long option renewals. A finished or near-finished show skips this pipeline
              largely intact, moving straight to the distribution-deal conversation covered next.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — Distribution Deals 101                                  */}
      {/* Summarized (deep dive lives at /tv-distribution-deal — avoids       */}
      {/* duplicating that page's full DEAL_TERMS content verbatim).         */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>Distribution Deals 101</h2>
            <p style={bodyText}>
              Once a show is finished (or a development deal has produced one), what you sell is
              no longer a concept — it is a license. Every TV distribution deal turns on the
              same handful of terms:
            </p>
            <ul style={{ ...bodyText, paddingLeft: 20, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Territory</strong> — which countries or
                regions the buyer can air the show in.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Exclusivity window</strong> — how long the
                buyer holds exclusive rights before they can revert or be re-licensed.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>License fee</strong> — what the buyer pays
                for the right to air it.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Rights type</strong> — broadcast, streaming,
                digital, and format (remake) rights are each separately negotiable.
              </li>
              <li style={{ marginBottom: 0 }}>
                <strong style={{ color: '#f2f4f7' }}>IP ownership</strong> — a distribution deal
                licenses the right to air your show; it does not transfer ownership. You keep
                creator credit.
              </li>
            </ul>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              For the full breakdown of each term and how negotiations typically proceed, read
              our dedicated guide:{' '}
              <Link href="/tv-distribution-deal" style={inlineLink}>TV Distribution Deal — How to Get TV Distribution →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 9 — Selling Internationally                                 */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>Selling Internationally</h2>
            <p style={bodyText}>
              A show that sold domestically is not done selling. International distribution
              means licensing the finished series to a broadcaster in another territory, or
              licensing the <strong style={{ color: '#f2f4f7' }}>format</strong> — the
              underlying structure — for a local-language remake with local talent.
            </p>
            <p style={{ ...bodyText, marginBottom: 0 }}>
              MY Entertainment structures international and format deals through offices in
              Toronto and London, across 15+ countries, and can arrange co-production agreements
              for markets that prefer local production over a fully licensed import. Read more on{' '}
              <Link href="/international" style={inlineLink}>international distribution</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 10 — FAQ                                                    */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="sell-faq-item">
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
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 11 — Final CTA + Dual CTA #3 + explore links                */}
      {/* ================================================================== */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#111', borderTop: '1px solid #1a1a1a' }}>
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
            Ready to Sell Your Show?
          </h2>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              maxWidth: 560,
              margin: '0 auto 32px',
            }}
          >
            Whether you have a packaged concept or a finished episode, submit your show and MY
            Entertainment will review it for genre fit, production status, and buyer placement
            potential.
          </p>

          <DualCta idSuffix="end" />

          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#a5a7ad', marginTop: 32, marginBottom: 0 }}>
            Explore:{' '}
            <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>How to Pitch a TV Show</Link>
            {' · '}
            <Link href="/how-to-sell-a-tv-show-idea" style={inlineLink}>Sell a TV Show Idea</Link>
            {' · '}
            <Link href="/tv-distribution-deal" style={inlineLink}>TV Distribution Deal</Link>
            {' · '}
            <Link href="/tv-buyers" style={inlineLink}>TV Buyers &amp; Licensing</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
