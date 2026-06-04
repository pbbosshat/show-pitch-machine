// ============================================================
// /tv-pitch-bible — TV Format Bible Guide Page
// Target keywords (seo/mye-pitch-money-2026-06-04):
//   "tv pitch bible"              (vol ~40, KD ~5  — primary)
//   "tv show bible"               (vol ~90, KD ~8  — H1/H2)
//   "format bible"                (vol ~30, KD ~5  — H2/FAQ)
//   "tv show format bible"        (vol ~20          — H2/FAQ)
//   "what is a tv bible"          (vol ~50, KD ~3  — FAQ)
//
// Intent: creators who are building a pitch package and know they
// need a "bible" but don't know what it is, what it contains, or
// how it differs from a pitch deck. High conversion potential —
// this is a late-stage pre-pitch search signal.
//
// The "tv show bible" / "format bible" is a distinct document from
// the pitch deck. It is the longer written companion that networks
// request after a pitch meeting goes well. This page educates on
// the difference and positions MYE as the expert to develop both.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens identical to the rest of the (public) cluster.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template
// so the exact keyword string appears in the <title> tag.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Show Bible & Format Bible: What They Are and How to Write One',
  },
  description:
    'A TV show bible (format bible) is the extended written document networks request after a successful pitch meeting. Learn what a TV pitch bible contains, how it differs from a pitch deck, and how MY Entertainment develops bibles for unscripted TV series.',
  keywords: [
    'tv pitch bible', 'tv show bible', 'format bible', 'tv show format bible',
    'what is a tv bible', 'how to write a tv bible', 'tv series bible',
    'unscripted tv bible', 'reality tv format bible', 'pitch bible template',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-pitch-bible' },
  openGraph: {
    title: 'TV Show Bible & Format Bible: What They Are and How to Write One',
    description:
      'What a TV show bible (format bible) contains, how it differs from a pitch deck, and when networks ask for one. Expert guidance from MY Entertainment.',
    url: 'https://www.myentertainment.tv/tv-pitch-bible',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Show Bible & Format Bible: What They Are and How to Write One',
    description:
      'What a TV show bible contains, how it differs from a pitch deck, and when networks ask for one — from MY Entertainment.',
  },
};

// ------------------------------------------------------------
// Design tokens — shared across the B2B cluster.
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
// Bible sections — the standard structure of an unscripted TV
// format bible. Used both in the prose content and as the basis
// for the Article JSON-LD. Defined once here as the source of truth.
// ------------------------------------------------------------
const BIBLE_SECTIONS = [
  {
    num: '01',
    title: 'Series Overview',
    body: 'A 1–2 page expanded treatment of the show concept, format, and tone. More detailed than the pitch deck logline, but still written to be read in full — not skimmed. This section anchors all the more detailed sections that follow.',
  },
  {
    num: '02',
    title: 'Format Structure',
    body: 'Detailed breakdown of episode structure: act-by-act beats, segment timing, recurring set-pieces, and structural rules that define the show\'s form. This is the production blueprint — it tells a network commissioning editor exactly what they are buying and tells the production team exactly what to make.',
  },
  {
    num: '03',
    title: 'Character Profiles',
    body: 'Extended bios for each main character — background, motivation, conflict, role in the format, and relationship to other characters. Unlike the pitch deck\'s one-sentence capsules, bible character profiles run 1–3 paragraphs each and include on-camera dynamic notes.',
  },
  {
    num: '04',
    title: 'Episode Synopses',
    body: 'Detailed outlines for 5–10 sample episodes. Not shooting scripts — detailed enough to show repeatable format viability, story engine strength, and that the series has narrative resources beyond the pilot. The episode synopses prove the format works long-form.',
  },
  {
    num: '05',
    title: 'Season Arc',
    body: 'For serialized or semi-serialized shows: a map of where the series travels across a full season (and optionally, a multi-season arc). Networks increasingly want evidence that you have thought past the first season before they commission the first season.',
  },
  {
    num: '06',
    title: 'Production Notes',
    body: 'Practical production requirements: locations, crew structure, equipment, shooting schedule, post-production workflow, and any special production considerations (legal, safety, access). This section is read by the network\'s physical production team, not just development.',
  },
  {
    num: '07',
    title: 'Network Fit & Audience',
    body: 'An expanded audience analysis tailored to the specific buyer. Which current shows on the network does this complement or extend? Which audience segment is underserved and how does this show serve it? This section is often customized per buyer submission.',
  },
  {
    num: '08',
    title: 'International Format Potential',
    body: 'For formats with global appeal: which territories is this suited for, which production companies could deliver an international version, and what format adaptations would be required per territory. Not all bibles include this section — but cable and streaming buyers with international operations increasingly request it.',
  },
];

