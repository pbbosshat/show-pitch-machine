// ============================================================
// /how-to-pitch-a-tv-show — B2B Pitch Pillar Page
// Target keywords (updated 2026-05-27, seo/scale-mye):
//   "how to pitch a tv show"   (vol 350, KD 0  — primary; near-zero KD)
//   "how to sell a tv show idea" (vol ~80, KD ~8 — transactional; H2)
//   "pitch a tv show idea"     (vol ~60, KD ~5  — FAQ variant)
//   "documentary series pitch" (vol 0   — genre H2 for catalog depth)
//   "true crime tv pitch"      (vol 0   — genre H2; Ghost Adventures catalog)
//   "paranormal tv show pitch" (vol 0   — genre H2; GEO/LLM visibility)
//
// Intent: showrunners, writers, and IP holders who want to sell
// a concept to a network or streaming service. This page educates
// and then routes readers to the template page and contact form.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens mirror the Webflow source exactly.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses the root template so the
// exact money-keyword title string is preserved in the <title>.
// Updated: description now includes "sell a tv show idea" variant.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'How to Pitch a TV Show (2026): Step-by-Step + Free Pitch Deck Template',
  },
  description:
    'Learn how to pitch a TV show — and how to sell a TV show idea to networks and streamers in 2026. Step-by-step process, pitch deck structure, sizzle reel role, who buys, common mistakes, and a free TV show pitch deck template from MY Entertainment.',
  keywords: [
    'how to pitch a tv show', 'how to sell a tv show idea', 'pitch a tv show idea',
    'tv show pitch', 'pitch a tv show', 'tv show pitch deck',
    'tv pitch template', 'how to pitch to a network', 'tv show pitch process',
    'documentary series pitch', 'true crime tv pitch', 'paranormal tv show pitch',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/how-to-pitch-a-tv-show' },
  openGraph: {
    title: 'How to Pitch a TV Show (2026): Step-by-Step + Free Pitch Deck Template',
    description:
      'Learn how to pitch a TV show — and how to sell a TV show idea — to networks and streamers in 2026. Step-by-step process, pitch deck structure, sizzle reel role, who buys, and a free pitch deck template from MY Entertainment.',
    url: 'https://www.myentertainment.tv/how-to-pitch-a-tv-show',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Pitch a TV Show (2026): Step-by-Step + Free Pitch Deck Template',
    description:
      'Step-by-step guide to pitching a TV show and selling a TV show idea — pitch deck structure, sizzle reel role, who buys, common mistakes, and a free template from MY Entertainment.',
  },
};

