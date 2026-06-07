// ============================================================
// /tv-distribution-deal — Distribution Deal Money-Keyword Page
//
// THESIS: Producers who have a finished show and want distribution often
// research "tv distribution deal" before reaching out to a distributor.
// This page meets them at that research stage and converts them into /pitch.
//
// Target keywords (distribution-deal cluster):
//   "tv distribution deal"            (primary — H1/title)
//   "how to get tv distribution"      (high-intent how-to — H2/body)
//   "television distribution agreement" (variant — body/FAQ)
//   "tv distribution contract"         (variant — FAQ)
//   "how does a tv distribution deal work" (sub-query — FAQ)
//   "tv show distribution deal"        (variant — body)
//
// AUDIENCE: A producer with a finished or near-finished unscripted show who
// is researching what a distribution deal looks like before committing to a
// partner. They are one step away from submitting — this page converts them.
//
// FACTUAL RULE: every show title, network name, and claim is sourced from
// the /about, /work-with-us, /pitch, and /tv-distribution-company pages
// already in the repo. Nothing invented.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens: #000 bg, #a5a7ad body, #f2f4f7 headings, #e51d26 accent,
// Roboto / Roboto Condensed / Oswald — matches the distribution cluster.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute so exact keyword appears in <title>.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Distribution Deal | How to Get TV Distribution — MY Entertainment',
  },
  description:
    'Learn how a TV distribution deal works, what terms matter, and how to get TV distribution for your finished unscripted show. MY Entertainment has structured distribution deals with Discovery, Travel Channel, PBS, A&E, and 28+ networks for 25+ years.',
  keywords: [
    'tv distribution deal',
    'how to get tv distribution',
    'television distribution agreement',
    'tv distribution contract',
    'how does a tv distribution deal work',
    'tv show distribution deal',
    'tv content licensing deal',
    'getting a tv distribution deal',
    'tv distribution terms',
    'unscripted tv distribution deal',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-distribution-deal' },
  openGraph: {
    title: 'TV Distribution Deal | How to Get TV Distribution — MY Entertainment',
    description:
      'A guide to how TV distribution deals work — from deal types and contract terms to how to find a distributor for your finished unscripted show. MY Entertainment distributes to 28+ networks.',
    url: 'https://www.myentertainment.tv/tv-distribution-deal',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Distribution Deal | How to Get TV Distribution',
    description:
      'How TV distribution deals work, what terms to expect, and how to submit your finished unscripted show to MY Entertainment for distribution consideration.',
  },
};

// ------------------------------------------------------------
// Design tokens — match the distribution cluster.
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
  textTransform: 'none' as const,
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

// ------------------------------------------------------------
// Deal term explainer cards — what every TV distribution deal covers.
// Sourced from standard industry practice and aligned with how
// MY Entertainment's deals are described on /tv-distribution-company.
// ------------------------------------------------------------
const DEAL_TERMS = [
  {
    label: 'Territory',
    body: 'The geographic area where the broadcaster has the right to air your show. A US-only deal leaves UK, Canadian, and international rights open for separate licensing. MY Entertainment structures deals globally from offices in New York, Toronto, and London.',
  },
  {
    label: 'Exclusivity Window',
    body: 'The period during which the broadcaster has exclusive rights to air the show in their territory. A 12–24 month exclusive window is typical for US cable. After the window, rights can revert or be re-licensed to other platforms in the same territory.',
  },
  {
    label: 'License Fee',
    body: 'The payment the broadcaster makes in exchange for the right to air the show. License fees vary by network, genre, episode count, and production quality. A finished episode (not a sizzle reel) is required to negotiate a fee — buyers need to see what they are buying.',
  },
  {
    label: 'Rights Type',
    body: 'Broadcast rights, streaming rights, and digital rights are distinct and separately negotiable. A TV distribution deal can cover one or all three. MY Entertainment negotiates rights packages that maximise reach without surrendering IP you will need for future deals.',
  },
  {
    label: 'Format Rights',
    body: 'Separate from distribution rights, format rights allow a broadcaster in another territory to produce a local version of your show. If your format has international remake potential — a repeatable structure that adapts to local talent — MY Entertainment identifies and sells that IP.',
  },
  {
    label: 'IP Ownership',
    body: 'A distribution deal does NOT transfer ownership of the underlying IP. You retain creator credit and ownership. The distributor licenses the right to broadcast — they do not buy the show outright. Protecting IP ownership is a core term in every deal MY Entertainment structures.',
  },
];

