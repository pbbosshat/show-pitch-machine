// ============================================================
// /tv-show-pitch — B2B SEO Pillar Page
// Target keyword: "tv show pitch" (vol 150, KD 1)
// Intent: showrunners, writers, and IP holders who want to
// understand the full pitch process and find a production
// partner to sell their concept to networks/streamers.
//
// This is the topical pillar tying together the existing
// buyer-intent cluster:
//   /how-to-pitch-a-tv-show  — step-by-step process
//   /tv-show-pitch-deck      — pitch deck template
//   /sizzle-reel             — sizzle reel production
//   /tv-production-company   — MY Entertainment services
//
// Server Component — no 'use client'. All styles inline.
// Design tokens match Webflow source exactly (same as /sizzle-reel).
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses the root layout template
// ('%s | MY Entertainment') so the exact keyword-bearing title
// string is preserved in the <title> tag for maximum SEO impact.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Show Pitch: How to Pitch & Sell Your Show to Networks | MY Entertainment',
  },
  description:
    'A TV show pitch is how creators sell an unscripted series to networks and streamers. Learn the complete pitch process — logline, pitch deck, sizzle reel, format bible, comp shows — and how MY Entertainment helps creators sell their shows to buyers.',
  keywords: [
    'tv show pitch', 'tv pitch', 'how to pitch a tv show to a network', 'pitch a tv show',
    'tv show pitch package', 'pitch your show', 'unscripted tv pitch', 'tv show pitch process',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-show-pitch' },
  openGraph: {
    title: 'TV Show Pitch: How to Pitch & Sell Your Show to Networks | MY Entertainment',
    description:
      'A TV show pitch is how creators sell an unscripted series to networks and streamers. Learn the full process — logline, deck, sizzle reel, bible — and how MY Entertainment helps creators sell their show.',
    url: 'https://www.myentertainment.tv/tv-show-pitch',
    siteName: 'MY Entertainment',
    type: 'article',
    // Reuse the OG banner image from the root layout (same CDN path).
    images: [{
      url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png',
      width: 1887,
      alt: 'MY Entertainment — TV Show Pitch Guide',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Show Pitch: How to Pitch & Sell Your Show to Networks | MY Entertainment',
    description:
      'Complete guide to the TV show pitch — logline, pitch deck, sizzle reel, format bible, and how MY Entertainment helps creators sell their shows to networks and streamers.',
  },
};

// ------------------------------------------------------------
// Design token constants — verbatim copy from /sizzle-reel.
// Container max-width, font stacks, and color palette are defined
// once here to stay consistent with the rest of the public site.
// DO NOT change these values — they match the Webflow source exactly.
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
  fontSize: 18,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase' as const,
  marginTop: 0,
  marginBottom: 12,
};

// Inline link style — body-copy hyperlinks within article text
const inlineLink: React.CSSProperties = {
  color: '#e02027',
  textDecoration: 'none',
};

// ------------------------------------------------------------
// FAQ data — single source of truth for both the visible on-page
// FAQ section and the FAQPage JSON-LD schema below.
// NEVER edit one without editing the other — any drift between
// visible text and schema text will cause a Google validation error.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What is a TV show pitch?',
    a: 'A TV show pitch is a formal presentation of an unscripted television concept to a network, streaming service, or distributor. It typically consists of a verbal pitch (in a meeting), a pitch deck (10–15 slides), and a sizzle reel (2–4 minute video). The goal is to convince the buyer to greenlight a development deal or commission the show.',
  },
  {
    q: 'What do you need to pitch a TV show?',
    a: 'A complete TV show pitch package includes: a logline (one sentence that sells the concept), a pitch deck (covering format, characters, episode structure, target audience, and comps), a sizzle reel (a short video demonstrating tone and characters), and ideally a production partner with existing network relationships. A longer format bible is often requested after the initial pitch.',
  },
  {
    q: 'How do you pitch a TV show to Netflix or Amazon?',
    a: 'Netflix and Amazon (Prime Video) do not accept unsolicited pitches from independent creators. You need to go through an established production company with an existing relationship at the platform. MY Entertainment has relationships with major streaming buyers and can bring qualified unscripted concepts into those conversations on your behalf.',
  },
  {
    q: 'What is a logline in a TV pitch?',
    a: 'A logline is a single sentence (or two short sentences) that captures the premise, the format, the central characters, and the stakes of the show. It is the most distilled expression of your concept — the version you would say to a network executive in an elevator. A strong logline immediately signals genre, audience, and hook. Example: "A team of paranormal investigators armed with the latest technology spends the night in America\'s most haunted locations, searching for definitive proof of the supernatural."',
  },
  {
    q: 'How long does it take to sell a TV show?',
    a: 'The pitch-to-commission timeline for unscripted TV varies widely. A well-packaged pitch targeting the right buyer at the right time can result in a development deal in weeks. Most pitches take 3–12 months from initial submission to a greenlight decision. Having an experienced production partner with active buyer relationships compresses this timeline significantly.',
  },
  {
    q: 'What is a format bible for a TV show?',
    a: 'A format bible (or show bible) is a detailed written document — typically 10–30 pages — that describes the show\'s format, episode structure, recurring segments, host/character roles, production requirements, and season arc. Networks request a bible after an initial pitch to do a deeper evaluation before committing to a development deal.',
  },
  {
    q: 'Do you need a sizzle reel to pitch a TV show?',
    a: 'A sizzle reel is not always required, but it dramatically improves pitch success rates. A deck-only pitch asks the buyer to imagine the show; a sizzle reel shows them. In today\'s competitive pitch environment — especially at cable and streaming buyers who screen hundreds of pitches per year — arriving without a reel means arriving under-armed. MY Entertainment recommends pairing a sizzle reel with every pitch package.',
  },
  {
    q: 'Can MY Entertainment help pitch my show to networks?',
    a: 'Yes. MY Entertainment is an unscripted TV production and distribution company with 25+ years of network relationships across Discovery, Travel Channel, A&E, PBS, Max, and 28+ other buyers. We evaluate new concepts from independent creators and, for projects that are a strong fit, co-develop and co-produce the show — including pitch materials and network submissions.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — Article + FAQPage.
// Article signals editorial depth for informational queries.
// FAQPage surfaces rich results in Google SERP (accordion Q&As).
// FAQ text MUST match FAQ_ITEMS above verbatim — any mismatch
// will fail Google's rich result validation.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'TV Show Pitch: How to Pitch & Sell Your Show to Networks | MY Entertainment',
  description:
    'A TV show pitch is how creators sell an unscripted series to networks and streamers. Learn the complete pitch process — logline, pitch deck, sizzle reel, format bible, comp shows — and how MY Entertainment helps creators sell their shows to buyers.',
  author: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
  },
  publisher: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
    logo: {
      '@type': 'ImageObject',
      url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8ebea7bb58375c4d58c7_My%20Entertainment%20Square%20(Dark%20Background%20-%20Gradient).png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://www.myentertainment.tv/tv-show-pitch',
  },
};

