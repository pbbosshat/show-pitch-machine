// ============================================================
// /documentary — SEO Page
// Target keyword: "documentary production company" (vol 100, KD 44, CPC $140)
//
// CONDITIONAL RESOLUTION (seo/scale-mye 2026-05-27):
//   The /genres dynamic route is a SINGLE page listing all genres from the DB.
//   There is NO individual genre slug page (no /genres/[slug]/page.tsx).
//   The sitemap generates /genres/[slug] URLs from DB data but no static route
//   handles those paths. Therefore NO cannibalisation risk exists.
//   This /documentary page is a standalone top-level commercial page, not a genre
//   sub-page. It targets "documentary production company" directly.
//
// KD 44 is high for MYE, but CPC $140 signals real buyers.
// The spec includes it as a new-build worth building.
//
// Schema: Article + FAQPage (same pattern as /sizzle-reel and /tv-show-pitch)
// Server Component — no 'use client'. All styles inline.
// Design tokens: bg #000, body #a5a7ad, headings #f2f4f7, accent #e51d26.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template
// so the exact keyword phrase is the <title> in the SERP.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'Documentary Production Company | MY Entertainment',
  },
  description:
    'MY Entertainment is an unscripted documentary production company with 25+ years producing documentary series for Discovery, PBS, Travel Channel, A&E, and 28+ networks. We develop, produce, and pitch documentary concepts — and help independent filmmakers package their projects for broadcast.',
  keywords: [
    'documentary production company', 'documentary series production', 'unscripted documentary production',
    'documentary tv production', 'documentary pitch', 'documentary series pitch', 'documentary co-production',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/documentary' },
  openGraph: {
    title: 'Documentary Production Company | MY Entertainment',
    description:
      'MY Entertainment is an unscripted documentary production company with 25+ years producing documentary series for Discovery, PBS, Travel Channel, A&E, and 28+ networks.',
    url: 'https://www.myentertainment.tv/documentary',
    siteName: 'MY Entertainment',
    type: 'article',
    images: [{
      url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png',
      width: 1887,
      alt: 'MY Entertainment — Documentary Production Company',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentary Production Company | MY Entertainment',
    description:
      'MY Entertainment is a documentary production company with 25+ years producing documentary series for Discovery, PBS, and 28+ networks worldwide.',
  },
};

// ------------------------------------------------------------
// Design token constants — verbatim copy from /sizzle-reel
// and /tv-show-pitch to maintain visual consistency across
// all public SEO pages.
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
// FAQ data — single source of truth for both on-page text and
// FAQPage JSON-LD schema. Any edit propagates to both.
// Questions target "documentary production company" and related
// searches by documentary creators and IP holders.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What does a documentary production company do?',
    a: 'A documentary production company develops, finances, produces, and distributes documentary content for television, streaming platforms, and theatrical release. For documentary creators, a production company provides the infrastructure (crew, equipment, post-production), network access (relationships with commissioning editors), and distribution pipeline to get your documentary from concept to broadcast.',
  },
  {
    q: 'How do I pitch a documentary series to a network?',
    a: 'To pitch a documentary series, you need: a clear subject and access (what is the story and why do you have unique access to it?), a pitch deck outlining the series format and episode structure, a sizzle reel that demonstrates visual and narrative potential, and a production partner with existing relationships at your target network. Documentary commissions at PBS, Discovery, Netflix, and similar buyers are almost exclusively made through established production companies — cold submissions from independent filmmakers are rarely reviewed.',
  },
  {
    q: 'What networks buy documentary series?',
    a: 'The primary buyers of documentary series include PBS (which has a structured co-production funding system), Discovery, National Geographic, Netflix, Max, Hulu, Apple TV+, A&E, Investigation Discovery, and many international broadcasters. Each network has distinct preferences for subject matter, length, and tone. MY Entertainment has active development relationships with buyers across this spectrum and can advise on which buyers are the right fit for your documentary concept.',
  },
  {
    q: 'How much does it cost to produce a documentary series?',
    a: 'Documentary production costs vary widely. A single-episode documentary for a major streaming platform might budget $500,000–$1.5 million per episode. A PBS-level documentary series might run $200,000–$600,000 per episode with co-production funding. Lower-budget documentary series for cable can be produced for $75,000–$200,000 per episode. The production budget is almost always tied to a commission or co-production deal — documentary projects that try to fund production entirely before securing a broadcast deal are structurally difficult to finance.',
  },
  {
    q: 'Does MY Entertainment produce documentaries?',
    a: 'Yes. MY Entertainment has a 25-year track record producing documentary and docuseries content, including Emmy-nominated Legacy List for PBS. We work across documentary genres including true crime, paranormal, lifestyle, sports, food, and travel. We evaluate documentary pitches from independent creators and, for projects that fit our development slate, co-produce the project and bring it to our network buyers.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — Article + FAQPage
// Article schema signals editorial depth for the keyword query.
// FAQPage schema enables rich result accordion Q&As in Google SERP.
// FAQ text MUST match FAQ_ITEMS above verbatim.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Documentary Production Company | MY Entertainment',
  description:
    'MY Entertainment is an unscripted documentary production company with 25+ years producing documentary series for Discovery, PBS, Travel Channel, A&E, and 28+ networks worldwide.',
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
    '@id': 'https://www.myentertainment.tv/documentary',
  },
};