// ------------------------------------------------------------
// Steps to get a TV distribution deal.
// Factual process, consistent with /pitch and /tv-distribution-company.
// ------------------------------------------------------------
const HOW_TO_STEPS = [
  {
    n: '01',
    title: 'Finish Production',
    body: 'Distributors can only sell what buyers can watch. A finished episode or pilot — not a pitch deck or sizzle reel — is the starting point for a distribution conversation. Near-finished (cut but not color-graded) is usually acceptable.',
  },
  {
    n: '02',
    title: 'Prepare Your Materials',
    body: 'A distribution submission needs: a finished episode or screener, a show summary (what it is, how many episodes, run time), production credits, and a completed Submission Release Form. Buyers decide from the screener — invest in picture quality before the distribution conversation.',
  },
  {
    n: '03',
    title: 'Find the Right Distributor',
    body: 'Match your show\'s genre and production quality to the distributor\'s catalog and buyer relationships. A distributor with active relationships at Discovery, Travel Channel, and PBS is the right partner for unscripted paranormal, documentary, or lifestyle content — not a scripted drama distributor.',
  },
  {
    n: '04',
    title: 'Submit and Negotiate',
    body: 'Submit via the distributor\'s formal channel (see /pitch for MY Entertainment\'s submission process). If the show fits, the distribution conversation moves to deal terms: territory, exclusivity window, license fee, rights type, and backend. A qualified distributor represents your interests through this negotiation.',
  },
];

// ------------------------------------------------------------
// FAQ — FAQPage schema data. Covers the "how" and "what" sub-queries
// that rank alongside "tv distribution deal" in search.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What is a TV distribution deal?',
    a: 'A TV distribution deal is a license agreement between a rights holder (usually the production company or a distributor acting on their behalf) and a broadcaster or streaming platform. The broadcaster pays a license fee in exchange for the right to air the show in a specific territory for a specific window of time. The rights holder retains underlying IP ownership and can license the same show to other territories, platforms, and windows. A TV distribution deal is distinct from a production deal — it applies to shows that are already finished or near-finished, not concepts in development.',
  },
  {
    q: 'How do I get a TV distribution deal?',
    a: 'To get a TV distribution deal, you need a finished or near-finished show and a distribution partner with active buyer relationships at the networks that buy your genre. The steps: (1) finish a quality episode or pilot — buyers decide from what they watch; (2) prepare your submission materials (screener, show summary, release form); (3) identify a distributor whose catalog matches your genre and whose buyer relationships include your target networks; (4) submit formally and negotiate deal terms. MY Entertainment\'s submission process is at myentertainment.tv/pitch.',
  },
  {
    q: 'What terms are in a typical TV distribution deal?',
    a: 'A typical TV distribution deal covers: territory (which countries or regions), exclusivity window (how long the broadcaster has exclusive rights), license fee (what they pay), rights type (broadcast, streaming, digital, format), and IP ownership (which always stays with the creator). Some deals also cover backend participation — a share of downstream licensing revenue if the show sells into additional territories or platforms. The exact terms vary by network, genre, episode count, and the distributor\'s negotiating leverage with the buyer.',
  },
  {
    q: 'How long does it take to get a TV distribution deal?',
    a: 'A fast-track placement with the right show in a genre actively sought by a buyer can close in 4–8 weeks. Most distribution deals take 3–9 months from initial pitch to deal signature — network commissioning cycles run on their own calendar, not the producer\'s. International distribution deals often move faster than US broadcast deals. Having a finished episode (not a sizzle reel) compresses the timeline significantly — buyers can approve content they have watched.',
  },
  {
    q: 'Do I need an agent to get a TV distribution deal?',
    a: 'You do not need an agent — a distribution company serves the same function for finished content. An agent (typically a talent or literary agent) pitches concepts and writers in development; a TV distribution company pitches finished shows to buyers, negotiates the distribution agreement, and manages rights across territories. MY Entertainment acts as the distribution partner for producers with finished unscripted content — handling network pitching and deal negotiation without requiring a separate agent.',
  },
  {
    q: 'Can I negotiate a TV distribution deal directly with a network?',
    a: 'In theory, yes — but in practice, networks prioritize pitches from distributors and production companies with established buyer relationships. Unsolicited pitches from unknown producers rarely make it through the intake process. A distribution partner with active relationships at your target networks gives your show a genuine path to the commissioning editor\'s desk. MY Entertainment has made sales to 28+ networks and streamers over 25 years — a relationship asset that a producer pitching directly does not have access to.',
  },
];