// FAQ schema — mainEntity generated directly from FAQ_ITEMS so there is
// exactly one source of truth for question/answer text.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

// The anatomy elements of a strong TV show pitch — used in the
// pitch anatomy grid section. Defined once to feed the JSX grid.
const PITCH_ANATOMY = [
  {
    num: '01',
    title: 'The Logline',
    body: 'One or two sentences that sell the show. The logline states the format, the characters, and the stakes — and it should be so clear that a buyer can immediately imagine the title card. If you can\'t write a logline, the concept isn\'t defined yet.',
  },
  {
    num: '02',
    title: 'The Pitch Deck',
    body: 'A 10–15 slide presentation covering: logline, show format, episode structure, characters/talent, target audience, competitive landscape, and production team credentials. This is the leave-behind that travels after your meeting.',
  },
  {
    num: '03',
    title: 'The Sizzle Reel',
    body: 'A 2–4 minute video that shows the buyer the tone, the characters, and the production quality before a single episode is shot. The sizzle reel is the most persuasive element of any modern pitch package — it shows rather than tells.',
  },
  {
    num: '04',
    title: 'The Format Bible',
    body: 'A longer written document (10–30 pages) detailing episode structure, recurring segments, host/character roles, and the season arc. Networks request the bible after a successful initial pitch — it\'s the deep dive that precedes a development deal.',
  },
  {
    num: '05',
    title: 'Comp Shows',
    body: 'Comparable shows ("comps") tell the buyer how to position and schedule your concept. Choose recent comps from the target network where possible — they tell the buyer "your audience already watches something like this." Avoid comps that are more than 5–7 years old.',
  },
  {
    num: '06',
    title: 'The Production Partner',
    body: 'Attaching an experienced production company is not optional for most buyers — it signals that the show can actually be made. A partner like MY Entertainment brings network relationships, infrastructure, and credibility that no deck or reel can substitute.',
  },
];

