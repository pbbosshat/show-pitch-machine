// ============================================================
// /how-to-sell-a-tv-show-idea — Transactional Money-Keyword Page
// Target keywords (seo/mye-pitch-money-2026-06-04):
//   "how to sell a tv show idea"  (vol ~80, KD ~8, CPC ~$90 — primary)
//   "sell a tv show"              (vol ~50, KD ~5              — H2)
//   "sell tv show idea"           (vol ~30, KD ~5              — H2/FAQ)
//   "pitch and sell a tv show"    (vol ~20                    — FAQ)
//   "tv show idea"                (vol 1,900, KD 2            — body/FAQ)
//
// Intent: creators who have a concept and want to understand the
// full commercial path — not just the pitch meeting, but the
// entire route from idea to commission deal. Higher transactional
// intent than "how to pitch" — the word "sell" signals the person
// wants to monetise, not just learn the process.
//
// Note: /how-to-pitch-a-tv-show covers the six-step pitch process.
// This page covers the commercial/business layer AROUND that pitch:
// packaging, rights, deal structures, what sells vs. what doesn't.
// Internal link mesh: pitch page, deck page, sizzle-reel, work-with-us.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens identical to the rest of the (public) cluster.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template
// so the exact money-keyword string appears in the <title> tag.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'How to Sell a TV Show Idea (2026): From Concept to Commission',
  },
  description:
    'Learn how to sell a TV show idea to networks and streamers in 2026. Covers what makes an idea sellable, how to package it, deal structures, rights ownership, and how MY Entertainment — a 25-year unscripted TV production company — helps creators sell their shows.',
  keywords: [
    'how to sell a tv show idea', 'sell a tv show', 'sell tv show idea',
    'pitch and sell a tv show', 'tv show idea', 'sell your tv show',
    'how to sell a show to netflix', 'how to sell a reality show idea',
    'tv show pitch and sell', 'unscripted tv show idea',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/how-to-sell-a-tv-show-idea' },
  openGraph: {
    title: 'How to Sell a TV Show Idea (2026): From Concept to Commission',
    description:
      'How to sell a TV show idea — what makes an idea sellable, how to package it, deal structures, rights, and how a production partner takes your concept to commission.',
    url: 'https://www.myentertainment.tv/how-to-sell-a-tv-show-idea',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Sell a TV Show Idea (2026): From Concept to Commission',
    description:
      'What makes a TV show idea sellable, how to package it, deal structures, and how MY Entertainment helps creators go from concept to commission.',
  },
};

