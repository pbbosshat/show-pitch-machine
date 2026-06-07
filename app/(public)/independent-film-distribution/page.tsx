// ============================================================
// /independent-film-distribution — Independent Film & Documentary Distribution
//
// THESIS: Independent producers and documentary filmmakers searching
// "independent film distribution" are looking for a TV distribution
// partner — someone who can place their finished film or doc series
// with a network or streamer. MY Entertainment distributes unscripted
// content including documentary series and specials.
//
// Target keywords:
//   "independent film distribution"       (primary — H1/title)
//   "documentary distribution company"    (variant — H2/meta)
//   "how to distribute a documentary"     (how-to — FAQ/body)
//   "independent documentary distribution"(variant — body)
//   "film distribution company"           (broad variant — meta/body)
//   "tv documentary distribution"         (specific — body)
//   "documentary film distribution"       (variant — body)
//
// SCOPE NOTE: MY Entertainment distributes for TELEVISION — broadcast
// networks, streamers, and international broadcasters. This page targets
// independent film / documentary producers seeking TV distribution,
// NOT theatrical or festival distribution. The page is explicit about
// this scope so visitors self-qualify before submitting.
//
// FACTUAL RULE: every show title, network name, and claim is sourced
// from the /about, /work-with-us, /pitch, /documentary, and
// /tv-distribution-company pages already in the repo. Nothing invented.
// Legacy List = Emmy-nominated PBS. Breaking Borders = critical recognition.
// Documentary track record verified in existing pages.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens: #000 bg, #a5a7ad body, #f2f4f7 headings, #e51d26 accent,
// Roboto / Roboto Condensed / Oswald — matches the distribution cluster.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    absolute: 'Independent Film Distribution | Documentary Distribution Company — MY Entertainment',
  },
  description:
    'MY Entertainment is a documentary distribution company that places finished independent films and documentary series with US networks, streamers, and international broadcasters. Legacy List (Emmy-nominated, PBS), Breaking Borders, and 25+ years placing unscripted content on Discovery, A&E, and 28+ networks.',
  keywords: [
    'independent film distribution',
    'documentary distribution company',
    'how to distribute a documentary',
    'independent documentary distribution',
    'film distribution company',
    'tv documentary distribution',
    'documentary film distribution',
    'documentary tv distribution',
    'unscripted film distribution',
    'documentary series distribution',
    'distribute documentary to netflix',
    'get documentary on tv',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/independent-film-distribution' },
  openGraph: {
    title: 'Independent Film Distribution | Documentary Distribution Company — MY Entertainment',
    description:
      'MY Entertainment places finished independent documentaries and unscripted films with US networks, streamers, and international broadcasters. 25+ years, 28+ networks, Emmy-nominated track record.',
    url: 'https://www.myentertainment.tv/independent-film-distribution',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Independent Film Distribution | MY Entertainment',
    description:
      'MY Entertainment distributes finished independent documentaries and unscripted films to US networks, streaming platforms, and international broadcasters. Submit your documentary for consideration.',
  },
};

// Design tokens — match the distribution cluster
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

// Documentary genres / formats MY Entertainment distributes.
// All titles are factual — sourced from /about and /documentary pages in the repo.
const DOC_GENRES = [
  {
    label: 'Documentary Series',
    note: 'Multi-episode documentary formats for cable networks and streaming — the highest-value format for international licensing and multi-territory distribution.',
    examples: 'Legacy List with Matt Paxton (Emmy-nominated, PBS), Breaking Borders, Sherman\'s Warriors',
  },
  {
    label: 'Paranormal Documentary',
    note: 'Paranormal and supernatural investigation formats remain the strongest unscripted genre on US cable. Discovery, Travel Channel, and A&E are primary buyers.',
    examples: 'Ghost Adventures (28 seasons), Destination Fear, Paranormal Challenge (Travel Channel/Discovery)',
  },
  {
    label: 'True Crime Documentary',
    note: 'Investigative and true crime documentary formats — high buyer demand from Oxygen, Investigation Discovery, A&E, and streaming platforms.',
    examples: 'Sin City Justice, The Jane Doe Murders, Manson Bloodlines (Investigation Discovery, Oxygen)',
  },
  {
    label: 'Factual & Current Affairs',
    note: 'Issue-led and journalistic documentary formats. Strong fit for PBS, National Geographic, BBC, and public broadcasters internationally.',
    examples: 'Breaking Borders (critical recognition), Sherman\'s Warriors, Red Alaska',
  },
  {
    label: 'Documentary Specials',
    note: 'Single-episode documentary films — 60 to 90 minutes. Strong fit for PBS, BBC, and streaming platforms seeking standalone documentary programming.',
    examples: 'Legacy List specials, standalone documentary films across PBS and public broadcasting',
  },
  {
    label: 'International Format Docs',
    note: 'Documentary formats with international remake potential — a repeatable structure that can be locally produced in other territories. Format rights negotiated separately from distribution rights.',
    examples: 'Format deals across 15 countries; Pregnant & Platonic (8-country format optioned)',
  },
];