// ------------------------------------------------------------
// FAQ items — source of truth for visible text and JSON-LD.
// Targets "what is a tv bible", "pitch deck vs bible", and
// "when do I need a bible" sub-queries.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What is a TV show bible?',
    a: 'A TV show bible — also called a format bible or series bible — is an extended written document (typically 15–50 pages) that describes a TV show concept in full production detail. It covers the series format, episode structure, character profiles, sample episode outlines, season arc, and production requirements. A bible is the document a network uses to commission, greenlight, and deliver a show — it is the authoritative reference for every decision made in development, production, and international distribution.',
  },
  {
    q: 'What is the difference between a TV pitch deck and a TV show bible?',
    a: 'A TV pitch deck is a 10–15 slide presentation document designed for the pitch meeting — concise, visual, and scannable in 30 seconds. A TV show bible is a 15–50 page written document that contains the full format detail networks need to commission and produce the show. The deck comes first — it gets you the meeting and the initial interest. The bible comes later — it is typically requested after a pitch meeting goes well, as part of the development process toward a greenlight.',
  },
  {
    q: 'When do I need a TV show bible?',
    a: 'You need a TV show bible when a network or production company asks for one — which typically happens after a successful pitch meeting. Networks do not always request bibles before making a commission decision; some shows are greenlighted from a pitch deck and sizzle reel alone. However, having a bible ready (or having one in development) signals to the buyer that you have thought through the format rigorously, which increases confidence in a greenlighting decision.',
  },
  {
    q: 'How long should a TV show bible be?',
    a: 'There is no fixed length, but most unscripted TV format bibles run 15–35 pages. Shorter than 15 pages usually means underdeveloped section on episode outlines or character depth. Longer than 50 pages is unusual and can work against you — buyers need to read it, and an excessively long bible suggests the creator doesn\'t know which details are essential. Focus on depth in character profiles, episode synopses, and format structure — those are the sections buyers read most carefully.',
  },
  {
    q: 'Do I need a TV show bible to pitch a show?',
    a: 'No. A bible is not required for the initial pitch meeting — that is what the pitch deck and sizzle reel are for. A bible becomes relevant later in the development process, typically after a buyer has expressed strong interest and wants to see the full format detail before committing to a development deal or commission. Some buyers request a bible as part of the initial submission, but this is less common for unscripted formats than for scripted series.',
  },
  {
    q: 'Can I hire someone to write my TV show bible?',
    a: 'Yes. Production companies like MY Entertainment develop format bibles as part of the pitch development process for shows they partner on. The bible is typically a co-development between the original creator and the production company\'s development team — the creator provides the concept depth and access; the production company provides the format expertise and network-calibrated language. If you have a strong concept but are unsure how to translate it into a bible, partnering with an experienced prodco is the most effective path.',
  },
];

// ------------------------------------------------------------
// JSON-LD — Article + FAQPage
// Article schema signals expert editorial content.
// FAQPage enables rich results for bible/format sub-queries.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'TV Show Bible & Format Bible: What They Are and How to Write One',
  description:
    'What a TV show bible contains, how it differs from a pitch deck, when networks ask for one, and how to develop one.',
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
    '@id': 'https://www.myentertainment.tv/tv-pitch-bible',
  },
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