// ------------------------------------------------------------
// Design token constants — identical to the rest of the public
// site so the page integrates seamlessly into the Webflow clone.
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
// FAQ data — single source of truth for both on-page text and
// FAQPage JSON-LD schema. Any edit here propagates to both.
//
// Extended (2026-05-27, seo/scale-mye): added "how to sell a tv
// show idea", "pitch a tv show idea", and genre-specific FAQ items.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'Do I need an agent to pitch a TV show?',
    a: 'Not necessarily. While agents and managers provide access to network buyers, a well-packaged pitch with a strong production partner — like MY Entertainment — can substitute that access. Production companies with established network relationships can bring your concept directly to the right commissioning editor.',
  },
  {
    q: 'How do you sell a TV show idea?',
    a: 'To sell a TV show idea, you need to package it into a pitch-ready format: a one-sentence logline, a 10–15 slide pitch deck, and ideally a 2–4 minute sizzle reel. Then you need access to the right buyer — which in practice means partnering with a production company that has existing relationships at your target network. Cold submissions to network development inboxes are rarely reviewed. MY Entertainment evaluates unscripted concepts from independent creators and brings qualified pitches to commissioning editors we have sold to.',
  },
  {
    q: 'How do you pitch a TV show idea to a network?',
    a: 'To pitch a TV show idea, first define the concept clearly enough to state in one sentence, then build a pitch deck and sizzle reel, then get a production partner to submit the package to their network contacts. You cannot walk into a network meeting without a production company attached — networks commission through trusted production relationships, not from individual creators directly. The pitch meeting itself is typically 30–45 minutes: under 10 minutes of verbal pitch, followed by a showing of the sizzle reel and a Q&A.',
  },
  {
    q: 'How long should a TV show pitch be?',
    a: 'A pitch meeting typically runs 30–45 minutes. Your verbal pitch should be under 10 minutes, leaving the rest for conversation. Your pitch deck should be 10–15 slides. Your sizzle reel should be 2–4 minutes. Less is more — buyers fill in the details with follow-up questions.',
  },
  {
    q: 'What do TV networks look for in a pitch?',
    a: 'Networks look for: a clear, distinctive premise (not derivative); a specific, passionate audience; repeatable conflict or format structure; network fit (does this show live on our channel?); and a team capable of delivering. The sizzle reel is your proof on the last point.',
  },
  {
    q: 'How long does it take to sell a TV show?',
    a: 'The pitch-to-commission timeline varies widely. A fast-moving pitch at the right time can result in a development deal in weeks. Most unscripted pitches take 3–12 months from first meeting to greenlight — sometimes longer. Having an experienced production partner accelerates the process significantly.',
  },
  {
    q: 'What is the difference between a pitch deck and a treatment?',
    a: 'A pitch deck is a presentation-format document (slides) designed for the pitch meeting itself — visual, concise, scannable. A treatment is a longer written document (3–20 pages) that details the show format, episode structure, and character arcs. Both are often requested; the deck comes first.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — HowTo + FAQPage
// HowTo targets Google\'s rich result for step-by-step guides
// (common for "how to" queries). FAQ targets the FAQ rich result.
// Both are on the same page — Google supports multiple schema types.
// ------------------------------------------------------------
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Pitch a TV Show',
  description:
    'A step-by-step guide to pitching an unscripted TV show concept to networks and streaming services.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Define your concept and target network',
      text: 'Clarify the one-line premise, the repeatable format, and the audience. Then identify which network or streamer is the best fit — this shapes every other decision.',
      position: 1,
    },
    {
      '@type': 'HowToStep',
      name: 'Build your pitch deck',
      text: 'Create a 10–15 slide deck covering: logline, show format, episode structure, target audience, competitive landscape, talent/host, and production team credentials.',
      position: 2,
    },
    {
      '@type': 'HowToStep',
      name: 'Produce a sizzle reel',
      text: 'Shoot or assemble a 2–4 minute sizzle reel that shows tone, characters, and conflict. This is the single most persuasive element of a modern TV pitch.',
      position: 3,
    },
    {
      '@type': 'HowToStep',
      name: 'Attach a production partner',
      text: 'Partner with a production company that has existing network relationships. They will submit the package under their name and co-develop the show through to commission.',
      position: 4,
    },
    {
      '@type': 'HowToStep',
      name: 'Submit and pitch',
      text: 'Submit your package to network development executives — ideally through your production partner\'s relationships. Follow up within two weeks if you don\'t hear back.',
      position: 5,
    },
    {
      '@type': 'HowToStep',
      name: 'Negotiate the development deal',
      text: 'If a network is interested, they will offer a development deal — funding to develop the concept further, often into a pilot or additional materials. Work with a lawyer or manager to review the terms.',
      position: 6,
    },
  ],
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

