// ============================================================
// /sizzle-reel — B2B SEO Flagship Page
// Target keyword: "sizzle reel" (vol 3,200, KD 1, opportunity 3,168)
// Intent: producers, showrunners, and IP holders searching for
// production company expertise to package and sell their concept.
//
// This is a Server Component — no 'use client'. All styles inline.
// Mirrors the Webflow design token system exactly:
//   bg #000, body text #a5a7ad, headings #f2f4f7, accent #e51d26
//   Roboto 14px body, Roboto Condensed uppercase labels, Oswald for H1
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses the root layout
// template ('%s | MyEntertainment') so the exact title string
// is preserved for maximum SEO impact on this money keyword.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'Sizzle Reel: What It Is, Examples & How to Make One That Sells a Show',
  },
  description:
    'A sizzle reel is a short, high-impact video that pitches a TV show concept to networks and streamers. Learn what makes one work, see examples, and find out how MY Entertainment produces reels that sell.',
  keywords: [
    'sizzle reel', 'sizzle reel for tv show', 'what is a sizzle reel', 'tv sizzle reel',
    'how to make a sizzle reel', 'sizzle reel examples', 'tv pitch reel',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/sizzle-reel' },
  openGraph: {
    title: 'Sizzle Reel: What It Is, Examples & How to Make One That Sells a Show',
    description:
      'A sizzle reel is a short, high-impact video that pitches a TV show concept to networks and streamers. Learn what makes one work, see examples, and find out how MY Entertainment produces reels that sell.',
    url: 'https://www.myentertainment.tv/sizzle-reel',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sizzle Reel: What It Is, Examples & How to Make One That Sells a Show',
    description:
      'A sizzle reel is a short, high-impact video that pitches a TV show concept to networks and streamers. Learn what makes one work, see examples, and find out how MY Entertainment produces reels.',
  },
};

// ------------------------------------------------------------
// Design token constants — must match Webflow source exactly
// Container max-width, font stacks, and color palette are defined
// once here to stay consistent with the rest of the public site.
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

// CTA link — matches Webflow .get-started-link token
const ctaLink: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  color: '#e02027',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  letterSpacing: '0.05em',
};

// Inline link style — body-copy hyperlinks within article text
const inlineLink: React.CSSProperties = {
  color: '#e02027',
  textDecoration: 'none',
};