// What distinguishes TV distribution from theatrical / festival distribution.
// Helps self-qualify visitors who may be looking for theatrical distribution.
const SCOPE_ITEMS = [
  {
    label: 'What MY Entertainment distributes',
    body: 'Finished and near-finished documentary series, documentary specials, and unscripted films — submitted for placement with US broadcast networks, streaming platforms, and international broadcasters.',
  },
  {
    label: 'What we do not handle',
    body: 'Theatrical release, film festival strategy, and home video distribution. MY Entertainment distributes for television — the audience for our distribution deals is commissioning editors at TV networks and streamers, not cinema bookers.',
  },
  {
    label: 'What "finished" means',
    body: 'A finished episode, pilot, or feature-length cut that a network executive can watch. Color-graded preferred; near-finished (picture-locked, temp mix) is acceptable. A sizzle reel or trailer is not a submittable distribution asset.',
  },
  {
    label: 'Who this is for',
    body: 'Independent documentary filmmakers and production companies who have completed their film or series and need a distribution partner with active buyer relationships at US and international TV networks.',
  },
];

// FAQ items — FAQPage schema targets the "how to distribute a documentary" cluster
const FAQ_ITEMS = [
  {
    q: 'Can MY Entertainment distribute my independent documentary?',
    a: 'MY Entertainment distributes finished documentary films and series for television — US broadcast networks, streaming platforms, and international broadcasters. If your documentary is a finished or near-finished unscripted series, documentary special, or factual feature, and it fits one of our core genres (paranormal, true crime, documentary, lifestyle, sports), submit it via the form at myentertainment.tv/pitch. Our development team reviews every submission for genre fit, production quality, and network placement potential.',
  },
  {
    q: 'How do I get my documentary on TV?',
    a: 'To get a documentary on TV, you need a distribution partner with active buyer relationships at the networks that buy your genre. The steps: (1) finish a quality cut — a picture-locked episode or feature; (2) identify a distributor whose catalog matches your documentary\'s genre and production style; (3) submit your screener and show summary formally; (4) if it fits, the distributor pitches it to their buyer contacts. MY Entertainment has placed documentary content on PBS, Discovery, Travel Channel, National Geographic, BBC, and 20+ other networks over 25 years.',
  },
  {
    q: 'What is the difference between theatrical distribution and TV distribution for documentaries?',
    a: 'Theatrical distribution places a documentary in cinemas — handled by theatrical distributors who book screens and manage the cinema release calendar. TV distribution places a documentary with broadcast networks, streaming platforms, or international broadcasters — handled by TV distribution companies like MY Entertainment who negotiate licensing agreements with commissioning editors. Many documentary filmmakers pursue TV distribution rather than theatrical because the audience reach is larger and the licensing fee structure is better established. MY Entertainment handles TV distribution only.',
  },
  {
    q: 'How long does documentary distribution take?',
    a: 'The timeline from submission to a TV placement varies by genre and buyer demand. A documentary in a genre actively sought by a buyer — for example, a paranormal series pitched to Discovery, or a social-issues documentary pitched to PBS — can move in 4–12 weeks. Most placements take 3–9 months from initial pitch to deal signature. International documentary distribution often moves faster than US broadcast deals. Having a finished feature or series (not a sizzle reel) compresses the timeline — buyers greenlight content they have watched.',
  },
  {
    q: 'Does my documentary need to be finished before I submit to MY Entertainment?',
    a: 'Yes — MY Entertainment is a distribution company, not a development or production company. We distribute finished and near-finished content. A picture-locked cut (even without final color grade or mix) is acceptable. A concept, treatment, or trailer without a finished episode or feature is not a distribution submission — that is a development pitch. If your documentary is still in production, the right move is to complete a rough cut and return when you have something a network executive can watch.',
  },
  {
    q: 'What documentary genres does MY Entertainment distribute?',
    a: 'MY Entertainment distributes documentary series and specials across: paranormal and supernatural investigation, true crime and investigative, factual and current affairs, lifestyle and home, sports and competition, and international format documentaries. Our strongest buyer relationships are in paranormal (Discovery, Travel Channel), true crime (Oxygen, A&E, Investigation Discovery), and documentary series (PBS, National Geographic, BBC). Submit your documentary at myentertainment.tv/pitch — our team reviews every submission.',
  },
];

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Independent Film Distribution for Television — Documentary Distribution Company',
  description:
    'MY Entertainment distributes finished independent documentaries and unscripted films to US TV networks, streaming platforms, and international broadcasters. 25+ years, 28+ networks.',
  url: 'https://www.myentertainment.tv/independent-film-distribution',
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
    { '@type': 'ListItem', position: 3, name: 'Independent Film Distribution', item: 'https://www.myentertainment.tv/independent-film-distribution' },
  ],
};