// Pitch deck slide structure — used in both the prose and the
// cross-link to /tv-show-pitch-deck. Defined once here.
const DECK_SLIDES = [
  { num: '01', title: 'Title & Logline', body: 'One sentence. What is the show, who is it about, and what is the stakes? If you can\'t say it in one sentence, you don\'t know it yet.' },
  { num: '02', title: 'The Hook', body: 'Why now? Why this network? What\'s the cultural moment this show is riding?' },
  { num: '03', title: 'Show Format', body: 'Episode count, episode length, format structure (episodic vs. serialized), and whether it\'s single-location or roaming.' },
  { num: '04', title: 'Characters / Talent', body: 'Who are the people at the center of the story? Include photos, bio bullets, and — critically — why they are irresistible on camera.' },
  { num: '05', title: 'Episode Arc', body: 'Briefly map 3–5 sample episodes or the season arc. Show that the format generates repeatable content.' },
  { num: '06', title: 'Target Audience', body: 'Demographics, psychographics, and comp shows. Who is already watching something like this, and where?' },
  { num: '07', title: 'Competitive Landscape', body: 'What shows are most similar? How is yours different? Be honest — buyers already know the space.' },
  { num: '08', title: 'Production Team', body: 'Credentials of the production company and key creative personnel. This is where partnering with an experienced prodco pays off.' },
];

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function HowToPitchATVShowPage() {
  return (
    <div style={{ background: '#000' }}>
      {/* ── Schema markup ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Responsive styles — prose column, step layout, deck grid */}
      <style>{`
        .pitch-prose { max-width: 780px; margin: 0 auto; }
        .pitch-deck-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        @media (max-width: 640px) {
          .pitch-deck-grid { grid-template-columns: 1fr; }
        }
        .pitch-step { display: flex; gap: 20px; margin-bottom: 32px; align-items: flex-start; }
        .pitch-step:last-child { margin-bottom: 0; }
        .pitch-faq-item + .pitch-faq-item { margin-top: 28px; }
        /* CTA hover/focus */
        .pitch-cta-btn:hover, .pitch-cta-btn:focus-visible { opacity: 0.85; }
        /* Tooltip system — matches /sizzle-reel and other cluster pages */
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
      {/* paddingTop 100px clears the fixed navbar.                          */}
      {/* Single H1 — keyword "how to pitch a tv show" present in subtitle.  */}
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
        {/* Eyebrow label — Webflow Roboto Condensed uppercase */}
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

        {/* H1 — one per page; "pitch a tv show" keyword included */}
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
          How to Pitch a TV Show in 2026
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
          A step-by-step guide from a production company that has sold unscripted shows
          to Discovery, PBS, A&amp;E, Max, and 28+ other networks — covering the pitch process,
          deck structure,{' '}
          <Link href="/sizzle-reel" style={inlineLink}>sizzle reel</Link> role, who buys,
          common mistakes, and a free pitch deck template.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — The pitch process (HowTo steps)                         */}
      {/* Targets the HowTo rich result. Steps mirror howToSchema above.    */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>The TV Show Pitch Process, Step by Step</h2>
            <p style={bodyText}>
              Pitching a TV show is a multi-stage process that rewards preparation. Here is
              how it works in practice — from the first idea to the first network meeting —
              based on 25 years of pitching at MY Entertainment.
            </p>

            {/* Steps — mirrors howToSchema.step */}
            {[
              {
                n: 1,
                title: 'Define Your Concept and Target Network',
                body: 'Clarity before anything else. Can you state the show in one sentence? If not, keep working. Then identify your target network or streamer — not "every network," one specific buyer. The pitch changes completely based on whether you\'re going to Travel Channel, Bravo, or PBS.',
              },
              {
                n: 2,
                title: 'Build Your Pitch Deck',
                body: 'A pitch deck is a 10–15 slide presentation you\'ll walk through in the meeting. It covers logline, format, characters, episode structure, target audience, competitive shows, and production team. See our full deck structure below — or download the free template.',
              },
              {
                n: 3,
                title: 'Produce a Sizzle Reel',
                body: 'In today\'s pitch environment, a written deck alone is under-armed. A 2–4 minute sizzle reel shows the buyer the tone, the characters, and the production quality before a single episode is shot. It is the most persuasive element of a modern pitch package.',
              },
              {
                n: 4,
                title: 'Attach a Production Partner',
                body: 'Unless you already have a producing track record and direct buyer relationships, your fastest path to a network meeting is through a production company. A partner like MY Entertainment brings network access, production infrastructure, and credibility to the table.',
              },
              {
                n: 5,
                title: 'Submit and Pitch',
                body: 'Your production partner submits the package to development executives at the target network. A good submission is targeted — the right buyer at the right time, not a mass blast. Follow up within two weeks if you haven\'t heard back.',
              },
              {
                n: 6,
                title: 'Negotiate the Development Deal',
                body: 'If a network is interested, they will offer a development deal — funding to develop the concept further, often into a pilot episode or additional materials. Always have legal counsel review the terms. Development deals typically include option periods on your IP.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="pitch-step">
                {/* Step number — red circle, Oswald bold */}
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
                  <h3 style={{ ...h3Style, color: '#f2f4f7', textTransform: 'none' as const, fontSize: 16, letterSpacing: 0 }}>
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
      {/* SECTION 3 — Pitch deck structure                                     */}
      {/* Answers "what goes in a TV show pitch deck" — cross-links to the   */}
      {/* /tv-show-pitch-deck template page for the full download CTA.       */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2
            style={{
              ...h2Style,
              textAlign: 'center',
            }}
          >
            TV Show Pitch Deck Structure
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            Every strong pitch deck hits these eight sections — in roughly this order. Skip
            one and buyers feel it, even if they can&apos;t articulate why.
          </p>

          {/* Deck slide grid */}
          <div className="pitch-deck-grid">
            {DECK_SLIDES.map(({ num, title, body }) => (
              <div
                key={num}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '20px',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 32,
                    fontWeight: 600,
                    color: '#e51d26',
                    margin: '0 0 8px',
                    lineHeight: 1,
                  }}
                >
                  {num}
                </p>
                <h3 style={{ ...h3Style, color: '#f2f4f7', textTransform: 'none' as const, letterSpacing: 0 }}>
                  {title}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Cross-link to template page */}
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              marginTop: 32,
              marginBottom: 0,
            }}
          >
            Want the full template with slide-by-slide guidance?{' '}
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Download the free TV show pitch deck template →
            </Link>
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Role of the sizzle reel                                 */}
      {/* Internal link to /sizzle-reel passes PageRank to the flagship page */}
      {/* and gives readers who landed on this pillar a clear next step.     */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>Where the Sizzle Reel Fits In</h2>
            <p style={bodyText}>
              The{' '}
              <Link href="/sizzle-reel" style={inlineLink}>
                sizzle reel
              </Link>{' '}
              is the most underestimated element of a TV pitch — and the one that most
              independent creators skip because they assume it&apos;s too expensive to produce
              before a deal exists.
            </p>
            <p style={bodyText}>
              That instinct is backwards. The reel is what generates the deal. It is the
              only element of your pitch package that shows — rather than tells — the buyer
              what the finished show will feel like. A pitch deck asks the executive to
              imagine; a sizzle reel does the imagining for them.
            </p>
            <p style={bodyText}>
              At MY Entertainment, we produce sizzle reels as part of the pitch development
              process — aligned to the specific network, the specific buyer, and the specific
              creative brief. The reel and the deck are built as a system, not as separate
              deliverables. Read more about{' '}
              <Link href="/sizzle-reel" style={inlineLink}>
                how we produce sizzle reels that sell
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — Who buys (network landscape)                            */}
      {/* Answers "who do I pitch my TV show to" — informs the reader about  */}
      {/* the buyer landscape and positions MYE as the gateway.             */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>Who Buys Unscripted TV Shows</h2>
            <p style={bodyText}>
              The unscripted TV market is served by three tiers of buyers:
            </p>

            {/* Three-tier buyer breakdown */}
            {[
              {
                label: 'Broadcast Networks',
                body: 'ABC, NBC, CBS, Fox, and PBS commission large-audience unscripted content — competition shows, documentaries, and lifestyle programming. Entry bar is high; concepts need demonstrated mass appeal and a proven production team.',
              },
              {
                label: 'Cable & Specialty Channels',
                body: 'Discovery, Travel Channel, A&E, Bravo, Food Network, HGTV, Oxygen, ID, and their sister channels are the most active buyers of genre unscripted. They buy volume (multiple series per year) and have well-defined audience profiles. This is where most independent producers have their first win.',
              },
              {
                label: 'Streaming Platforms',
                body: 'Netflix, Max, Peacock, Hulu, Paramount+, and Apple TV+ all commission original unscripted content — but their requirements, deal structures, and creative expectations differ significantly from linear TV. Streaming deals often require worldwide rights.',
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
              MY Entertainment has active relationships with buyers across all three tiers,
              built over 25 years of selling shows. When you partner with us, your concept
              goes to the right buyer — not a cold submission inbox.{' '}
              <Link href="/tv-production-company" style={inlineLink}>
                Learn more about how we work →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — Common mistakes                                          */}
      {/* High-value informational content that earns dwell time and          */}
      {/* demonstrates MYE's expertise from a buyer's-eye-view.              */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>Common Pitch Mistakes (and How to Avoid Them)</h2>
            <p style={bodyText}>
              After 25 years of pitching — and hearing pitches from independent creators —
              these are the mistakes we see most often:
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
                { mistake: 'Pitching to every network simultaneously', fix: 'Tailor each pitch to a specific buyer. A Travel Channel pitch and a Bravo pitch are fundamentally different documents.' },
                { mistake: 'Leading with the backstory, not the hook', fix: 'Buyers decide in the first 90 seconds. Lead with the most compelling, sellable element — not your personal journey to the idea.' },
                { mistake: 'No sizzle reel', fix: 'A deck-only pitch in 2026 is under-armed. Even a simple tone reel dramatically increases conversion rates in pitch meetings.' },
                { mistake: 'Underdeveloped characters', fix: 'Networks buy people, not premises. If you can\'t describe your main character\'s specific conflict and why audiences will root for them, the pitch isn\'t ready.' },
                { mistake: 'No production partner', fix: 'Going in without a prodco signals that you don\'t understand how TV gets made. A production partner provides access, credibility, and infrastructure.' },
                { mistake: 'Weak comp shows', fix: 'Saying "it\'s like Ghost Adventures meets Survivor" is fine — but make sure your comps are realistic and recent. Using a 15-year-old show as a comp tells the buyer you\'re out of touch with the current market.' },
              ].map(({ mistake, fix }) => (
                <li key={mistake} style={{ marginBottom: 14 }}>
                  <strong style={{ color: '#f2f4f7' }}>{mistake}.</strong>{' '}
                  <em style={{ color: '#a5a7ad' }}>{fix}</em>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — Template download CTA                                   */}
      {/* Drives readers to /tv-show-pitch-deck for the lead-magnet asset.  */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div
            style={{
              maxWidth: 780,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 300px' }}>
              <h2 style={{ ...h2Style, marginBottom: 12 }}>
                Free TV Show Pitch Deck Template
              </h2>
              <p style={{ ...bodyText, marginBottom: 20 }}>
                We&apos;ve distilled our 25-year pitch playbook into a free, structured
                pitch deck template — eight slides, with guidance on what to write in each
                section. Download it and have a pitch-ready document in a day.
              </p>
              {/* Primary CTA — leads to /tv-show-pitch-deck */}
              <span className="mye-tooltip-wrap">
                <Link
                  href="/tv-show-pitch-deck"
                  className="pitch-cta-btn"
                  aria-label="Download the free TV show pitch deck template"
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
                    padding: '12px 24px',
                    transition: 'opacity 150ms',
                  }}
                >
                  {/* Leading icon — download affordance */}
                  <span aria-hidden="true">↓</span>
                  Get the Free Template
                </Link>
                <span className="mye-tooltip" aria-hidden="true">
                  Open the pitch deck template page
                </span>
              </span>
            </div>
            {/* Right column — decorative stat block */}
            <div
              style={{
                flex: '0 1 200px',
                textAlign: 'center',
                padding: '24px',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
                background: '#000',
              }}
            >
              <p
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#e51d26',
                  margin: '0 0 4px',
                  lineHeight: 1,
                }}
              >
                25+
              </p>
              <p style={{ ...bodyText, marginBottom: 8, fontSize: 13 }}>
                years selling unscripted TV
              </p>
              <p
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#e51d26',
                  margin: '16px 0 4px',
                  lineHeight: 1,
                }}
              >
                28+
              </p>
              <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>
                network relationships
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7b — How to Sell a TV Show Idea (transactional H2)         */}
      {/* Targets "how to sell a tv show idea" (vol ~80, KD ~8).            */}
      {/* "Sell" modifier signals stronger transactional intent than "pitch" */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>How to Sell a TV Show Idea</h2>
            <p style={bodyText}>
              Pitching and selling are two different things. Pitching is the presentation;{' '}
              <strong style={{ color: '#f2f4f7' }}>selling a TV show idea</strong> is the full process
              from concept to commission — including everything that happens after the pitch meeting.
            </p>
            <p style={bodyText}>
              To sell a TV show idea in 2026:
            </p>
            <ol
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
                <strong style={{ color: '#f2f4f7' }}>Package the concept.</strong> A logline, a pitch
                deck, and a sizzle reel. The idea alone is not sellable — the packaged form is.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Attach a production partner.</strong> Networks
                do not buy from individuals — they commission from production companies. A partner
                like MY Entertainment transforms your idea from a creative concept into a commission-ready
                project.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Target the right buyer at the right time.</strong>{' '}
                Selling means knowing which network is actively looking for the genre you&apos;re pitching,
                who the commissioning editor is, and what slot needs to be filled. Your production
                partner has this intelligence.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Survive the development process.</strong> Most
                pitches that sell go through a development deal phase — additional material, format
                revisions, and sometimes a pilot — before a series commission. Patience and a strong
                partner relationship are non-negotiable.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>Negotiate the deal.</strong> A series commission
                involves rights agreements, production agreements, and on-screen credits. Always use
                legal counsel.
              </li>
            </ol>
            <p style={bodyText}>
              MY Entertainment has been selling unscripted TV show ideas for 25 years — from the initial
              pitch concept through to broadcast. If you have a strong unscripted idea and want to understand
              whether it&apos;s sellable,{' '}
              <Link href="/work-with-us" style={inlineLink}>reach out →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7c — Genre-Specific Pitch H2s                              */}
      {/* Targets "documentary series pitch", "true crime tv pitch",         */}
      {/* "paranormal tv show pitch" — genre H2s per spec.                  */}
      {/* Low/zero volume but correct ICP terms for GEO/LLM visibility.    */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>Pitching by Genre: What Changes, What Stays the Same</h2>
            <p style={bodyText}>
              The six-step pitch process above applies to every unscripted format. What changes by
              genre is the buyer, the tone, and what you lead with. Here is how the pitch changes
              for three of MY Entertainment&apos;s core genres:
            </p>

            {/* Three genre pitch blocks — left-border accent */}
            {[
              {
                label: 'Documentary Series Pitch',
                body: 'A documentary series pitch leads with subject matter expertise and access. The buyer wants to know: why this story, why now, and why are you the team to tell it? Comp shows (recent documentary series on PBS, Max, Netflix) are critical. The sizzle reel for a documentary series should show real access — real subjects talking, real moments captured. MY Entertainment has developed and sold documentary series to PBS, including Emmy-nominated Legacy List.',
              },
              {
                label: 'True Crime TV Pitch',
                body: 'A true crime TV pitch succeeds on access and exclusivity. The commissioning editor\'s first question is: what do you have that no one else has? Unique access to investigators, families, case files, or new evidence is the hook. True crime buyers include Investigation Discovery (ID), Oxygen, A&E, and Peacock. Comp shows need to be current — the true crime space moves fast. MY Entertainment has produced true crime content for ID (Sin City Justice) and similar buyers.',
              },
              {
                label: 'Paranormal TV Show Pitch',
                body: 'A paranormal TV show pitch lives and dies on location and character. The buyer wants to see the investigators — their credibility, their chemistry, and their on-screen energy — and the quality of the paranormal evidence captured. Travel Channel and Discovery are the primary buyers. The sizzle reel is especially important for paranormal: you need to show a genuine "moment" to give the buyer confidence the show can deliver. MY Entertainment produced Ghost Adventures — 28 seasons on Travel Channel — and has deep experience packaging paranormal concepts.',
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
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — FAQ                                                     */}
      {/* FAQPage schema surfaces rich results. Text must match faqSchema     */}
      {/* above verbatim to avoid schema/content mismatch penalties.        */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="pitch-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="pitch-faq-item">
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
      {/* SECTION 9 — CTA                                                     */}
      {/* Converts informational reader to B2B lead; cross-links the cluster. */}
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
            MY Entertainment is actively looking for great unscripted concepts.
            If you have an idea — and especially if you have real characters and a story —
            reach out. We&apos;ll tell you honestly whether it&apos;s ready to pitch.
          </p>

          {/* Primary CTA — contact page. Icon + visible text + tooltip per CLAUDE.md */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/contact"
              className="pitch-cta-btn"
              aria-label="Contact MY Entertainment to pitch your TV show idea"
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
              Submit Your Pitch to MYE
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
            <Link href="/sizzle-reel" style={inlineLink}>
              What Is a Sizzle Reel?
            </Link>
            {' · '}
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Free Pitch Deck Template
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