// Common pitch mistakes — used in the mistakes section.
const PITCH_MISTAKES = [
  {
    mistake: 'Pitching before the concept is defined',
    fix: 'If you can\'t write the logline in one sentence, you\'re not ready to pitch. Clarity of concept is the single most important thing. Spend the extra week.',
  },
  {
    mistake: 'No production partner',
    fix: 'Going into a network meeting without a prodco attached signals naivety about how TV gets made. A production partner provides access, credibility, and the infrastructure to actually deliver the show.',
  },
  {
    mistake: 'No sizzle reel',
    fix: 'A deck-only pitch in 2026 is under-armed. Even a simple tone reel or "proof of concept" shoot dramatically increases conversion rates at pitch meetings.',
  },
  {
    mistake: 'Pitching to every network at once',
    fix: 'A Travel Channel pitch and a Bravo pitch are fundamentally different documents. Tailor each pitch to a specific buyer — their tone, their audience, and what\'s already on their schedule.',
  },
  {
    mistake: 'Underdeveloped characters',
    fix: 'Unscripted TV lives and dies on characters. If you can\'t describe your lead character\'s specific conflict and why viewers will root for them, the pitch isn\'t ready. Networks buy people, not premises.',
  },
  {
    mistake: 'Weak or outdated comp shows',
    fix: 'Your comps should be from the past 3–5 years and on the network you\'re targeting. Citing a show from 2010 tells the buyer you\'re out of touch with the current market.',
  },
];

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function TVShowPitchPage() {
  return (
    <div style={{ background: '#000' }}>
      {/* ── Schema markup — injected into <head> via dangerouslySetInnerHTML ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Responsive prose column and layout styles.
          Class names are page-scoped (.pitch-pillar-*) to avoid collisions
          with other pages' styles when rendered in the same browser session. */}
      <style>{`
        .pitch-pillar-prose { max-width: 780px; margin: 0 auto; }
        .pitch-pillar-anatomy-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 24px;
        }
        @media (max-width: 640px) {
          .pitch-pillar-anatomy-grid { grid-template-columns: 1fr; }
        }
        .pitch-pillar-faq-item + .pitch-pillar-faq-item { margin-top: 32px; }
        /* CTA button hover — subtle opacity dim on hover/focus */
        .pitch-pillar-cta-btn:hover,
        .pitch-pillar-cta-btn:focus-visible { opacity: 0.85; }
        /* Tooltip wrapper — relative so tooltip positions against the button */
        .mye-tooltip-wrap { position: relative; display: inline-block; }
        /* Tooltip — hidden until hover/focus; aria-hidden keeps screen readers quiet */
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
      {/* SECTION 1 — Page heading                                            */}
      {/* paddingTop 100px clears the fixed navbar (75px tall + margin).     */}
      {/* H1 is the only H1 on the page; "tv show pitch" keyword is in it.  */}
      {/* ================================================================== */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 40,
          paddingLeft: 20,
          paddingRight: 20,
          textAlign: 'center',
          background: '#000',
        }}
      >
        {/* Eyebrow label — Webflow .subtitle-small token */}
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
          The Pitch Playbook
        </p>

        {/*
          H1 — one per page (accessibility rule + SEO).
          Uses Oswald (loaded in root layout) to match the site's editorial
          headline treatment. "TV Show Pitch" keyword is front-loaded.
        */}
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 820,
            lineHeight: 1.15,
          }}
        >
          The TV Show Pitch — Everything You Need to Know
        </h1>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto',
            maxWidth: 700,
          }}
        >
          What a TV show pitch actually is, the six elements of a winning pitch package,
          how to pitch to networks and streamers, common mistakes that kill pitches, and how
          MY Entertainment helps creators pitch and sell their shows to buyers.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — What is a TV show pitch                                 */}
      {/* Targets the definitional sub-query. Prose constrained to 780px.   */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>What Is a TV Show Pitch?</h2>
            <p style={bodyText}>
              A <strong style={{ color: '#f2f4f7' }}>TV show pitch</strong> is a formal presentation
              of an unscripted television concept to a network, streaming service, or distributor.
              It is the mechanism by which creators, showrunners, and IP holders turn an idea into
              a commissioned series — and it is almost always a multi-document, multi-stage process
              rather than a single phone call or email.
            </p>
            <p style={bodyText}>
              At the minimum, a pitch consists of a verbal presentation in a meeting, supported by a
              written pitch deck and, increasingly, a sizzle reel. More developed pitches also include
              a format bible and a one-page leave-behind. The buyer — whether a commissioning editor
              at a cable network or a development executive at a streaming platform — uses these
              materials to evaluate whether the show fits their brand, their audience, and their
              production slate.
            </p>
            <p style={bodyText}>
              MY Entertainment has been pitching unscripted concepts for 25 years. In that time,
              we have sold shows to Discovery, Travel Channel, PBS, A&amp;E, Max, and 28+ other
              buyers — including <em>Ghost Adventures</em> (28 seasons), <em>Baggage Battles</em>,{' '}
              <em>Wild and Crazy Kids</em>, and <em>Billy Buys Brooklyn</em>. What we&apos;ve learned:
              a great pitch is not about being in the right room — it is about walking into the room
              with the right package.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Anatomy of a strong pitch (6-card grid)                */}
      {/* Targets "what do you need to pitch a tv show" sub-queries.        */}
      {/* Each card maps to one element in the complete pitch package.       */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 28,
              fontWeight: 400,
              color: '#f2f4f7',
              textAlign: 'center',
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            The Six Elements of a Winning TV Show Pitch
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            Every pitch that has sold a show — at any network, at any budget — contains
            these six elements in some form. Skip one and buyers feel it.
          </p>

          {/* 6-card anatomy grid — 2 columns desktop, 1 column mobile */}
          <div className="pitch-pillar-anatomy-grid">
            {PITCH_ANATOMY.map(({ num, title, body }) => (
              <div
                key={num}
                style={{
                  // Card: dark border on #111 background, red accent number
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '24px 20px',
                }}
              >
                {/* Red accent number — Oswald bold, matches /sizzle-reel card style */}
                <p
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 36,
                    fontWeight: 600,
                    color: '#e51d26',
                    margin: '0 0 8px',
                    lineHeight: 1,
                  }}
                >
                  {num}
                </p>
                <h3 style={{ ...h3Style, color: '#f2f4f7', textTransform: 'none' as const }}>{title}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — The logline (deep dive)                                 */}
      {/* The logline is the most-asked-about element and the first filter.  */}
      {/* Deep copy here earns dwell time and demonstrates expertise.        */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>How to Write a TV Show Logline</h2>
            <p style={bodyText}>
              The logline is the most distilled version of your show — one or two sentences that
              convey the format, the characters, and the stakes. Network executives use it to
              immediately slot a concept into a genre, compare it to their existing schedule, and
              decide whether to read further.
            </p>
            <p style={bodyText}>
              A strong logline answers four questions without the buyer having to ask them:
            </p>
            <ul
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                color: '#a5a7ad',
                lineHeight: 1.7,
                paddingLeft: 20,
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>What is the format?</strong> — Competition,
                docuseries, docu-follow, travel, paranormal, crime, lifestyle?
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Who is at the center?</strong> — A person,
                a team, a community? What makes them compelling and specific?
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>What is the repeatable structure?</strong>{' '}
                — What happens every episode? What drives the engine of the show?
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>What is the emotional hook?</strong> — Why
                does the audience care? What do they root for or fear?
              </li>
            </ul>
            <p style={bodyText}>
              Example of a logline that sold: <em>"A team of paranormal investigators armed with the
              latest technology spends the night in America&apos;s most haunted locations, searching
              for definitive proof of the supernatural."</em> That logline communicates format
              (docuseries), characters (investigators), structure (each episode is one location),
              and emotional hook (the search for proof) in 31 words.
            </p>
            <p style={bodyText}>
              If you cannot write your logline, your concept is not defined yet. The logline is not
              a marketing exercise — it is a diagnostic tool. A concept that cannot be loglined cannot
              be pitched.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — How to pitch to networks and streamers                  */}
      {/* Explains buyer landscape — who buys, how to access them, and the   */}
      {/* role of a production partner. Cross-links to /tv-production-company */}
      {/* for the services deep-dive.                                        */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>How to Pitch to Networks and Streamers</h2>
            <p style={bodyText}>
              The mechanics of pitching differ significantly depending on where you&apos;re going.
              Here is how each tier of the buyer market actually works:
            </p>

            {/* Three buyer tier blocks — bordered left accent */}
            {[
              {
                label: 'Cable & Specialty Networks',
                body: 'Discovery, Travel Channel, A&E, Bravo, Food Network, HGTV, Oxygen, Investigation Discovery, and their sister channels are the most active buyers of unscripted content. They buy volume — multiple series per year — and have well-defined audience profiles. Most independent creators\' first network sale happens here. Pitches go to development executives via production company relationships. Cold submissions are rarely reviewed.',
              },
              {
                label: 'Broadcast Networks',
                body: 'ABC, NBC, CBS, Fox, and PBS commission unscripted content at a higher bar — concepts need demonstrated mass appeal and a production team with broadcast-level credentials. PBS has a structured documentary co-production system. Broadcast deals are harder to land but carry enormous audience reach.',
              },
              {
                label: 'Streaming Platforms',
                body: 'Netflix, Max, Peacock, Hulu, Paramount+, and Apple TV+ all commission original unscripted content, but none accepts unsolicited pitches from independent creators. Access is exclusively through production companies with established relationships at each platform. Streaming deals typically require worldwide rights and involve larger budgets — but longer episode counts and global distribution.',
              },
            ].map(({ label, body }) => (
              <div
                key={label}
                style={{
                  borderLeft: '3px solid #e51d26',
                  paddingLeft: 16,
                  marginBottom: 28,
                }}
              >
                <h3 style={{ ...h3Style, marginBottom: 8 }}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}

            <p style={bodyText}>
              The common thread across all three tiers: <strong style={{ color: '#f2f4f7' }}>access
              is almost always controlled by production companies</strong>, not by the creators
              themselves. A pitch submitted through a network&apos;s general website is rarely read.
              A pitch submitted by a production company with an active relationship at that network
              lands in the right inbox immediately.
            </p>
            <p style={bodyText}>
              MY Entertainment maintains active relationships with buyers across all three tiers.{' '}
              <Link href="/tv-production-company" style={inlineLink}>
                Learn more about how we work with creators →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — Role of the sizzle reel                                 */}
      {/* Cross-links to /sizzle-reel with editorial context — not just an   */}
      {/* anchor, but a real argument for why the reel matters at this stage. */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>The Sizzle Reel: Your Most Powerful Pitch Tool</h2>
            <p style={bodyText}>
              Of all the elements in a TV show pitch package, the{' '}
              <Link href="/sizzle-reel" style={inlineLink}>
                sizzle reel
              </Link>{' '}
              is the one that most directly separates winning pitches from losing ones.
              A written deck asks the buyer to imagine the show. A sizzle reel{' '}
              <em>shows</em> them.
            </p>
            <p style={bodyText}>
              The reel serves three distinct functions that no other pitch document can replicate:
            </p>
            <ul
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                color: '#a5a7ad',
                lineHeight: 1.7,
                paddingLeft: 20,
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>It proves production capability.</strong>{' '}
                A polished reel tells the buyer your team can actually deliver the show — it&apos;s
                evidence, not a promise.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>It makes characters tangible.</strong>{' '}
                A deck can describe a compelling host. A reel can show one. Buyers don&apos;t invest
                in descriptions — they invest in people they can see on screen.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>It travels after the meeting.</strong>{' '}
                After your pitch, the reel keeps selling. Executives share it with programming
                committees; a deck rarely makes that journey without you in the room.
              </li>
            </ul>
            <p style={bodyText}>
              MY Entertainment produces sizzle reels as part of the pitch development process —
              built alongside the deck rather than after it, targeted to the specific buyer and the
              specific format.{' '}
              <Link href="/sizzle-reel" style={inlineLink}>
                Read our complete guide to sizzle reels →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — Pitch deck deep dive + cross-link                       */}
      {/* Routes readers to /tv-show-pitch-deck for the full template.       */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>The TV Show Pitch Deck</h2>
            <p style={bodyText}>
              The pitch deck is the visual leave-behind that supports your verbal pitch and keeps
              selling after the meeting ends. A strong deck is typically 10–15 slides and covers
              the following in order:
            </p>

            {/* Numbered deck structure — concise, then routes to full template */}
            <ol
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                color: '#a5a7ad',
                lineHeight: 1.7,
                paddingLeft: 20,
                marginBottom: 20,
                marginTop: 0,
              }}
            >
              {[
                'Title and logline — the show in one sentence',
                'The hook — why now, why this network, what cultural moment',
                'Show format — episode count, length, structure (episodic vs. serialized)',
                'Characters and talent — photos, bio bullets, why they\'re irresistible on screen',
                'Episode arc — 3–5 sample episodes or season structure',
                'Target audience — demographics, psychographics, viewing habits',
                'Competitive landscape — comp shows and what makes yours different',
                'Production team — credentials and network track record',
              ].map((item, i) => (
                <li key={i} style={{ marginBottom: 8 }}>{item}</li>
              ))}
            </ol>

            <p style={bodyText}>
              For a full slide-by-slide breakdown and a downloadable template, see our{' '}
              <Link href="/tv-show-pitch-deck" style={inlineLink}>
                TV Show Pitch Deck guide →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — Common pitch mistakes                                   */}
      {/* High-value editorial content that earns dwell time and builds      */}
      {/* trust. Also answers "why do TV pitches fail" sub-queries.          */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>Common TV Show Pitch Mistakes</h2>
            <p style={bodyText}>
              After 25 years of pitching and hearing pitches from independent creators, these are
              the mistakes MY Entertainment sees most often — and the fixes:
            </p>

            {/* Mistake blocks — left-border accent, mistake in red label, fix in body */}
            {PITCH_MISTAKES.map(({ mistake, fix }) => (
              <div
                key={mistake}
                style={{
                  borderLeft: '3px solid #2a2a2a',
                  paddingLeft: 16,
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 15,
                    fontWeight: 400,
                    color: '#e51d26',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                    marginTop: 0,
                    marginBottom: 6,
                  }}
                >
                  {mistake}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 9 — How MY Entertainment helps creators pitch               */}
      {/* Conversion section — explains the process steps for working with   */}
      {/* MYE from initial concept through network submission.               */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>How MY Entertainment Helps Creators Pitch Their Shows</h2>
            <p style={bodyText}>
              MY Entertainment is an unscripted TV production and distribution company founded in 2000.
              We develop, co-produce, and pitch concepts across paranormal, lifestyle, competition,
              crime, food, travel, and documentary formats — with offices in New York, Toronto, and London.
            </p>
            <p style={bodyText}>
              For qualified concepts, we work with independent creators and IP holders to build the
              complete pitch package and bring it to market:
            </p>

            {/* Four process steps — red circle numbers */}
            {[
              {
                step: 'Concept Evaluation',
                body: 'We assess whether your concept has the format clarity, character depth, and market fit to succeed in the current buyer landscape. We\'ll give you honest feedback — and tell you what\'s missing before you walk into a meeting.',
              },
              {
                step: 'Pitch Package Development',
                body: 'For concepts we take on, we build the full pitch package: logline refinement, pitch deck, and sizzle reel production. These are built as a system, not separately — every element reinforces the same creative brief.',
              },
              {
                step: 'Network Submission',
                body: 'We submit your package through our active relationships at the right network — not a cold submission, but a direct line to the commissioning editor most likely to say yes. Our 25-year track record means calls get returned.',
              },
              {
                step: 'Development to Commission',
                body: 'When a network expresses interest, we guide the development process — format bibles, pitch meeting prep, development deal negotiation, and pilot production. We stay in the project through to commission.',
              },
            ].map(({ step, body }, i) => (
              <div
                key={step}
                style={{
                  display: 'flex',
                  gap: 20,
                  marginBottom: 28,
                  alignItems: 'flex-start',
                }}
              >
                {/* Step number circle — red fill, Oswald bold, matches /sizzle-reel pattern */}
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#e51d26',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#fff',
                    marginTop: 2,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3 style={{ ...h3Style, marginBottom: 6 }}>{step}</h3>
                  <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
                </div>
              </div>
            ))}

            <p style={bodyText}>
              To learn more about our production infrastructure and the types of projects we take on, visit our{' '}
              <Link href="/tv-production-company" style={inlineLink}>
                TV Production Company page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 10 — FAQ                                                    */}
      {/* FAQPage schema surfaces rich results in Google SERP (accordion Q&As). */}
      {/* Text here must match faqSchema.mainEntity verbatim for validation. */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-pillar-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {/* Render each FAQ item — text MUST match JSON-LD above verbatim */}
            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div
                key={idx}
                className="pitch-pillar-faq-item"
              >
                {/* Question — visible H3 matching schema Question.name exactly */}
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
                {/* Answer — must match schema Answer.text verbatim */}
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 11 — CTA + cluster cross-links                              */}
      {/* Converts informational reader into a B2B lead. Cross-links pass   */}
      {/* PageRank to the rest of the buyer-intent cluster.                 */}
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
              textTransform: 'capitalize',
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            Ready to Pitch Your Show?
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
            MY Entertainment is actively looking for strong unscripted concepts. If you have a
            show with real characters, a defined format, and a clear audience — reach out. We&apos;ll
            tell you honestly whether it&apos;s ready to pitch, and what it needs if it isn&apos;t.
          </p>

          {/* Primary CTA — /work-with-us is the B2B partnership page (nav CTA).
              Icon + visible text + tooltip per CLAUDE.md button standards. */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/work-with-us"
              className="pitch-pillar-cta-btn"
              aria-label="Work with MY Entertainment — submit your TV show concept"
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
              {/* Leading icon — forward arrow signals action */}
              <span aria-hidden="true">→</span>
              Pitch Your Show to MYE
            </a>
            <span className="mye-tooltip" aria-hidden="true">
              Go to the Work With MYE page
            </span>
          </span>

          {/* Cluster cross-links — editorial "also read" routes readers to */}
          {/* the other buyer-intent pages and passes PageRank across the cluster */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Also read:{' '}
            <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
              How to Pitch a TV Show
            </Link>
            {' · '}
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              TV Show Pitch Deck Template
            </Link>
            {' · '}
            <Link href="/sizzle-reel" style={inlineLink}>
              What Is a Sizzle Reel?
            </Link>
            {' · '}
            <Link href="/tv-production-company" style={inlineLink}>
              Our Production Services
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
