// ============================================================
// /unscripted-tv-shows — Buyer & Creator Discovery Hub Page
// Target keywords (seo/mye-pitch-money-2026-06-04):
//   "unscripted tv shows"          (vol 1,200, KD ~20 — primary/H1)
//   "unscripted television"        (vol ~300,  KD ~15 — H2)
//   "unscripted tv"                (vol ~800,  KD ~15 — body)
//   "what is unscripted tv"        (vol ~200,  KD ~5  — FAQ/definition)
//   "unscripted tv production"     (vol ~50,   KD ~10 — H2/CTA)
//   "best unscripted shows"        (vol ~400,  KD ~20 — catalog section)
//
// Intent: dual audience — creators who want to make an unscripted
// show (pitch/production intent) and general discovery users who
// want to understand what unscripted TV is. The page serves both:
// definition and genre overview for informational searchers;
// production and pitching CTA for buyer-intent searchers.
//
// Legacy traffic opportunity: MYE has Ghost Adventures (28 seasons),
// Destination Fear, Pros vs Joes — naming real shows builds E-E-A-T
// and gives AI citation engines specific facts to surface.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens identical to the rest of the (public) cluster.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template.
// "unscripted tv shows" is the primary H1 keyword.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'Unscripted TV Shows: What They Are, Genres & How to Make One',
  },
  description:
    'Unscripted TV shows are non-fiction television — reality TV, documentaries, competition shows, and true crime. MY Entertainment is a New York unscripted TV production company behind Ghost Adventures (28 seasons), Destination Fear, and Pros vs Joes. Learn about unscripted TV genres and how to pitch an unscripted show.',
  keywords: [
    'unscripted tv shows', 'unscripted television', 'unscripted tv',
    'what is unscripted tv', 'unscripted tv production', 'unscripted shows',
    'reality tv shows', 'non-fiction tv', 'unscripted formats',
    'best unscripted shows', 'unscripted tv genres',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/unscripted-tv-shows' },
  openGraph: {
    title: 'Unscripted TV Shows: What They Are, Genres & How to Make One',
    description:
      'What unscripted TV shows are, the major genres, and how to pitch or sell an unscripted show — from MY Entertainment, producers of Ghost Adventures, Destination Fear, and 28+ networks.',
    url: 'https://www.myentertainment.tv/unscripted-tv-shows',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unscripted TV Shows: What They Are, Genres & How to Make One',
    description:
      'What unscripted TV shows are, major genres, and how to pitch one — from MY Entertainment, producers of Ghost Adventures and Destination Fear.',
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
// Unscripted genre definitions — used in Section 3.
// Factual, specific, citing real show examples from MYE catalog.
// These facts strengthen E-E-A-T and give AI engines specific
// citations to surface in responses about unscripted TV genres.
// ------------------------------------------------------------
const GENRES = [
  {
    label: 'Paranormal & Supernatural',
    body: 'One of cable television\'s most durable genres. Paranormal shows follow investigators or witnesses of unexplained events — hauntings, cryptid encounters, UFO sightings — combining documentary elements with serialized character relationships. Primary buyers: Travel Channel, Discovery, Syfy. MY Entertainment produced Ghost Adventures, which ran 28 seasons on Travel Channel and Discovery, and Destination Fear.',
    examples: ['Ghost Adventures', 'Destination Fear', 'Paranormal Challenge'],
  },
  {
    label: 'Sports & Competition',
    body: 'Competition shows pit skilled individuals against each other in structured challenges — sports-based, talent-based, or knowledge-based. The format engine is the competition itself: clear stakes, repeatable structure, and emotionally invested characters. Primary buyers: ESPN, Fox, NBC, Bravo. MY Entertainment produced Pros vs Joes (four seasons on Spike TV / Comedy Central).',
    examples: ['Pros vs Joes', 'Competition formats across cable and broadcast'],
  },
  {
    label: 'True Crime & Investigation',
    body: 'The most consistently high-rating genre on cable television. True crime shows examine real criminal cases — murders, disappearances, fraud, and systemic crime — through investigation and testimony. Access and exclusivity are the pitch differentiators. Primary buyers: Investigation Discovery (ID), Oxygen, A&E, Peacock, Netflix. MY Entertainment has produced true crime content for multiple buyers.',
    examples: ['Sin City Justice', 'Investigation-based formats'],
  },
  {
    label: 'Home, Lifestyle & Food',
    body: 'The broadest genre in cable unscripted, covering home renovation, cooking, design, and lifestyle content. Strong format repeatability and a loyal, well-defined female-skewing audience. Primary buyers: HGTV, Food Network, Bravo, TLC, Magnolia Network. MY Entertainment\'s Legacy List (PBS) sits at the intersection of home and history documentary.',
    examples: ['Legacy List (PBS)', 'Home & lifestyle formats'],
  },
  {
    label: 'Documentary Series',
    body: 'A documentary series applies long-form investigative or observational filmmaking to a repeatable subject or anthology format. Distinguished from standalone documentaries by episodic structure. Primary buyers: PBS, Netflix, Max, Hulu, National Geographic. MY Entertainment produced Legacy List with Matt Paxton — an Emmy-nominated PBS documentary series.',
    examples: ['Legacy List with Matt Paxton (PBS)', 'Emmy-nominated documentary series'],
  },
  {
    label: 'Comedy & Satire Unscripted',
    body: 'Comedy-driven reality and hidden-camera formats that prioritize humor over drama. Format engine: comedic situations, character-driven absurdity, and social dynamics. Primary buyers: Comedy Central, E!, TruTV, Bravo. One of the harder genres to pitch because tone is difficult to convey in a deck — the sizzle reel is especially critical for comedy formats.',
    examples: ['Comedy reality formats', 'Hidden camera / character-driven humor'],
  },
];

// ------------------------------------------------------------
// FAQ items — single source for visible text and JSON-LD.
// Targets "what is unscripted tv", "how to make unscripted tv",
// and "unscripted vs scripted" informational sub-queries.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What is unscripted TV?',
    a: 'Unscripted TV refers to television programming that is not based on a pre-written script with fictional characters and storylines. It includes reality TV shows, documentary series, competition formats, game shows, and talk shows. In unscripted television, the content is generated by real people in real (or constructed real) situations, rather than by actors performing a written script. The term "non-fiction television" is sometimes used interchangeably with unscripted TV.',
  },
  {
    q: 'What is the difference between scripted and unscripted TV?',
    a: 'Scripted TV (drama, comedy, limited series) is produced from a written screenplay or teleplay with professional actors performing fictional roles. Unscripted TV (reality TV, documentary, competition, game shows) is produced with real people in real or constructed situations, without a pre-written script. Unscripted shows typically have lower production costs per episode, faster development timelines, and higher production volume than scripted series. Most cable networks program a mix of both; most streamers are expanding their unscripted commissions.',
  },
  {
    q: 'How do I pitch an unscripted TV show?',
    a: 'To pitch an unscripted TV show, you need to build a pitch package: a logline, a 10–15 slide pitch deck, and a 2–4 minute sizzle reel. You then need access to the right commissioning editor at your target network — which in practice means partnering with a production company that has those relationships. Read our full guide on how to pitch a TV show for the complete step-by-step process.',
  },
  {
    q: 'How many unscripted TV shows are commissioned each year?',
    a: 'Precise annual commission counts vary by year and by network. Across US cable networks and major streamers, several hundred new unscripted series are commissioned each year, with thousands of pilots, development deals, and pitched concepts that don\'t reach commission. The overall volume of unscripted TV production is significantly higher than scripted — most cable networks commission unscripted exclusively or predominantly. In a typical year, networks like Discovery, HGTV, Food Network, and TLC each commission dozens of new unscripted series.',
  },
  {
    q: 'What are the most popular unscripted TV show formats?',
    a: 'The most durable unscripted TV formats include: competition formats (American Idol, The Voice, Survivor, Amazing Race); renovation and makeover shows (Fixer Upper, Property Brothers); paranormal and investigation shows (Ghost Adventures, Ghost Hunters); true crime docuseries (Making a Murderer, The Act); and food and restaurant shows (Chopped, Diners Drive-Ins and Dives). The most commercially successful formats share a common trait: a clear, repeatable structure that generates conflict in every episode.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — Article + FAQPage
// Article signals expert editorial authority on the topic.
// FAQPage enables rich results for definition sub-queries.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Unscripted TV Shows: What They Are, Genres & How to Make One',
  description:
    'What unscripted TV shows are, the major genres, and how to pitch or sell an unscripted show from a production company with 25+ years of experience.',
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
    '@id': 'https://www.myentertainment.tv/unscripted-tv-shows',
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

// BreadcrumbList schema
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
      name: 'Unscripted TV Shows',
      item: 'https://www.myentertainment.tv/unscripted-tv-shows',
    },
  ],
};

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function UnscriptedTVShowsPage() {
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

      {/* Responsive and utility styles */}
      <style>{`
        .unscripted-prose { max-width: 780px; margin: 0 auto; }
        .unscripted-genre-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }
        .unscripted-faq-item + .unscripted-faq-item { margin-top: 28px; }
        .unscripted-cta-btn:hover, .unscripted-cta-btn:focus-visible { opacity: 0.85; }
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
      {/* H1 — "unscripted tv shows" keyword in H1 text.                     */}
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
        {/* Eyebrow — positions this as the genre discovery / E-E-A-T hub.
            Producers with a finished unscripted show seeking distribution should
            be routed to /tv-distribution-company or /pitch — callout below. */}
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
          MY Entertainment — Unscripted TV
        </p>

        {/* H1 — "unscripted tv shows" keyword */}
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(30px, 5vw, 50px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 820,
            lineHeight: 1.15,
          }}
        >
          Unscripted TV Shows: What They Are, Genres &amp; How to Make One
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
          MY Entertainment is a New York unscripted TV production company founded in 2000,
          behind Ghost Adventures (28 seasons), Destination Fear, and Pros vs Joes. We develop,
          produce, and sell unscripted television to 28+ networks worldwide.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — What is unscripted TV (definition)                      */}
      {/* Targets "what is unscripted tv" informational sub-query.           */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="unscripted-prose">
            <h2 style={h2Style}>What Is Unscripted Television?</h2>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>Unscripted TV shows</strong> are television
              programs produced without a pre-written script — meaning the content is generated
              by real people in real (or constructed real) situations, rather than by actors
              performing written dialogue.
            </p>
            <p style={bodyText}>
              The term covers a wide range of formats: reality TV, documentary series,
              competition shows, game shows, talk shows, and true crime. What they share is
              the absence of fictional characters and pre-scripted storylines. The drama,
              conflict, and story come from real people making real decisions.
            </p>
            <p style={bodyText}>
              Unscripted television is the dominant format across most cable networks and is
              growing on major streaming platforms. It is generally produced faster, at lower
              cost per episode, and with more format repeatability than scripted drama or
              comedy — making it the primary commissioning target for production companies
              like MY Entertainment.
            </p>

            {/* Stat block — key facts about the unscripted market */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginTop: 32,
                marginBottom: 0,
              }}
            >
              {[
                { stat: '28+', label: 'Networks MY Entertainment has sold to' },
                { stat: '28', label: 'Seasons of Ghost Adventures on Discovery' },
                { stat: '25+', label: 'Years producing unscripted television' },
              ].map(({ stat, label }) => (
                <div
                  key={stat}
                  style={{
                    textAlign: 'center',
                    padding: '20px 12px',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    borderRadius: 4,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: 40,
                      fontWeight: 700,
                      color: '#e51d26',
                      margin: '0 0 8px',
                      lineHeight: 1,
                    }}
                  >
                    {stat}
                  </p>
                  <p style={{ ...bodyText, marginBottom: 0, fontSize: 12, textAlign: 'center' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2b — Distribution routing callout (re-point 2026-06-04)    */}
      {/* This page has dual intent: genre discovery (informational) AND      */}
      {/* producers seeking distribution (commercial). The callout splits the */}
      {/* audience: distribution-seekers with a finished show → /tv-          */}
      {/* distribution-company; genre/production learners → continue reading. */}
      {/* ================================================================== */}
      <section
        style={{
          background: '#0d0d0d',
          padding: '28px 20px',
          borderTop: '1px solid #1a1a1a',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <div style={container}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: 900,
              margin: '0 auto',
            }}
          >
            {/* Left: distribution path CTA */}
            <div style={{ flex: '1 1 300px' }}>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 11,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  margin: '0 0 6px',
                }}
              >
                Have a finished unscripted show?
              </p>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#f2f4f7',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                MY Entertainment is a{' '}
                <Link href="/tv-distribution-company" style={inlineLink}>
                  TV distribution company
                </Link>
                {' '}that pitches finished unscripted shows to 28+ US networks and international
                broadcasters. If your show is in production or complete,{' '}
                <Link href="/pitch" style={inlineLink}>
                  submit it for distribution consideration
                </Link>
                .
              </p>
            </div>

            {/* Two action links */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="/tv-distribution-company"
                style={{
                  display: 'inline-block',
                  background: '#e51d26',
                  color: '#fff',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  borderRadius: 4,
                  padding: '10px 20px',
                  transition: 'opacity 150ms',
                }}
              >
                TV Distribution
              </a>
              <a
                href="/pitch"
                style={{
                  display: 'inline-block',
                  background: 'transparent',
                  color: '#a5a7ad',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '10px 20px',
                }}
              >
                Submit Your Show
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Unscripted TV genres                                    */}
      {/* Genre breakdown with real show examples — E-E-A-T signal and       */}
      {/* factual content for GEO/AI citation. 6 genres in card grid.        */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            Unscripted TV Genres
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            Unscripted television spans six major genre categories. Each has distinct buyer
            relationships, format requirements, and pitch conventions.
          </p>

          {/* Genre card grid */}
          <div className="unscripted-genre-grid">
            {GENRES.map(({ label, body, examples }) => (
              <div
                key={label}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '20px 20px 20px 18px',
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    fontSize: 15,
                    marginBottom: 8,
                  }}
                >
                  {label}
                </h3>
                <p style={{ ...bodyText, marginBottom: 10, fontSize: 13 }}>{body}</p>
                {/* MYE show examples — E-E-A-T signal */}
                <p
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 12,
                    color: '#e51d26',
                    marginBottom: 0,
                    marginTop: 0,
                  }}
                >
                  MYE shows: {examples.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — How to make an unscripted TV show                       */}
      {/* Targets "how to make an unscripted show" and pitch/production       */}
      {/* intent. Links into the full pitch cluster for conversion.          */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="unscripted-prose">
            <h2 style={h2Style}>How to Make an Unscripted TV Show</h2>
            <p style={bodyText}>
              Making an unscripted TV show involves two parallel paths: the creative
              development path (defining the format, finding the characters, producing the
              sizzle reel) and the commercial path (pitching to buyers, negotiating the deal,
              and delivering the commissioned series).
            </p>
            <p style={bodyText}>
              For independent creators, the commercial path runs through a production company.
              Networks commission unscripted shows from production companies — not from
              individual creators. The production company brings network access, production
              infrastructure, and the credibility to convert a pitch into a commission.
            </p>

            {/* Three-step overview with links into the cluster */}
            {[
              {
                n: 1,
                title: 'Develop the Concept',
                body: (
                  <>
                    Define your format, identify your characters, and clarify your target network.
                    Build a{' '}
                    <Link href="/tv-show-pitch-deck" style={inlineLink}>
                      pitch deck
                    </Link>{' '}
                    and a{' '}
                    <Link href="/sizzle-reel" style={inlineLink}>
                      sizzle reel
                    </Link>
                    {' '}— the two documents that constitute a commission-ready pitch package.
                  </>
                ),
              },
              {
                n: 2,
                title: 'Attach a Production Partner',
                body: (
                  <>
                    Partner with a{' '}
                    <Link href="/tv-production-company" style={inlineLink}>
                      TV production company
                    </Link>{' '}
                    that has existing relationships with your target buyers. The partner co-develops
                    your concept, submits it to their network contacts, and shepherds it through the
                    development process.
                  </>
                ),
              },
              {
                n: 3,
                title: 'Pitch, Develop, and Commission',
                body: (
                  <>
                    Your production partner submits the package to commissioning editors. Read our
                    guide on{' '}
                    <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                      how to pitch a TV show
                    </Link>{' '}
                    for the full process — from the first pitch meeting through to the commission deal.
                    Once commissioned, the show enters pre-production and then principal photography.
                  </>
                ),
              },
            ].map(({ n, title, body }) => (
              <div
                key={n}
                style={{
                  display: 'flex',
                  gap: 20,
                  marginBottom: 32,
                  alignItems: 'flex-start',
                }}
              >
                {/* Step number circle */}
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#e51d26',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: 18,
                    color: '#fff',
                    marginTop: 2,
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
      {/* SECTION 5 — MY Entertainment's unscripted catalog                   */}
      {/* Named show references strengthen E-E-A-T and create factual        */}
      {/* content AI search engines can cite when answering "who produces     */}
      {/* unscripted TV?" and "what shows has MY Entertainment made?"        */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="unscripted-prose">
            <h2 style={h2Style}>MY Entertainment Unscripted Shows</h2>
            <p style={bodyText}>
              MY Entertainment has produced unscripted television since 2000, across paranormal,
              sports, true crime, home, and documentary genres. A selection of produced shows:
            </p>

            {/* Show list — factual, named shows with network context */}
            {[
              {
                show: 'Ghost Adventures',
                detail: '28 seasons on Travel Channel and Discovery. A paranormal investigation series following Zak Bagans and team at the world\'s most haunted locations. One of the longest-running paranormal series in cable history.',
              },
              {
                show: 'Destination Fear',
                detail: 'Travel Channel. An investigative paranormal series following Dakota Laden, Chelsea Laden, Alex Schilpp, and Tanner Wiseman as they spend nights alone in America\'s most feared abandoned locations.',
              },
              {
                show: 'Pros vs Joes',
                detail: 'Four seasons on Spike TV / Comedy Central. Competition reality series in which amateur athletes compete directly against retired professional athletes across multiple sports.',
              },
              {
                show: 'Legacy List with Matt Paxton',
                detail: 'PBS. Emmy-nominated documentary series in which certified estate liquidator Matt Paxton helps families sort through lifetimes of possessions and uncover extraordinary stories hidden in everyday objects.',
              },
              {
                show: 'Paranormal Challenge',
                detail: 'Travel Channel. Competition series in which paranormal investigation teams compete at notoriously haunted locations, judged by Ghost Adventures\' Zak Bagans.',
              },
            ].map(({ show, detail }) => (
              <div
                key={show}
                style={{
                  borderLeft: '3px solid #e51d26',
                  paddingLeft: 16,
                  marginBottom: 20,
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                    marginBottom: 4,
                  }}
                >
                  {show}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{detail}</p>
              </div>
            ))}

            <p style={bodyText}>
              View our full catalog of available and in-development unscripted content:{' '}
              <Link href="/available" style={inlineLink}>
                Available Shows →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — FAQ                                                     */}
      {/* FAQPage schema targets "what is unscripted tv" and related queries.*/}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="unscripted-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="unscripted-faq-item">
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
      {/* Converts discovery reader into a B2B pitch lead.                  */}
      {/* Cross-links to the full pitch cluster for PageRank mesh.          */}
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
            Have an Unscripted TV Show Concept?
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
            MY Entertainment is actively developing new unscripted concepts across paranormal,
            true crime, competition, and documentary genres. If you have a strong concept and
            real characters, reach out — we&apos;ll tell you honestly whether it&apos;s ready to pitch.
          </p>

          {/* Primary CTA */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/contact"
              className="unscripted-cta-btn"
              aria-label="Contact MY Entertainment to pitch your unscripted TV show concept"
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
              Pitch Your Show to MYE
            </a>
            <span className="mye-tooltip" aria-hidden="true">
              Open the MYE contact form
            </span>
          </span>

          {/* Distribution spine link — primary commercial conversion path */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 24,
              marginBottom: 8,
            }}
          >
            <strong style={{ color: '#f2f4f7' }}>Show already made?</strong>{' '}
            <Link href="/tv-distribution-company" style={inlineLink}>
              Learn about TV distribution with MY Entertainment →
            </Link>
          </p>

          {/* Cluster cross-links — education mesh */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            Also read:{' '}
            <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
              How to Pitch a TV Show
            </Link>
            {' · '}
            <Link href="/how-to-sell-a-tv-show-idea" style={inlineLink}>
              How to Sell a TV Show Idea
            </Link>
            {' · '}
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Free Pitch Deck Template
            </Link>
            {' · '}
            <Link href="/sizzle-reel" style={inlineLink}>
              What Is a Sizzle Reel?
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