export default function IndependentFilmDistributionPage() {
  return (
    <div style={{ background: '#000' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <style>{`
        .film-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        .film-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 24px;
        }
        @media (max-width: 900px) {
          .film-grid-3 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .film-grid-2 { grid-template-columns: 1fr; }
          .film-grid-3 { grid-template-columns: 1fr; }
        }
        .film-faq-item + .film-faq-item { margin-top: 28px; }
        .film-cta-btn:hover, .film-cta-btn:focus-visible { opacity: 0.85; }
      `}</style>

      {/* ================================================================== */}
      {/* SECTION 1 — Hero                                                    */}
      {/* H1 = "Independent Film Distribution" — primary keyword verbatim.   */}
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
          MY Entertainment — Documentary Distribution Company
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
          Independent Film Distribution for Television
        </h1>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto 12px',
            maxWidth: 700,
          }}
        >
          MY Entertainment is a New York documentary distribution company that places finished
          independent films and documentary series with US broadcast networks, streaming platforms,
          and international broadcasters.
        </p>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 13,
            color: '#777',
            lineHeight: 1.6,
            margin: '0 auto 32px',
            maxWidth: 600,
          }}
        >
          We distribute for television — not theatrical or festival. If you have a finished
          documentary or unscripted series and need a TV distribution partner, this is the
          right conversation.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <a
            href="/pitch"
            className="film-cta-btn"
            aria-label="Submit your documentary to MY Entertainment for TV distribution"
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
            Submit Your Documentary
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

        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { stat: '25+', label: 'Years distributing documentary content' },
            { stat: '28+', label: 'Networks & streamers including PBS, Discovery, BBC' },
            { stat: '15+', label: 'Countries for format and co-production deals' },
          ].map(({ stat, label }) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 36, fontWeight: 700, color: '#e51d26', margin: '0 0 4px', lineHeight: 1 }}>{stat}</p>
              <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: '#a5a7ad', margin: 0, maxWidth: 180 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — Scope: TV distribution, not theatrical                  */}
      {/* Qualifies the visitor. Explicit about what MYE handles (and doesn't).*/}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={h2Style}>What MY Entertainment Distributes — and What We Don&rsquo;t</h2>
          <p style={{ ...bodyText, maxWidth: 700 }}>
            Independent film distribution covers a wide range of outcomes — theatrical,
            streaming, TV broadcast, home video, and festival. MY Entertainment specializes
            in one of those: <strong style={{ color: '#f2f4f7' }}>television distribution</strong>.
            We place finished independent films and documentary series with TV networks,
            streamers, and international broadcasters. Understanding this scope helps you
            decide whether we are the right partner for your project.
          </p>

          <div className="film-grid-2">
            {SCOPE_ITEMS.map(({ label, body }) => (
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
                <p style={accentLabel}>{label}</p>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Documentary genres we distribute                         */}
      {/* Named shows = E-E-A-T signals + targeting documentary sub-keywords. */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>Documentary Genres We Distribute</h2>
          <p style={{ ...bodyText, textAlign: 'center', maxWidth: 640, margin: '0 auto 8px' }}>
            MY Entertainment distributes documentary and unscripted content across the following
            genres. Each represents a format where we have active buyer relationships and a
            track record of completed distribution deals.
          </p>

          <div className="film-grid-3">
            {DOC_GENRES.map(({ label, note, examples }) => (
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
                <p style={{ ...bodyText, fontSize: 13, marginBottom: 10 }}>{note}</p>
                <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: '#e51d26', margin: 0, lineHeight: 1.5 }}>
                  MYE titles: {examples}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Track record: Emmy-nominated, PBS, documentary creds   */}
      {/* Factual E-E-A-T. Sourced from /about and /documentary pages.      */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>Our Documentary Distribution Track Record</h2>

            <p style={bodyText}>
              MY Entertainment has been producing and distributing documentary content
              for over 25 years. Our documentary track record includes:
            </p>

            {[
              {
                title: 'Legacy List with Matt Paxton — Emmy-Nominated, PBS',
                body: 'Legacy List is a documentary lifestyle series that earned an Emmy nomination during its run on PBS. A home-downsizing documentary format that generates genuine emotional stakes from the objects families leave behind. PBS placement for an independently produced documentary series is a highly competitive distribution outcome.',
              },
              {
                title: 'Breaking Borders — Critically Recognized Documentary Series',
                body: 'Breaking Borders received critical recognition for its journalism and travel-documentary storytelling. The series placed with major broadcast partners and was recognized by critics for its factual, non-sensationalist approach to international storytelling.',
              },
              {
                title: 'Ghost Adventures — 28 Seasons, Travel Channel and Discovery',
                body: 'Ghost Adventures began as an independent documentary feature — shot by three filmmakers without a network commission — and grew into the most-watched paranormal documentary series in cable TV history, spanning 28 seasons and five spin-off series. It is the defining case study in what independent documentary distribution can produce at scale.',
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                style={{
                  borderLeft: '3px solid #e51d26',
                  paddingLeft: 16,
                  marginBottom: 28,
                }}
              >
                <h3 style={{ ...h3Style, marginBottom: 6, color: '#e51d26' }}>{title}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}

            <p style={bodyText}>
              Our distribution relationships span PBS, Discovery, Travel Channel, A&amp;E,
              Investigation Discovery, Oxygen, National Geographic, BBC, and 20+ additional
              broadcast and streaming platforms. For independent film and documentary
              producers, this represents direct access to commissioning editors across the
              full spectrum of US and international factual television buyers.
            </p>

            <p style={{ ...bodyText, marginBottom: 0 }}>
              See our full distribution capabilities:{' '}
              <Link href="/tv-distribution-company" style={inlineLink}>
                TV Distribution Company — Services &amp; Track Record →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — How to distribute a documentary (step by step)         */}
      {/* Targets "how to distribute a documentary" sub-query directly.     */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>How to Distribute a Documentary for Television</h2>

            {[
              {
                n: '01',
                title: 'Finish a Quality Cut',
                body: 'A picture-locked episode or feature-length cut is the minimum for a distribution submission. Network executives make decisions based on what they watch — not a sizzle reel, not a trailer. Color grade and final mix help but are not required; rough cuts with strong editorial are accepted.',
              },
              {
                n: '02',
                title: 'Prepare Your Submission Package',
                body: 'Your submission needs: a screener link (private YouTube, Vimeo, or file share), a brief show summary (genre, episode count, runtime, production status), a Submission Release Form, and production credits. MY Entertainment\'s submission form is at /pitch.',
              },
              {
                n: '03',
                title: 'Match Your Documentary to the Right Distributor',
                body: 'A paranormal documentary belongs with a distributor who has active relationships at Discovery and Travel Channel — not with a scripted drama distributor. A social-issues documentary belongs with a distributor who has PBS and BBC relationships. MY Entertainment distributes across paranormal, true crime, factual, lifestyle, and documentary genres with buyers at each.',
              },
              {
                n: '04',
                title: 'Submit and Enter the Distribution Process',
                body: 'MY Entertainment reviews every formal submission. If your documentary fits our catalog and buyer relationships, we pitch it to the right network — not a generic blast list. If it finds a buyer, we structure the distribution deal covering territory, exclusivity window, license fee, and rights type.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}>
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
                  <h3 style={{ ...h3Style, marginBottom: 6 }}>{title}</h3>
                  <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — FAQ                                                     */}
      {/* FAQPage schema targets the "how to distribute a documentary" and   */}
      {/* "documentary distribution company" sub-query cluster.             */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div style={prose}>
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="film-faq-item">
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
      {/* SECTION 7 — CTA                                                     */}
      {/* ================================================================== */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#000', borderTop: '1px solid #1a1a1a' }}>
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
            Have a Finished Documentary?
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
            MY Entertainment reviews submissions from independent documentary filmmakers
            and production companies with finished or near-finished content. If your
            documentary fits our catalog, we pitch it to the right network buyer.
          </p>

          <a
            href="/pitch"
            className="film-cta-btn"
            aria-label="Submit your documentary to MY Entertainment for distribution"
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
            Submit Your Documentary for Distribution
          </a>

          <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#a5a7ad', marginTop: 24, marginBottom: 0 }}>
            Explore:{' '}
            <Link href="/tv-distribution-company" style={inlineLink}>TV Distribution Services</Link>
            {' · '}
            <Link href="/tv-distribution-deal" style={inlineLink}>How Distribution Deals Work</Link>
            {' · '}
            <Link href="/documentary" style={inlineLink}>Documentary Production</Link>
            {' · '}
            <Link href="/available" style={inlineLink}>Available Titles</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