// ------------------------------------------------------------
// FAQ data — must match the FAQPage JSON-LD below exactly,
// question-for-question, so Google's rich result matches the
// visible on-page text. Any drift will invalidate the markup.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What is a sizzle reel?',
    a: 'A sizzle reel is a short (2–5 minute) video that pitches a TV show concept to a network or streaming service. It combines interviews, dramatic moments, narration, and graphics to convey the tone, format, and audience appeal of a proposed series — before a single episode is shot.',
  },
  {
    q: 'How long should a sizzle reel be?',
    a: 'Most effective sizzle reels run 2–4 minutes. Network executives screen dozens of pitches; a reel that holds attention past the two-minute mark typically earns a follow-up meeting. Longer than five minutes risks losing the room.',
  },
  {
    q: 'What goes into a sizzle reel?',
    a: 'A strong sizzle reel includes: a hook (the first 15 seconds must grab attention), character moments that reveal real conflict or stakes, genre signals (pacing, music, and graphics that match the format), a network "fit" cue (who should commission this?), and a clear call to action or tagline.',
  },
  {
    q: 'Do I need a sizzle reel to pitch a TV show?',
    a: 'Not always — but it significantly improves your odds. A written pitch deck alone asks the buyer to imagine the show; a sizzle reel shows them. MY Entertainment recommends pairing a sizzle reel with a one-page pitch document for the strongest submission.',
  },
  {
    q: 'How much does a sizzle reel cost to produce?',
    a: 'Production budgets vary widely depending on scope. A basic "tone reel" assembled from existing footage can run $5,000–$15,000. A fully produced field sizzle with a shoot day and post-production typically runs $25,000–$75,000+. MY Entertainment assesses each concept individually to recommend the right production level for the target network.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — Article + FAQPage combined on one page.
// Article signals editorial depth (ranking for informational
// queries); FAQPage surfaces rich results in Google SERP.
// FAQ text MUST match FAQ_ITEMS above verbatim.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Sizzle Reel: What It Is, Examples & How to Make One That Sells a Show',
  description:
    'A sizzle reel is a short, high-impact video that pitches a TV show concept to networks and streamers. Learn what makes one work, see examples, and find out how MY Entertainment produces reels that sell.',
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
    '@id': 'https://www.myentertainment.tv/sizzle-reel',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  // mainEntity items are generated from FAQ_ITEMS so there is
  // exactly one source of truth for question/answer text.
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function SizzleReelPage() {
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

      {/* Responsive prose column styles */}
      <style>{`
        .sizzle-prose { max-width: 780px; margin: 0 auto; }
        .sizzle-anatomy-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 24px;
        }
        @media (max-width: 600px) {
          .sizzle-anatomy-grid { grid-template-columns: 1fr; }
        }
        .sizzle-faq-item + .sizzle-faq-item { margin-top: 32px; }
        /* CTA button hover — bg darkens on hover/focus */
        .sizzle-cta-btn:hover,
        .sizzle-cta-btn:focus-visible { opacity: 0.85; }
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
      {/* H1 is the only H1 on the page; keyword "sizzle reel" is in it.    */}
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
        {/* Webflow .subtitle-small token: #e51d26, 48px, uppercase, Roboto, 0.2em spacing */}
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
          Production Resources
        </p>

        {/*
          H1 — one per page (accessibility rule).
          Uses Oswald (loaded in root layout) to match the live site's
          editorial headline treatment; different from the red uppercase
          section labels so the hierarchy is visually clear.
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
          The Sizzle Reel — Your Show&apos;s First Impression
        </h1>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto',
            maxWidth: 680,
          }}
        >
          Inside: what a sizzle reel actually is, why it&apos;s the single most important
          tool in a TV pitch, the anatomy of one that sells, real examples, and how MY
          Entertainment produces reels for shows that get commissioned.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — Definition                                              */}
      {/* Targets the "what is a sizzle reel" informational sub-query.       */}
      {/* Prose column constrained to 780px for comfortable line length.     */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sizzle-prose">
            <h2 style={h2Style}>What Is a Sizzle Reel?</h2>
            <p style={bodyText}>
              A <strong style={{ color: '#f2f4f7' }}>sizzle reel</strong> is a short, high-impact video — typically 2–5 minutes — that pitches
              an unscripted TV show or documentary concept to network executives and streaming
              commissioning editors. It is the visual equivalent of an elevator pitch: it must
              convey tone, format, characters, conflict, and potential audience within the time it
              takes a busy executive to decide whether to keep watching.
            </p>
            <p style={bodyText}>
              Unlike a pilot episode (which costs millions to produce), a sizzle reel can be shot
              for a fraction of the budget using real locations, real subjects, and selectively staged
              moments — giving buyers a taste of the finished show before any real commitment is made.
            </p>
            <p style={bodyText}>
              At MY Entertainment, we have produced sizzle reels for shows that sold to Discovery,
              Max, PBS, A&amp;E, Travel Channel, and 28+ other networks over our 25-year history.
              What we&apos;ve learned: the reel is not a trailer for a show that already exists —
              it is a <em>persuasion tool</em> designed to make a specific buyer say yes.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Why it sells                                            */}
      {/* Answers the implicit intent behind the search query: the searcher  */}
      {/* wants to understand business value, not just definition.           */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sizzle-prose">
            <h2 style={h2Style}>Why a Sizzle Reel Sells a Show</h2>
            <p style={bodyText}>
              Network buyers evaluate hundreds of pitches per year. A written logline and a deck
              tell a story — a sizzle reel <em>shows</em> one. The difference is enormous:
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
                <strong style={{ color: '#f2f4f7' }}>Reduces imagination work.</strong> A buyer who
                can see the characters, the pacing, and the visual language immediately knows whether
                the show fits their brand. You eliminate ambiguity.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Proves production capability.</strong> A polished
                reel signals that your team can deliver — that this isn&apos;t vaporware. It&apos;s
                evidence.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Travels without you.</strong> After your pitch
                meeting, the reel continues selling internally. Executives share it with their
                programming committees; a deck rarely makes that journey.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>Locks in the talent.</strong> A great on-screen
                host or character captured in a sizzle reel makes the show tangible. Buyers don&apos;t
                just imagine talent — they see it.
              </li>
            </ul>
            <p style={bodyText}>
              The bottom line: in today&apos;s competitive pitch environment, arriving without a
              sizzle reel is arriving under-armed.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Anatomy of a great reel                                 */}
      {/* Card grid explains what goes into a reel — targets "sizzle reel    */}
      {/* examples" and "what goes in a sizzle reel" sub-queries.            */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
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
            Anatomy of a Great Sizzle Reel
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 600,
              margin: '0 auto 8px',
            }}
          >
            Every successful reel we&apos;ve produced at MY Entertainment contains these six elements,
            in roughly this order.
          </p>

          {/* Six-card anatomy grid — 2 columns on desktop, 1 on mobile */}
          <div className="sizzle-anatomy-grid">
            {[
              {
                num: '01',
                title: 'The Hook (0:00–0:15)',
                body: 'The opening 15 seconds must earn the next 2 minutes. Lead with the most dramatic, funny, or unexpected moment in your footage — not an intro card, not your logo. Grab first; explain later.',
              },
              {
                num: '02',
                title: 'The Premise (0:15–0:45)',
                body: 'State the show\'s core concept in one or two clear sentences — ideally spoken by a compelling character or in VO. Buyers need to understand the format before they can fall in love with it.',
              },
              {
                num: '03',
                title: 'Character & Conflict (0:45–2:00)',
                body: 'Unscripted TV lives and dies on characters. Show the people at the center of the story, reveal what\'s at stake for them, and demonstrate genuine conflict. Buyers are investing in relationships, not ideas.',
              },
              {
                num: '04',
                title: 'Production Value Cues',
                body: 'The look, sound, and pacing of your reel tells buyers what the finished show will feel like. A paranormal series needs atmospheric audio; a competition show needs kinetic editing. Match your genre\'s visual language.',
              },
              {
                num: '05',
                title: 'Network Fit Signal',
                body: 'A reel that works for Travel Channel and one that works for Bravo are fundamentally different. If you\'re pitching a specific network, let that target shape every tonal choice in the reel.',
              },
              {
                num: '06',
                title: 'The Close',
                body: 'End with your tagline and a clear title card. Give buyers something quotable — the sentence they\'ll use when they describe the show to their boss. Simple. Memorable. Sellable.',
              },
            ].map(({ num, title, body }) => (
              <div
                key={num}
                style={{
                  // Card: dark border on black background, red accent number
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '24px 20px',
                }}
              >
                {/* Red accent number — Webflow .subtitle-small scaled down */}
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
      {/* SECTION 5 — Examples                                                */}
      {/* Links out to MY Entertainment's own public sizzle reels on YouTube */}
      {/* and the /reel page. Targets "sizzle reel examples" sub-query.     */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sizzle-prose">
            <h2 style={h2Style}>Sizzle Reel Examples</h2>
            <p style={bodyText}>
              The best way to understand what makes a sizzle reel work is to watch ones that sold.
              MY Entertainment has produced reels that led to commissions on Discovery, PBS, Travel
              Channel, and more. The company sizzle reel below gives you a sense of the production
              quality and narrative structure we bring to every pitch.
            </p>

            {/* Primary example — linked YouTube reel from the homepage CTA */}
            <div
              style={{
                background: '#000',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
                padding: '20px',
                marginBottom: 20,
              }}
            >
              <h3 style={h3Style}>MY Entertainment Company Sizzle Reel</h3>
              <p style={bodyText}>
                Our company reel — featured on the homepage — shows 25 years of unscripted
                production across paranormal, sports, lifestyle, crime, and food formats.
                Watch how genre signals, character moments, and network logos create an
                immediate sense of credibility and range.
              </p>
              {/*
                External link to YouTube — opens in new tab with proper rel attributes.
                Icon (▶) provides visual affordance; tooltip names the action per CLAUDE.md button rule.
                aria-label restates the action for screen readers; tooltip is aria-hidden.
              */}
              <span className="mye-tooltip-wrap">
                <a
                  href="https://www.youtube.com/watch?v=OjQMdG4ewxo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sizzle-cta-btn"
                  aria-label="Watch MY Entertainment sizzle reel on YouTube (opens new tab)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#e51d26',
                    color: '#fff',
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    borderRadius: 4,
                    padding: '10px 20px',
                    transition: 'opacity 150ms',
                  }}
                >
                  {/* Leading icon — video play affordance */}
                  <span aria-hidden="true">▶</span>
                  Watch Our Sizzle Reel
                </a>
                <span className="mye-tooltip" aria-hidden="true">
                  Watch on YouTube (new tab)
                </span>
              </span>
            </div>

            <p style={bodyText}>
              For additional examples, visit our{' '}
              <Link href="/reel" style={inlineLink}>
                Reel page
              </Link>{' '}
              where we showcase selected project trailers and promos, or browse{' '}
              <Link href="/shows" style={inlineLink}>
                our full show catalog
              </Link>{' '}
              to see how individual series were packaged and sold.
            </p>

            <p style={bodyText}>
              Want to discuss how we&apos;d approach a reel for your concept? See how we work on
              our{' '}
              <Link href="/tv-production-company" style={inlineLink}>
                production services page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — How MY Entertainment produces sizzle reels             */}
      {/* Converts the informational reader into a B2B lead. Explains the   */}
      {/* production process and implicitly answers "who do I hire?"        */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sizzle-prose">
            <h2 style={h2Style}>How MY Entertainment Produces Sizzle Reels</h2>
            <p style={bodyText}>
              We&apos;ve been packaging unscripted concepts for 25 years. Our sizzle reel process
              is built around one question: <em>what does this specific buyer need to see to say yes?</em>
            </p>

            {/* Process steps */}
            {[
              {
                step: 'Concept Analysis',
                body: 'We start by interrogating the concept: what\'s the core conflict, who are the characters, what network is the best fit, and what\'s the competitive landscape. This brief shapes every creative decision that follows.',
              },
              {
                step: 'Production Plan',
                body: 'Depending on your concept, we may recommend a field shoot, a tone reel assembled from archival footage, or a hybrid. We scope the budget to match the target network\'s expectations — a premium cable reel looks different from a digital-first pilot.',
              },
              {
                step: 'Shoot & Post',
                body: 'Our in-house production team handles shoot days, direction, and post-production. We write the structure, we cut to the music, and we craft the VO if needed. You don\'t need to bring an editor; we are the editors.',
              },
              {
                step: 'Pitch Integration',
                body: 'A sizzle reel works best alongside a tight one-page deck. We can help you build both — and pair them with our network relationships for the most direct path to a commissioning conversation.',
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
                {/* Step number circle */}
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
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — FAQ                                                     */}
      {/* FAQPage schema surfaces rich results in Google SERP. Text here     */}
      {/* must match faqSchema.mainEntity above word-for-word.              */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sizzle-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {/* Render each FAQ item — text MUST match JSON-LD above verbatim */}
            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div
                key={idx}
                className="sizzle-faq-item"
                // Schema-friendly: individual Q/A blocks
              >
                {/* Question — renders as visible H3 matching schema Question.name */}
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
                {/* Answer — text must match schema Answer.text verbatim */}
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — CTA: pitch services                                     */}
      {/* Converts reader into a B2B lead. Links to /contact and cross-links */}
      {/* the cluster pages to pass PageRank across the cluster.             */}
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
            Ready to Package Your Show?
          </h2>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 32,
              marginTop: 0,
              maxWidth: 560,
              margin: '0 auto 32px',
            }}
          >
            MY Entertainment has the production infrastructure, the network relationships, and the
            25 years of pitch experience to turn your concept into a sizzle reel that sells. Let&apos;s
            talk.
          </p>

          {/* Primary CTA — contact page. Visible text + icon + tooltip per CLAUDE.md rules. */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block' }}>
            <a
              href="/contact"
              className="sizzle-cta-btn"
              aria-label="Contact MY Entertainment to discuss your show pitch"
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
                marginBottom: 24,
              }}
            >
              {/* Leading icon — envelope/message affordance */}
              <span aria-hidden="true">✉</span>
              Pitch Your Show to MYE
            </a>
            <span className="mye-tooltip" aria-hidden="true">
              Open the MYE contact form
            </span>
          </span>

          {/* Cross-cluster navigation links */}
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
            <Link href="/tv-production-company" style={inlineLink}>
              Our Production Services
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