// ------------------------------------------------------------
// Design tokens — identical across the B2B cluster so all
// pages feel like a unified content hub. #000 bg, #a5a7ad body,
// #f2f4f7 headings, #e51d26 accent. Roboto/Roboto Condensed/Oswald.
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
// FAQ data — single source for both visible text and JSON-LD.
// Targets "sell a tv show", "sell tv show idea", and deal/rights
// sub-queries that appear in GSC for this intent cluster.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'Can I sell a TV show idea without a production company?',
    a: 'In practice, no. Networks and streaming platforms do not buy ideas directly from individuals — they commission from production companies with whom they have established relationships, track records, and production agreements. An independent creator\'s path to selling a TV show idea runs through attaching a production partner who has those relationships. That partner submits the concept under their name, co-develops it, and shares in the commission deal.',
  },
  {
    q: 'How do you sell a TV show idea to Netflix?',
    a: 'Netflix does not accept unsolicited pitches directly from creators. To sell a TV show idea to Netflix, you need a production company that has an existing relationship with Netflix\'s unscripted development team, or a talent agent who has direct access. Your concept also needs to be genuinely global in appeal — Netflix\'s commissioning bar is higher than most cable buyers. MY Entertainment has relationships across major streaming platforms and can advise on whether a concept is a streaming-first or linear-first pitch.',
  },
  {
    q: 'How much money do you make selling a TV show idea?',
    a: 'Compensation for selling a TV show idea varies widely by deal structure. A typical arrangement for an independent creator partnering with a production company involves an "exec producer" or "created by" credit plus a negotiated backend fee or episodic royalty per episode produced. Development deals (pre-commission) typically pay a smaller upfront fee to cover pitch materials. Series commissions can generate six-figure to seven-figure total compensation over a full season run. Always use legal counsel to review deal terms — entertainment deals are complex.',
  },
  {
    q: 'What makes a TV show idea sellable?',
    a: 'A sellable TV show idea has four core properties: a specific, distinctive premise that can be stated in one sentence; a repeatable format that sustains 8–12 episodes per season; a clear, identifiable audience that is already watching shows on your target network; and a reason to exist now — a cultural moment, a trend, or a news hook that makes the concept urgent. Most ideas that fail to sell are not bad ideas — they are underdeveloped or mismatched to the wrong buyer.',
  },
  {
    q: 'Do I own my TV show idea if a network buys it?',
    a: 'Rights ownership depends entirely on the deal negotiated. Typically, a production company and the creator share "created by" and "exec producer" credits, and the network acquires a license to broadcast the show — not the underlying IP. However, development deals often include option clauses that give the network or production company the right to develop the concept for a defined period. IP rights, format rights, and distribution rights are all separable and negotiable. Entertainment lawyers specializing in TV deals are essential at this stage.',
  },
  {
    q: 'How long does it take to sell a TV show idea?',
    a: 'The timeline from initial pitch to commission varies from weeks to years. A fast-track pitch at the right network at the right time with a strong package can result in a development deal in 4–8 weeks. Most unscripted pitches take 3–12 months from first meeting to a formal development deal, then another 6–18 months from development deal to a series commission. Having an experienced production partner with existing buyer relationships compresses the timeline significantly.',
  },
  {
    q: 'Should I pitch to cable networks or streaming platforms first?',
    a: 'For most independent creators without an existing track record, cable networks (Discovery, A&E, Travel Channel, Bravo, Food Network, etc.) are a more accessible first target than major streaming platforms. Cable buyers typically commission more volume, have well-defined genre expectations, and are more open to concepts from production companies with partial track records. Streaming platforms tend to commission from established producers with proven formats. Start where the match is best — not where the prestige is highest.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — Article + FAQPage
// Article signals this is expert editorial content on a money keyword.
// FAQPage enables rich result sitelinks in SERP for sell/rights queries.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Sell a TV Show Idea (2026): From Concept to Commission',
  description:
    'What makes a TV show idea sellable, how to package it, deal structures, rights ownership, and how a production partner helps creators sell.',
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
    '@id': 'https://www.myentertainment.tv/how-to-sell-a-tv-show-idea',
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

// BreadcrumbList — SERP breadcrumb trail for this transactional page.
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
      name: 'How to Sell a TV Show Idea',
      item: 'https://www.myentertainment.tv/how-to-sell-a-tv-show-idea',
    },
  ],
};

// The four "sellability" factors — used in both Section 3 prose and structured output.
const SELLABILITY_FACTORS = [
  {
    label: 'Specific, Stated-in-One-Sentence Premise',
    body: 'If you need two sentences to explain your show, the concept is not fully formed yet. The one-sentence test is not a formatting exercise — it is a clarity test. "A paranormal investigation team explores the most haunted locations in North America" is sellable. "An interesting show about ghosts and history and people\'s experiences" is not.',
  },
  {
    label: 'Repeatable Format',
    body: 'Networks commission series, not one-off specials. A sellable idea must generate 8–12 episodes per season without the format collapsing. The question every commissioning editor asks: "Where does this go after episode four?" If the answer requires a unique, non-reproducible setup each time, the format is not repeatable enough.',
  },
  {
    label: 'Identifiable Audience Already Watching Comps',
    body: 'Your idea needs a home — a specific network whose current audience will watch your show. The commissioning editor\'s job is to serve their existing viewers, not build a new audience from scratch. The strongest pitch comes with concrete evidence: "This show is for the 35–54 female audience currently watching X on your network, and it extends that franchise into Y."',
  },
  {
    label: 'A Reason to Exist Right Now',
    body: 'Networks program 12–18 months ahead of air. Your pitch needs to answer "why now?" — not why this is a timeless concept, but what cultural moment, news cycle, or trend makes this the right show for today\'s commissioning window. A concept that could have been pitched five years ago and could wait five more years is a concept without urgency.',
  },
];