// JSON-LD schemas
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'TV Distribution Deal — How to Get TV Distribution for Your Show',
  description:
    'A producer\'s guide to how TV distribution deals work: deal types, contract terms, how to find a distributor, and how to submit a finished unscripted show for distribution consideration.',
  url: 'https://www.myentertainment.tv/tv-distribution-deal',
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
    { '@type': 'ListItem', position: 2, name: 'TV Distribution Company', item: 'https://www.myentertainment.tv/tv-distribution-company' },
    { '@type': 'ListItem', position: 3, name: 'TV Distribution Deal', item: 'https://www.myentertainment.tv/tv-distribution-deal' },
  ],
};

export default function TVDistributionDealPage() {
  return (
    <div style={{ background: '#000' }}>
      {/* Schema markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <style>{`
        .deal-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        .deal-grid-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 28px;
          margin-top: 32px;
        }
        @media (max-width: 900px) {
          .deal-grid-steps { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .deal-grid-2 { grid-template-columns: 1fr; }
          .deal-grid-steps { grid-template-columns: 1fr; }
        }
        .deal-faq-item + .deal-faq-item { margin-top: 28px; }
        .deal-cta-btn:hover, .deal-cta-btn:focus-visible { opacity: 0.85; }
      `}</style>

      {/* ================================================================== */}
      {/* SECTION 1 — Hero                                                    */}
      {/* H1 = "TV Distribution Deal" — primary keyword verbatim.             */}
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
          MY Entertainment — TV Show Distribution
        </p>

        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(28px, 5vw, 50px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 860,
            lineHeight: 1.1,
          }}
        >
          TV Distribution Deal — How to Get TV Distribution
        </h1>

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
          A producer&rsquo;s guide to how TV distribution deals work — what terms to expect,
          how to find a distributor for your show, and what MY Entertainment&rsquo;s
          distribution deal process looks like from submission to broadcast.
        </p>

        {/* Dual CTAs */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <a
            href="/pitch"
            className="deal-cta-btn"
            aria-label="Submit your show to MY Entertainment for distribution"
            style={{
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
            }}
          >
            Submit Your Show
          </a>
          <a
            href="/tv-distribution-company"
            style={{
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
            }}
          >
            Our Distribution Services
          </a>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { stat: '25+', label: 'Years structuring TV distribution deals' },
            { stat: '28+', label: 'Networks & streamers we deal with' },
            { stat: '15+', label: 'Countries across our format deals' },
          ].map(({ stat, label }) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 36, fontWeight: 700, color: '#e51d26', margin: '0 0 4px', lineHeight: 1 }}>{stat}</p>
              <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: '#a5a7ad', margin: 0, maxWidth: 160 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — How to get TV distribution (step by step)              */}
      {/* Targets "how to get tv distribution" — highest-intent sub-query.  */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>How to Get TV Distribution</h2>
          <p style={{ ...bodyText, textAlign: 'center', maxWidth: 640, margin: '0 auto 8px' }}>
            Getting a TV distribution deal requires a finished show, the right materials,
            and a distribution partner with real buyer relationships. Here is the process,
            step by step.
          </p>

          <div className="deal-grid-steps">
            {HOW_TO_STEPS.map(({ n, title, body }) => (
              <div key={n} style={{ background: '#000', border: '1px solid #2a2a2a', borderTop: '3px solid #e51d26', borderRadius: 4, padding: 20 }}>
                <div
                  aria-hidden="true"
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 40,
                    fontWeight: 400,
                    color: '#1a1a1a',
                    lineHeight: 1,
                    marginBottom: 8,
                    userSelect: 'none',
                  }}
                >
                  {n}
                </div>
                <h3 style={h3Style}>{title}</h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — What a TV distribution deal covers (deal terms)        */}
      {/* Targets "television distribution agreement" / "tv distribution      */}
      {/* contract" sub-queries. Educates the producer before they submit.   */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={h2Style}>What a TV Distribution Deal Covers</h2>
          <p style={{ ...bodyText, maxWidth: 700 }}>
            Every TV distribution deal covers a core set of terms. Understanding these
            before entering a distribution conversation puts you in a stronger negotiating
            position — and helps you evaluate whether a deal protects your interests.
          </p>

          <div className="deal-grid-2">
            {DEAL_TERMS.map(({ label, body }) => (
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
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — MY Entertainment's distribution deal approach           */}
      {/* Positions MYE as the right partner. Factual credibility signals.   */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>How MY Entertainment Structures Distribution Deals</h2>
            <p style={bodyText}>
              MY Entertainment has been structuring TV distribution deals for 25+ years — from
              Ghost Adventures&rsquo; first placement on Travel Channel to Emmy-nominated documentary
              deals on PBS. Our deal approach is producer-aligned: we protect underlying IP,
              creator credit, and backend participation, and we negotiate rights packages that
              maximize commercial reach without surrendering what matters to you long-term.
            </p>
            <p style={bodyText}>
              We do not blast your show to a generic list. We identify the right buyer for
              your specific show — based on genre, production quality, and our current
              knowledge of what each network&rsquo;s commissioning team is actively seeking —
              and pitch it there. If the show is right, it gets in the right room.
            </p>
            <p style={bodyText}>
              Our distribution deal track record includes placements on Discovery, Travel
              Channel, A&amp;E, PBS, Oxygen, Investigation Discovery, Food Network, Comedy
              Central, National Geographic, BBC, and 20+ additional networks and streamers.
              Format deals have been structured across 15+ countries.
            </p>

            {/* Internal link cluster */}
            <div
              style={{
                marginTop: 32,
                padding: '20px 24px',
                background: '#000',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
              }}
            >
              <p style={{ ...accentLabel, marginBottom: 12 }}>More on MY Entertainment Distribution</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/tv-distribution-company" style={inlineLink}>
                  TV Distribution Company — Our Full Distribution Services →
                </Link>
                <Link href="/independent-film-distribution" style={inlineLink}>
                  Independent Film &amp; Documentary Distribution →
                </Link>
                <Link href="/tv-buyers" style={inlineLink}>
                  For TV Buyers &amp; Acquirers — Our Available Catalog →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — FAQ                                                     */}
      {/* FAQPage schema targets the "how to get a tv distribution deal"     */}
      {/* and related sub-queries that cluster around this keyword.          */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="deal-faq-item">
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
      {/* SECTION 6 — CTA                                                     */}
      {/* Converts the educated reader into a /pitch submission.             */}
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
            Ready to Pursue a TV Distribution Deal?
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
            If you have a finished or near-finished unscripted show and want to explore
            a distribution deal, submit via the form on /pitch. MY Entertainment reviews
            every submission for genre fit, production status, and network placement potential.
          </p>

          <a
            href="/pitch"
            className="deal-cta-btn"
            aria-label="Submit your show for a TV distribution deal"
            style={{
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
              padding: '14px 40px',
              transition: 'opacity 150ms',
              marginBottom: 24,
            }}
          >
            Submit Your Show for Distribution
          </a>

          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#a5a7ad', marginTop: 24, marginBottom: 0 }}>
            Explore:{' '}
            <Link href="/tv-distribution-company" style={inlineLink}>TV Distribution Services</Link>
            {' · '}
            <Link href="/independent-film-distribution" style={inlineLink}>Documentary Distribution</Link>
            {' · '}
            <Link href="/unscripted-tv-shows" style={inlineLink}>Genres We Distribute</Link>
            {' · '}
            <Link href="/available" style={inlineLink}>Available Titles</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