// BreadcrumbList — SERP breadcrumb trail.
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
      name: 'TV Show Bible',
      item: 'https://www.myentertainment.tv/tv-pitch-bible',
    },
  ],
};

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function TVPitchBiblePage() {
  return (
    <div style={{ background: '#000' }}>
      {/* ── Schema markup ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Responsive and utility styles — matches cluster CSS pattern */}
      <style>{`
        .bible-prose { max-width: 780px; margin: 0 auto; }
        .bible-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        @media (max-width: 640px) {
          .bible-grid-2 { grid-template-columns: 1fr; }
        }
        .bible-faq-item + .bible-faq-item { margin-top: 28px; }
        .bible-cta-btn:hover, .bible-cta-btn:focus-visible { opacity: 0.85; }
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
      {/* paddingTop 100px clears the fixed navbar.                           */}
      {/* H1 includes both "TV show bible" and "format bible" keywords.       */}
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
        {/* Eyebrow */}
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

        {/* H1 — "tv show bible" and "format bible" both in the heading */}
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 820,
            lineHeight: 1.15,
          }}
        >
          TV Show Bible &amp; Format Bible: What They Are and How to Write One
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
          The TV show bible is the extended document networks use to commission, greenlight,
          and produce a show. Learn what it contains, how it differs from a{' '}
          <Link href="/tv-show-pitch-deck" style={inlineLink}>pitch deck</Link>,
          when networks ask for it, and how MY Entertainment develops bibles for
          unscripted formats.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — What is a TV show bible (definition)                    */}
      {/* Targets "what is a tv bible" and "what is a format bible" queries.  */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="bible-prose">
            <h2 style={h2Style}>What Is a TV Show Bible?</h2>
            <p style={bodyText}>
              A <strong style={{ color: '#f2f4f7' }}>TV show bible</strong> — also called a{' '}
              <strong style={{ color: '#f2f4f7' }}>format bible</strong> or{' '}
              <strong style={{ color: '#f2f4f7' }}>series bible</strong> — is an extended
              written document (typically 15–50 pages) that describes a television series
              in full production detail.
            </p>
            <p style={bodyText}>
              Where the{' '}
              <Link href="/tv-show-pitch-deck" style={inlineLink}>pitch deck</Link>{' '}
              is built for the pitch meeting — concise, visual, scannable in 30 seconds — the
              bible is built for the development and production process. It is the authoritative
              reference document that a network, production company, and production crew all
              use when making the show.
            </p>
            <p style={bodyText}>
              A TV show bible covers:
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
              <li style={{ marginBottom: 8 }}>The full series concept and format structure</li>
              <li style={{ marginBottom: 8 }}>Detailed character profiles and on-camera dynamics</li>
              <li style={{ marginBottom: 8 }}>Sample episode outlines (5–10 episodes)</li>
              <li style={{ marginBottom: 8 }}>Season arc and multi-season potential</li>
              <li style={{ marginBottom: 8 }}>Production requirements and practical notes</li>
              <li style={{ marginBottom: 8 }}>Audience analysis and network fit</li>
              <li>International format potential (where applicable)</li>
            </ul>
            <p style={bodyText}>
              The bible is typically requested after a successful pitch meeting — not before.
              The{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                pitch process
              </Link>{' '}
              uses the deck and{' '}
              <Link href="/sizzle-reel" style={inlineLink}>sizzle reel</Link>{' '}
              to generate interest; the bible is what a network requests when they are seriously
              considering a development deal.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Pitch deck vs. bible: the distinction                    */}
      {/* Comparison table in prose form — answers the search query directly. */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="bible-prose">
            <h2 style={h2Style}>Pitch Deck vs. TV Show Bible: The Difference</h2>

            {/* Side-by-side comparison — two border-accent cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 20,
                marginTop: 24,
                marginBottom: 32,
              }}
            >
              {/* Pitch deck card */}
              <div
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderTop: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: 20,
                }}
              >
                <h3 style={{ ...h3Style, fontSize: 14, marginBottom: 12 }}>Pitch Deck</h3>
                {[
                  '10–15 slides',
                  'Designed for the pitch meeting',
                  'Scannable in 30 seconds',
                  'Visual-first, concise',
                  'Comes first in the process',
                  'Gets you the meeting and the interest',
                ].map((item, i) => (
                  <p key={i} style={{ ...bodyText, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#e51d26', marginRight: 8 }}>→</span>
                    {item}
                  </p>
                ))}
              </div>

              {/* Bible card */}
              <div
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderTop: '3px solid #f2f4f7',
                  borderRadius: 4,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    fontSize: 14,
                    marginBottom: 12,
                    color: '#f2f4f7',
                  }}
                >
                  TV Show Bible
                </h3>
                {[
                  '15–50 pages',
                  'Designed for development and production',
                  'Read in full by network and production team',
                  'Written-first, comprehensive',
                  'Requested after the pitch goes well',
                  'Gets you from interest to greenlight',
                ].map((item, i) => (
                  <p key={i} style={{ ...bodyText, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#a5a7ad', marginRight: 8 }}>→</span>
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <p style={bodyText}>
              Both documents serve different stages of the same journey. The most efficient
              approach is to develop the pitch deck first — then build the bible from the
              deck&apos;s structure once the pitch has generated real buyer interest.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — The eight sections of a format bible (annotated)        */}
      {/* The main content block. Indexable by Google; mirrors the structure  */}
      {/* of BIBLE_SECTIONS above. Grid layout: 2 columns desktop, 1 mobile. */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            What a TV Show Bible Contains: The Eight Sections
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            Standard format bibles for unscripted television cover these eight sections,
            in roughly this order. The depth required in each section varies by format complexity.
          </p>

          {/* Bible section cards — 2 columns desktop, 1 mobile */}
          <div className="bible-grid-2">
            {BIBLE_SECTIONS.map(({ num, title, body }) => (
              <div
                key={num}
                style={{
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '20px 20px 20px 18px',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#e51d26',
                    margin: '0 0 8px',
                    lineHeight: 1,
                  }}
                >
                  {num}
                </p>
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    fontSize: 15,
                    marginBottom: 6,
                  }}
                >
                  {title}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — How to write a TV show bible                            */}
      {/* Practical guidance — earns dwell time, demonstrates MYE expertise. */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="bible-prose">
            <h2 style={h2Style}>How to Write a TV Show Bible</h2>
            <p style={bodyText}>
              The most effective way to write a TV show bible is to start from a{' '}
              <Link href="/tv-show-pitch-deck" style={inlineLink}>pitch deck</Link> that already
              works. If your deck has generated a strong pitch meeting response, you know which
              elements resonate — those are the sections to expand first.
            </p>

            {/* Four writing tips */}
            {[
              {
                n: 1,
                tip: 'Start with the format structure section.',
                body: 'Before you write anything else, be precise about your episode format. How long is each episode? What are the acts? What are the recurring beats that appear in every episode? A bible without a clear format structure is a collection of ideas, not a production document.',
              },
              {
                n: 2,
                tip: 'Write real character profiles, not bios.',
                body: 'The character section of a bible needs to do more than list credits and background. Write about each person\'s conflict, their role in the format, how they interact with other characters under pressure, and why they are irresistible on camera. A network commissioning editor is deciding whether they believe in these people — your writing needs to make that case.',
              },
              {
                n: 3,
                tip: 'Write five episode outlines before you write one.',
                body: 'The episode outlines section is where most independent bibles fail. A single episode outline proves nothing about format repeatability. Five outlines that feel distinct but follow the same structural rules proves the format engine works. Write five before you polish any.',
              },
              {
                n: 4,
                tip: 'Customise the Network Fit section per buyer.',
                body: 'The audience analysis and network fit section should be customised for each buyer you submit to. A Travel Channel bible and a Netflix bible are different documents in this section. The core format stays the same; the framing of who this show serves changes.',
              },
            ].map(({ n, tip, body }) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  gap: 16,
                  marginBottom: 24,
                  alignItems: 'flex-start',
                }}
              >
                {/* Step number circle */}
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#e51d26',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#fff',
                    marginTop: 2,
                  }}
                >
                  {n}
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "'Roboto', sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#f2f4f7',
                      margin: '0 0 6px',
                    }}
                  >
                    {tip}
                  </p>
                  <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
                </div>
              </div>
            ))}

            <p style={{ ...bodyText, marginBottom: 0 }}>
              If you have a strong concept but are unsure how to translate it into a bible,
              the most effective path is to partner with an experienced production company
              that develops bibles as part of their pitch process. MY Entertainment develops
              format bibles for unscripted concepts as part of our production partnership model.{' '}
              <Link href="/work-with-us" style={inlineLink}>
                Learn about partnering with MYE →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — FAQ                                                     */}
      {/* FAQPage schema enables rich results for bible/format sub-queries.  */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="bible-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="bible-faq-item">
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
      {/* SECTION 7 — CTA                                                     */}
      {/* Converts bible-searcher into a B2B lead or pitch-cluster reader.  */}
      {/* Cross-links to pitch deck and how-to-pitch to strengthen the mesh. */}
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
            Need Help Building Your Pitch Package?
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
            MY Entertainment develops pitch decks, sizzle reels, and format bibles as part of
            our production partnership model. If you have a strong unscripted concept and want
            to build a commission-ready package, reach out.
          </p>

          {/* Primary CTA */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/contact"
              className="bible-cta-btn"
              aria-label="Contact MY Entertainment to develop your TV pitch package"
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
              <span aria-hidden="true">✉</span>
              Work With MY Entertainment
            </a>
            <span className="mye-tooltip" aria-hidden="true">
              Open the MYE contact form
            </span>
          </span>

          {/* Cluster cross-links */}
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
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Free Pitch Deck Template
            </Link>
            {' · '}
            <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
              How to Pitch a TV Show
            </Link>
            {' · '}
            <Link href="/sizzle-reel" style={inlineLink}>
              What Is a Sizzle Reel?
            </Link>
            {' · '}
            <Link href="/how-to-sell-a-tv-show-idea" style={inlineLink}>
              How to Sell a TV Show Idea
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