// FAQ schema — mainEntity generated from FAQ_ITEMS to maintain one source of truth.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

// Documentary formats produced — used in the catalog section.
// Only approved, verified facts from MY Entertainment's real history.
const DOCUMENTARY_FORMATS = [
  {
    genre: 'Paranormal Docuseries',
    shows: 'Ghost Adventures (28 seasons, Travel Channel / Discovery), Destination Fear (Travel Channel)',
    note: 'Pioneered the paranormal investigation docuseries format on US cable television.',
  },
  {
    genre: 'Lifestyle Documentary',
    shows: 'Legacy List with Matt Paxton (PBS, Emmy-nominated)',
    note: 'Produced for PBS with co-production funding; demonstrates MYE\'s range into premium public broadcasting.',
  },
  {
    genre: 'True Crime / Investigation',
    shows: 'Sin City Justice (Investigation Discovery)',
    note: 'Crime and investigation format for ID, one of the most active buyers of true crime content.',
  },
  {
    genre: 'Travel & Adventure',
    shows: 'Breaking Borders (Travel Channel, critically acclaimed)',
    note: 'Travel documentary format combining cultural exploration with real-world conflict resolution.',
  },
];

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function DocumentaryPage() {
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
          Class names are page-scoped (.doc-*) to avoid collisions
          with other pages' styles. */}
      <style>{`
        .doc-prose { max-width: 780px; margin: 0 auto; }
        .doc-format-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 24px;
        }
        @media (max-width: 640px) {
          .doc-format-grid { grid-template-columns: 1fr; }
        }
        .doc-faq-item + .doc-faq-item { margin-top: 32px; }
        .doc-cta-btn:hover, .doc-cta-btn:focus-visible { opacity: 0.85; }
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
      {/* SECTION 1 — Page heading                                            */}
      {/* paddingTop 100px clears the fixed navbar (75px tall + margin).     */}
      {/* H1 contains "documentary production company" keyword phrase.       */}
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
          Production Services
        </p>

        {/*
          H1 — one per page (accessibility rule + SEO).
          "documentary production company" keyword is front-loaded.
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
          Documentary Production Company
        </h1>

        {/* AnswerBlock intro — concise definitional paragraph that answers the
            searcher's implied question: what is MY Entertainment's documentary
            production offering? Targets rich snippet / featured snippet potential. */}
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
          MY Entertainment is an unscripted documentary production company based in New York,
          with offices in Toronto and London. Since 2000, we have produced documentary series
          for Discovery, PBS, Travel Channel, A&amp;E, Max, and 28+ other networks — including
          Emmy-nominated programming. We develop, produce, and pitch documentary concepts, and
          work with independent documentary filmmakers to package their projects for broadcast.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — What makes a documentary production company             */}
      {/* Definitional section targeting "what does a documentary prodco do" */}
      {/* sub-queries. Sets up MYE's specific value proposition.            */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="doc-prose">
            <h2 style={h2Style}>What a Documentary Production Company Provides</h2>
            <p style={bodyText}>
              A <strong style={{ color: '#f2f4f7' }}>documentary production company</strong> does
              more than produce video — it develops the story, secures the access, structures the
              format for broadcast, and brings the project to the right buyer at the right time.
              For independent documentary filmmakers and IP holders, the right production partner
              transforms a compelling subject into a commissioned series.
            </p>
            <p style={bodyText}>
              MY Entertainment brings three things to every documentary project:
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
                <strong style={{ color: '#f2f4f7' }}>25 years of buyer relationships.</strong> We have
                active development relationships with commissioning editors at PBS, Discovery, National
                Geographic, A&amp;E, Max, and international broadcasters. Your documentary pitch goes
                to a specific person who knows our track record — not a blind submission inbox.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Format development expertise.</strong> We know
                how to shape a documentary subject into a series format that a network will commission —
                how many episodes, what length, what recurring structure, what kind of access the story
                requires, and how to build a sizzle reel that makes the buyer see the full series.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>Full production infrastructure.</strong> From
                concept development and sizzle reel production through series delivery — crew, equipment,
                edit bays, post-production, and compliance clearances. We are the production company,
                not a broker.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Documentary formats / catalog proof                     */}
      {/* Four-card grid of real documentary series MYE has produced.        */}
      {/* Only approved, verified titles from the MYE catalog.              */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2
            style={{
              ...h2Style,
              textAlign: 'center',
            }}
          >
            Documentary Series We&apos;ve Produced
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 620,
              margin: '0 auto 8px',
            }}
          >
            25 years of documentary production across paranormal, lifestyle, true crime,
            and travel formats.
          </p>

          {/* Format card grid — 2 columns desktop, 1 mobile */}
          <div className="doc-format-grid">
            {DOCUMENTARY_FORMATS.map(({ genre, shows, note }) => (
              <div
                key={genre}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '24px 20px 24px 18px',
                }}
              >
                <h3 style={{ ...h3Style, marginBottom: 8 }}>{genre}</h3>
                <p
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 14,
                    fontWeight: 400,
                    color: '#f2f4f7',
                    marginTop: 0,
                    marginBottom: 8,
                  }}
                >
                  {shows}
                </p>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Pitching a documentary series                           */}
      {/* Targets "documentary series pitch" sub-query.                      */}
      {/* Practical guide for creators looking to pitch a documentary.      */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="doc-prose">
            <h2 style={h2Style}>How to Pitch a Documentary Series</h2>
            <p style={bodyText}>
              A documentary series pitch has different requirements than a reality TV or competition
              format pitch. The buyer wants to know three things immediately:
            </p>

            {[
              {
                label: 'What is the subject — and what is your access?',
                body: 'Every great documentary series is built on exclusive access. A subject that everyone knows about but nobody has been able to film is more valuable than a completely novel subject. Define your access clearly — and honestly. Networks will ask how you secured it and whether it can sustain a full series.',
              },
              {
                label: 'Is this a series or a film?',
                body: 'The difference matters enormously for broadcast placement. A documentary series requires a recurring structure — a compelling reason for the audience to come back episode after episode. A documentary film tells a self-contained story. Networks commission series for their schedules; films go through a different funding path. Know which you are pitching before you walk in.',
              },
              {
                label: 'Who is the audience and where do they watch?',
                body: 'PBS audiences, Discovery audiences, and Netflix audiences have very different expectations. Your pitch needs to be specific about where this series lives and why. The pitch materials — deck, sizzle reel, logline — should all signal the same network home.',
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
                <h3 style={{ ...h3Style, marginBottom: 8 }}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}

            <p style={bodyText}>
              For a complete guide to the pitch process, see our{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                How to Pitch a TV Show guide
              </Link>
              {' '}and{' '}
              <Link href="/tv-show-pitch-deck" style={inlineLink}>
                free pitch deck template
              </Link>
              . For documentary-specific sizzle reel guidance, see our{' '}
              <Link href="/sizzle-reel" style={inlineLink}>
                Sizzle Reel page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — FAQ                                                     */}
      {/* FAQPage schema surfaces rich results in Google SERP.               */}
      {/* Text MUST match faqSchema.mainEntity verbatim for validation.     */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="doc-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {/* Render each FAQ item — text MUST match JSON-LD above verbatim */}
            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div
                key={idx}
                className="doc-faq-item"
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
      {/* SECTION 6 — CTA + cluster cross-links                               */}
      {/* Converts informational reader into a B2B lead.                    */}
      {/* Cross-links pass PageRank to the buyer-intent cluster.            */}
      {/* ================================================================== */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
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
            Partner With MY Entertainment
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
            MY Entertainment is actively developing new documentary and unscripted concepts.
            If you have a documentary subject, exclusive access, or an IP opportunity — reach out.
            We evaluate every pitch and respond to those that fit our current development slate.
          </p>

          {/* Primary CTA — /work-with-us B2B partnership page. */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/work-with-us"
              className="doc-cta-btn"
              aria-label="Work with MY Entertainment — submit your documentary concept"
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
              Work With MY Entertainment
            </a>
            <span className="mye-tooltip" aria-hidden="true">
              Go to the Work With MYE page
            </span>
          </span>

          {/* Cluster cross-links — connects documentary page to the full buyer cluster */}
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
            <Link href="/tv-production-company" style={inlineLink}>
              TV Production Company
            </Link>
            {' · '}
            <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
              How to Pitch a TV Show
            </Link>
            {' · '}
            <Link href="/sizzle-reel" style={inlineLink}>
              Sizzle Reel Production
            </Link>
            {' · '}
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Free Pitch Deck Template
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