// Deal structure types — used in Section 5 (Rights & Deals)
const DEAL_TYPES = [
  {
    label: 'Development Deal',
    body: 'The first commercial milestone after a successful pitch meeting. A development deal is an agreement for the network or production company to fund the development of a concept — typically into pilot materials, a format bible, and additional pitch assets. Development deals pay a fee and include option clauses on the creator\'s IP.',
  },
  {
    label: 'Pilot Commission',
    body: 'An order to produce a pilot episode. Not all shows get a pilot commission — some go straight to series — but a pilot is common for concepts where the network wants to see the format in action before committing to a full run. The pilot is produced at the network\'s cost; if the pilot performs, a series commission follows.',
  },
  {
    label: 'Series Commission',
    body: 'The end goal: an order for a full season of episodes. Series commissions typically specify episode count, episode length, delivery schedule, and rights grant. The rights grant determines what the network can do with the show — broadcast territory, digital rights, international licensing, and duration are all negotiable.',
  },
  {
    label: '"Created By" Credit & Backend Participation',
    body: 'For independent creators who bring an original idea, the most important contractual protections are the "created by" credit and backend participation. The credit signals ongoing creative authorship and can affect format rights if the show is adapted internationally. Backend participation gives the creator a share of profits from licensing, formats sales, and derivatives.',
  },
];

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function HowToSellATVShowIdeaPage() {
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

      {/* Responsive and utility styles — matches cluster-wide CSS pattern */}
      <style>{`
        .sell-prose { max-width: 780px; margin: 0 auto; }
        .sell-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        @media (max-width: 640px) {
          .sell-grid-2 { grid-template-columns: 1fr; }
        }
        .sell-faq-item + .sell-faq-item { margin-top: 28px; }
        /* CTA hover state — opacity shift matches Webflow hover token */
        .sell-cta-btn:hover, .sell-cta-btn:focus-visible { opacity: 0.85; }
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
      {/* Single H1 — "sell a tv show idea" keyword in subtitle.              */}
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
        {/* Eyebrow — "Pitch Playbook" positions this as educational/top-of-funnel support.
            Producers who already HAVE a show and need distribution should be routed to
            /tv-distribution-company (the commercial spine) or /pitch (submission). */}
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

        {/* H1 — keyword "sell a tv show idea" present in text */}
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
          How to Sell a TV Show Idea in 2026
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
          A commercial guide from a production company that has sold unscripted shows to
          Discovery, PBS, A&amp;E, Max, and 28+ other networks — covering what makes an idea
          sellable, how to package it, deal structures, rights ownership, and the fastest
          path from concept to commission.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — Sell vs. Pitch: the distinction                          */}
      {/* Establishes the page's unique angle vs /how-to-pitch-a-tv-show.    */}
      {/* Cross-links to pitch page for readers who need the step-by-step.  */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sell-prose">
            <h2 style={h2Style}>Pitching vs. Selling: What&apos;s the Difference?</h2>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>Pitching</strong> is the act of presenting
              your concept to a buyer — the meeting, the deck, the sizzle reel. Our guide on{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                how to pitch a TV show
              </Link>{' '}
              covers the step-by-step process.
            </p>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>Selling a TV show idea</strong> is the
              broader commercial process: knowing whether your idea is sellable before you
              pitch it, packaging it to maximize its appeal, navigating the deal structures
              that govern who owns what, and building the right production partnership to get
              it in front of the right buyer at the right time.
            </p>
            <p style={bodyText}>
              Most creators who struggle to sell a TV show idea don&apos;t have a pitching
              problem — they have a packaging or targeting problem. The pitch is the tip of the
              spear. Everything behind it determines whether you get a deal.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2b — Distribution path callout (re-point 2026-06-04)       */}
      {/* Audience split: readers who HAVE a finished show are producer-      */}
      {/* seekers who should go to /tv-distribution-company → /pitch.        */}
      {/* Readers still developing should continue reading this page.        */}
      {/* This callout captures the distribution-intent segment mid-funnel.  */}
      {/* ================================================================== */}
      <section
        style={{
          background: '#0a0a0a',
          padding: '32px 20px',
          borderTop: '1px solid #1a1a1a',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <div style={container}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
              alignItems: 'center',
              justifyContent: 'space-between',
              maxWidth: 780,
              margin: '0 auto',
            }}
          >
            <div style={{ flex: '1 1 300px' }}>
              {/* Flag this as a routing callout, not content */}
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
                Already have a finished show?
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
                If you have a completed or near-completed unscripted show and need a{' '}
                <Link href="/tv-distribution-company" style={inlineLink}>
                  TV distribution company
                </Link>
                , skip to our distribution page — or go directly to the{' '}
                <Link href="/pitch" style={inlineLink}>
                  show submission form
                </Link>
                .
              </p>
            </div>
            <a
              href="/pitch"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#e51d26',
                color: '#fff',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 4,
                padding: '10px 22px',
                flexShrink: 0,
                transition: 'opacity 150ms',
              }}
            >
              Submit Your Show →
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — What makes an idea sellable                             */}
      {/* The substantive editorial core of the page. Factual, expert-voice. */}
      {/* Four factors derived from MYE's 25-year pitch history.             */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            What Makes a TV Show Idea Sellable?
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            After 25 years of buying, developing, and pitching unscripted concepts, these
            are the four properties that separate the ideas that sell from the ideas that don&apos;t.
          </p>

          {/* Sellability factor grid — 2 columns desktop, 1 mobile */}
          <div className="sell-grid-2">
            {SELLABILITY_FACTORS.map(({ label, body }, i) => (
              <div
                key={i}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderLeft: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '20px 20px 20px 18px',
                }}
              >
                {/* Factor number — Oswald bold, red accent */}
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
                  0{i + 1}
                </p>
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
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — The packaging stack                                      */}
      {/* Explains the three-layer pitch package (deck + reel + partner)     */}
      {/* and why each is necessary to sell (not just pitch).                */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sell-prose">
            <h2 style={h2Style}>The Packaging Stack: What You Need to Sell</h2>
            <p style={bodyText}>
              Selling a TV show idea requires a complete pitch package. Each element of the
              package serves a different function in the buyer&apos;s decision process:
            </p>

            {/* Three-layer packaging breakdown — left-border accent */}
            {[
              {
                label: 'The Pitch Deck',
                body: (
                  <>
                    A 10–15 slide presentation covering logline, show format, characters/talent,
                    episode arc, target audience, competitive landscape, and production team. The
                    deck is the written case for your show — what it is, who it&apos;s for, and why your
                    team can deliver it. Download our{' '}
                    <Link href="/tv-show-pitch-deck" style={inlineLink}>
                      free TV show pitch deck template
                    </Link>{' '}
                    to build yours.
                  </>
                ),
              },
              {
                label: 'The Sizzle Reel',
                body: (
                  <>
                    A 2–4 minute video that shows — not tells — what your show will feel like. The
                    deck explains; the{' '}
                    <Link href="/sizzle-reel" style={inlineLink}>
                      sizzle reel
                    </Link>{' '}
                    demonstrates. In today&apos;s pitch environment, a deck-only package is
                    significantly under-armed. The reel is often the single element that converts
                    an interested buyer into a development deal.
                  </>
                ),
              },
              {
                label: 'The Production Partner',
                body: (
                  <>
                    Networks commission through production companies, not from individual creators.
                    Your production partner co-develops the concept, submits the package under
                    their name, and brings network access your idea alone can&apos;t have. A partner
                    like{' '}
                    <Link href="/tv-production-company" style={inlineLink}>
                      MY Entertainment
                    </Link>{' '}
                    transforms your concept from a creative idea into a commission-ready project.
                  </>
                ),
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
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — Rights & Deal Structures                                 */}
      {/* Addresses the "rights ownership" search intent in the "sell"        */}
      {/* keyword cluster. Factual, legally accurate, advises legal counsel. */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sell-prose">
            <h2 style={h2Style}>Rights &amp; Deal Structures When You Sell a TV Show</h2>
            <p style={bodyText}>
              Understanding what you&apos;re selling — and what you&apos;re keeping — is as important
              as the pitch itself. TV deals involve several layers of rights that are independently
              negotiable. Always work with entertainment legal counsel before signing any agreement.
            </p>

            {/* Four deal structure types — card list */}
            {DEAL_TYPES.map(({ label, body }) => (
              <div
                key={label}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    ...h3Style,
                    color: '#f2f4f7',
                    textTransform: 'none' as const,
                    letterSpacing: 0,
                  }}
                >
                  {label}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}

            <p style={bodyText}>
              At MY Entertainment, we structure partnerships transparently — creators retain
              their &quot;created by&quot; credit and are involved throughout the development and
              production process, not just at the pitch stage. If you have questions about
              what a production partnership looks like in practice,{' '}
              <Link href="/work-with-us" style={inlineLink}>
                reach out →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — Sell a Reality Show / Unscripted Show (sub-intent)       */}
      {/* Targets "sell a reality show idea" and "sell an unscripted show"    */}
      {/* sub-queries. Also strengthens the unscripted-specific expertise     */}
      {/* signal for both SEO and GEO (AI engine citation).                  */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sell-prose">
            <h2 style={h2Style}>Selling an Unscripted or Reality TV Show Idea</h2>
            <p style={bodyText}>
              MY Entertainment specializes in unscripted and reality television — the format where
              independent creators have the most realistic path to selling a show. Here is why
              unscripted is more accessible than scripted for first-time sellers:
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
              {[
                {
                  point: 'Lower upfront production cost',
                  detail: 'Unscripted shows require a sizzle reel and a pitch deck — not a pilot script, a writers\' room, or a cast of named actors. The barrier to a production-quality pitch package is significantly lower.',
                },
                {
                  point: 'Format is the IP',
                  detail: 'In unscripted TV, the format itself is valuable intellectual property. The same format has sold in dozens of territories (think The Voice, MasterChef, Big Brother). A strong unscripted format can generate recurring licensing revenue beyond the original commission.',
                },
                {
                  point: 'Cable networks buy volume',
                  detail: 'A typical cable network commissions dozens of unscripted series per year across their portfolio. That volume means more pitches get greenlit compared to scripted drama, where networks commission single-digit slate counts annually.',
                },
                {
                  point: 'Character access matters more than star power',
                  detail: 'Unscripted shows succeed on the strength of real, specific, compelling characters — not A-list talent. A creator with access to a compelling person or world has a natural advantage that no amount of scripted polish can replicate.',
                },
              ].map(({ point, detail }) => (
                <li key={point} style={{ marginBottom: 14 }}>
                  <strong style={{ color: '#f2f4f7' }}>{point}.</strong>{' '}
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — FAQ                                                     */}
      {/* FAQPage schema enables rich results for sell/rights sub-queries.  */}
      {/* Text matches faqSchema.mainEntity verbatim.                        */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="sell-prose">
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
                {/* Answer text matches faqSchema.mainEntity[idx].acceptedAnswer.text verbatim */}
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — CTA                                                     */}
      {/* Converts research-intent reader into a B2B partnership lead.      */}
      {/* Cluster cross-links pass PageRank back to the pillar pages.       */}
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
            Have a TV Show Idea Worth Selling?
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
            MY Entertainment has been selling unscripted TV concepts for 25 years. If you have a
            real idea, real characters, and a concept that passes the sellability test above —
            reach out. We&apos;ll tell you honestly whether it&apos;s ready to pitch.
          </p>

          {/* Primary CTA — contact page */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/contact"
              className="sell-cta-btn"
              aria-label="Contact MY Entertainment to discuss your TV show idea"
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
              Submit Your TV Show Idea
            </a>
            <span className="mye-tooltip" aria-hidden="true">
              Open the MYE contact form
            </span>
          </span>

          {/* Distribution path link — the commercial spine for producers with content */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 24,
              marginBottom: 8,
            }}
          >
            <strong style={{ color: '#f2f4f7' }}>Have a finished show?</strong>{' '}
            <Link href="/tv-distribution-company" style={inlineLink}>
              Learn about TV distribution →
            </Link>
          </p>

          {/* Cluster cross-links — full internal link mesh */}
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
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Free Pitch Deck Template
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
