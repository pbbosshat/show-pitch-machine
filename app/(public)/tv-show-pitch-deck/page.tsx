// ============================================================
// /tv-show-pitch-deck — Pitch Deck Template / Lead-Magnet Page
// Target keywords (updated 2026-05-27, seo/scale-mye):
//   "tv show pitch deck"          (vol 70, KD 3, CPC $140 — primary)
//   "tv show pitch deck examples" (vol ~40, KD ~8, CPC $100 — H2)
//   "tv pitch template"           (vol 30, KD 3, CPC $60  — H2/FAQ)
//   "tv pitch deck template free" (vol ~20, KD ~5, CPC $50 — FAQ)
//
// Intent: showrunners and creators who want a structured template
// to build a pitch deck. This is the lead-magnet page of the cluster:
// it offers a real downloadable PDF template and captures the searcher
// at a high-intent moment (actively building a pitch).
//
// The downloadable asset lives at /pitch-deck-template.pdf in public/.
// It is a REAL static file — not a stub or fake API.
// See: public/pitch-deck-template.pdf (created alongside this file).
//
// Server Component — no 'use client'. All styles inline.
// Design tokens mirror Webflow source exactly.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template
// so the exact keyword phrase is the <title> in the SERP.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Show Pitch Deck Template: Free 8-Slide PDF | MY Entertainment',
  },
  description:
    'Free 8-slide TV pitch deck template from a company with 25+ years selling shows to Discovery, A&E, PBS, and 28+ networks. Download instantly, no sign-up required.',
  keywords: [
    'tv show pitch deck', 'tv pitch template', 'pitch deck template', 'tv show pitch deck template',
    'how to make a tv pitch deck', 'tv show pitch document', 'pitch deck for tv show',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-show-pitch-deck' },
  openGraph: {
    title: 'TV Show Pitch Deck Template: Free 8-Slide PDF | MY Entertainment',
    description:
      'Free 8-slide TV pitch deck template from a company with 25+ years selling shows to Discovery, A&E, PBS, and 28+ networks. Download instantly, no sign-up required.',
    url: 'https://www.myentertainment.tv/tv-show-pitch-deck',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Show Pitch Deck Template: Free 8-Slide PDF | MY Entertainment',
    description:
      'Free 8-slide TV pitch deck template from a company with 25+ years selling shows to Discovery, A&E, PBS, and 28+ networks. Download instantly, no sign-up required.',
  },
};

// ------------------------------------------------------------
// Design token constants — identical across the cluster so the
// four pages feel like a unified content hub, not four orphans.
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
// Template asset path — served from Next.js public/ directory.
// This is a REAL static file; browsers download it directly via
// the <a download> attribute. No API route or stub is involved.
// ------------------------------------------------------------
const TEMPLATE_PDF_PATH = '/pitch-deck-template.pdf';

// ------------------------------------------------------------
// Slide definitions — the annotated template structure.
// Rendered as visual slide cards AND used to populate the
// Article JSON-LD description, so defined once here.
// ------------------------------------------------------------
const SLIDES = [
  {
    num: '01',
    title: 'Title & Logline',
    required: true,
    guidance:
      'Your show title and a single-sentence logline. Format: "[Title] is a [format] series that follows [who] as they [do what] in a world where [stakes/conflict]." If your logline runs two sentences, you don\'t know your show yet.',
  },
  {
    num: '02',
    title: 'The Hook / Why Now',
    required: true,
    guidance:
      'Why does this show exist today — not five years ago, not next year? The cultural moment, trend, or news hook that makes this concept urgent for a network to commission right now. Buyers are always programming 12–18 months ahead.',
  },
  {
    num: '03',
    title: 'Show Format',
    required: true,
    guidance:
      'Episode count, episode length, single-location or travel format, episodic vs. serialized structure, and any special production elements (hidden cameras, competition format, real-time events). Buyers need to understand the production model before they can price it.',
  },
  {
    num: '04',
    title: 'Characters / Talent',
    required: true,
    guidance:
      'Photos, one-sentence bios, and — critically — what makes each person irresistible on camera. Networks buy characters, not concepts. If your character slides could describe any random person, they are not ready.',
  },
  {
    num: '05',
    title: 'Episode Arc / Season Map',
    required: true,
    guidance:
      'Three to five sample episode synopses or a season arc map. Demonstrates that the format generates repeatable content and that you have thought past the pilot. Buyers will ask "where does this go after season one?" — answer it here.',
  },
  {
    num: '06',
    title: 'Target Audience',
    required: true,
    guidance:
      'Primary demographic (age, gender), psychographic profile, and media consumption habits. Include comp shows already doing well with this audience on your target network — this is your proof of market.',
  },
  {
    num: '07',
    title: 'Competitive Landscape',
    required: false,
    guidance:
      'Two to four comp shows and a clear articulation of how yours is different. Be honest — buyers know the landscape better than you do. Using comps that are 10 years old signals you\'re out of touch with the current market.',
  },
  {
    num: '08',
    title: 'Production Team',
    required: true,
    guidance:
      'Logos, credits, and brief bios for your production company and key creatives. This slide answers the buyer\'s unspoken question: "Can these people actually make this show?" Partnering with an experienced prodco before this slide exists is your single best investment.',
  },
];

// ------------------------------------------------------------
// FAQ data — single source of truth for visible text and schema.
// Questions target "pitch deck", "template", "examples", and "free" sub-queries.
// Extended (2026-05-27, seo/scale-mye): added examples, free template,
// and tv pitch template FAQ items.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What should be in a TV show pitch deck?',
    a: 'A TV show pitch deck typically contains eight sections: title and logline, the hook or why-now, show format details, character or talent profiles, episode arc or season map, target audience, competitive landscape, and production team credentials. The deck should be 10–15 slides and designed for a 5–10 minute verbal walkthrough in a pitch meeting.',
  },
  {
    q: 'Are there TV show pitch deck examples I can look at?',
    a: 'Yes. The best TV show pitch deck examples are from shows that actually sold — but most are never made public because they contain confidential network information. The next best thing is a detailed annotated template from a production company with a real track record. The template on this page is based on the structure MY Entertainment uses for our own network submissions — refined from 25 years and hundreds of pitches to Discovery, PBS, A&E, Max, and 28+ other buyers. Each slide includes guidance on what to write and what to avoid, based on what commissioning editors respond to.',
  },
  {
    q: 'Where can I find a free TV pitch template?',
    a: 'The download on this page is a free TV pitch deck template — no email required, no paywall. It is an 8-slide annotated template built from MY Entertainment\'s 25-year pitch playbook. It covers every section a commissioning editor expects to see: logline, format, characters/talent, episode arc, target audience, competitive landscape, and production team. Download it and have a pitch-ready document structure in a day.',
  },
  {
    q: 'Is this a free TV pitch deck template?',
    a: 'Yes. The template on this page is completely free — click the download button above and save the PDF to your device. No account, no email submission, no paywall. It is MY Entertainment\'s own pitch deck structure, shared freely because we believe better-prepared pitches are better for everyone in the unscripted TV industry.',
  },
  {
    q: 'How many slides should a TV pitch deck have?',
    a: '10 to 15 slides is the standard for an unscripted TV pitch deck. Fewer than 10 usually means underdeveloped ideas in key areas (characters, episode arc). More than 20 slides tests executive patience and buries your strongest material. The template in this download is 8 content slides — add cover and contact slides for a 10-slide deck.',
  },
  {
    q: 'Is a pitch deck the same as a treatment?',
    a: 'No. A pitch deck is a presentation-format document (slides) built for the pitch meeting — visual, concise, scannable in 30 seconds. A treatment is a longer written document (3–20 pages) that details format, episode structure, character backstory, and creative vision. Both are often requested during development; the deck typically comes first.',
  },
  {
    q: 'Do I need a sizzle reel as well as a pitch deck?',
    a: 'Yes, if at all possible. A pitch deck asks the commissioning editor to imagine your show; a sizzle reel shows them. In the current pitch environment, a deck-only package is significantly weaker than a deck-plus-reel package. MY Entertainment recommends producing both as an integrated pitch system rather than two separate deliverables.',
  },
  {
    q: 'Can I use this template for a scripted TV show?',
    a: 'This template is optimized for unscripted and reality TV formats, which is MY Entertainment\'s primary genre. For scripted series, the structure differs — you would replace the "characters/talent" section with a cast list and character breakdown, add a pilot script excerpt, and adjust the format section to address writers\' room and episode scripts. The core sections (logline, format, audience, comps, team) apply to both.',
  },
];

// ------------------------------------------------------------
// JSON-LD — Article + FAQPage
// Article signals editorial depth on a money-keyword page.
// FAQPage surfaces rich results for pitch deck template queries.
// ------------------------------------------------------------
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'TV Show Pitch Deck Template (Free PDF) — 8 Slides, Fully Annotated',
  description:
    'A free, annotated TV show pitch deck template from MY Entertainment — an unscripted production company with 25+ years selling shows to Discovery, PBS, A&E, and 28+ networks.',
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
    '@id': 'https://www.myentertainment.tv/tv-show-pitch-deck',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  // Generated from FAQ_ITEMS — single source of truth for question/answer text.
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

// ------------------------------------------------------------
// BreadcrumbList schema — SERP breadcrumb trail for this page.
// Shows "Home > TV Show Pitch Deck Template" in Google results.
// Improves CTR and signals site hierarchy to Googlebot.
// Added 2026-06-01 as part of cluster-wide BreadcrumbList rollout.
// ------------------------------------------------------------
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
      name: 'TV Show Pitch Deck Template',
      item: 'https://www.myentertainment.tv/tv-show-pitch-deck',
    },
  ],
};

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function TVShowPitchDeckPage() {
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
      {/* BreadcrumbList — SERP breadcrumb trail for this lead-magnet page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Responsive styles — slide grid, tooltip, CTA hover */}
      <style>{`
        .deck-prose { max-width: 780px; margin: 0 auto; }
        .deck-slide-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 28px;
        }
        @media (max-width: 640px) {
          .deck-slide-grid { grid-template-columns: 1fr; }
        }
        .deck-faq-item + .deck-faq-item { margin-top: 28px; }
        /* CTA hover — opacity shift matches Webflow hover token */
        .deck-cta-btn:hover,
        .deck-cta-btn:focus-visible { opacity: 0.85; }
        /* Tooltip — visible on hover AND :focus-within for keyboard users */
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
      {/* SECTION 1 — Hero / Download CTA above the fold                      */}
      {/* paddingTop 100px clears fixed navbar.                               */}
      {/* Single H1 — "tv show pitch deck" keyword in the H1 text.           */}
      {/* Primary CTA (download) is above the fold so high-intent visitors   */}
      {/* don't have to scroll to find it.                                    */}
      {/* ================================================================== */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 60,
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
          Free Resource
        </p>

        {/*
          H1 — one per page.
          "TV show pitch deck" keyword is in the H1 for primary query targeting.
          "template" and "free" are high-CTR modifiers for informational queries.
        */}
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(30px, 5vw, 50px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 16px',
            maxWidth: 820,
            lineHeight: 1.15,
          }}
        >
          Free TV Show Pitch Deck Template
        </h1>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto 32px',
            maxWidth: 640,
          }}
        >
          Eight slides. Fully annotated. Built from 25 years of pitching unscripted concepts
          to Discovery, PBS, A&amp;E, and 28+ other networks. Download it and have a pitch-ready
          document in a day.
        </p>

        {/*
          Primary CTA — downloads the static PDF from public/.
          <a download> triggers browser save dialog; no API call involved.
          Icon + visible label + tooltip + aria-label per CLAUDE.md button rules.
          Error handling: N/A — this is a static file download via HTML anchor;
          if the file is missing the browser shows its native 404, which is correct
          behavior for a static asset. No JS error handler is applicable here.
        */}
        <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 12 }}>
          <a
            href={TEMPLATE_PDF_PATH}
            download="MY-Entertainment-TV-Show-Pitch-Deck-Template.pdf"
            className="deck-cta-btn"
            aria-label="Download the MY Entertainment TV show pitch deck template as a PDF"
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
            {/* Leading icon — download arrow affordance */}
            <span aria-hidden="true">↓</span>
            Download Free Template (PDF)
          </a>
          {/* Tooltip: aria-hidden so it is not announced twice by screen readers */}
          <span className="mye-tooltip" aria-hidden="true">
            Save PDF to your device
          </span>
        </span>

        {/* Trust signal below the CTA */}
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 12,
            color: '#a5a7ad',
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          No email required. No paywall. Just the template.
        </p>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — What the template includes                              */}
      {/* Explains the template's value before showing the full slide guide. */}
      {/* Reduces bounce from readers who want reassurance before scrolling. */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="deck-prose">
            <h2 style={h2Style}>What&apos;s in the Template</h2>
            <p style={bodyText}>
              This pitch deck template is based on the structure MY Entertainment uses when developing
              pitch packages for our own network submissions — refined over 25 years and hundreds of
              pitches. It covers the eight sections every unscripted TV pitch deck needs, with
              slide-by-slide guidance on what to write, how much detail to include, and what mistakes
              to avoid.
            </p>
            <p style={bodyText}>
              The template is designed as a starting structure, not a fill-in-the-blank form. Every
              show is different; the guidance in each slide is there to help you think, not to replace
              your creative judgment. A strong pitch deck reflects a specific show — not a generic
              template.
            </p>
            <p style={bodyText}>
              For the pitch deck to work, pair it with a{' '}
              <Link href="/sizzle-reel" style={inlineLink}>
                sizzle reel
              </Link>{' '}
              — the visual complement to the written document. Together, they form a complete
              pitch package.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2b — TV Show Pitch Deck Examples (H2 sub-target)            */}
      {/* Targets "tv show pitch deck examples" (vol ~40, KD ~8, CPC $100).  */}
      {/* Provides real context for what "examples" look like in practice.  */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="deck-prose">
            <h2 style={h2Style}>TV Show Pitch Deck Examples</h2>
            <p style={bodyText}>
              Real <strong style={{ color: '#f2f4f7' }}>TV show pitch deck examples</strong> from
              successful pitches are rarely made public — they contain confidential network strategy,
              unreleased character information, and deal-sensitive framing. What we can share is the
              structural anatomy of decks that have sold shows, drawn from MY Entertainment&apos;s
              25-year pitch history.
            </p>
            <p style={bodyText}>
              Here is what the best-performing pitch decks we have seen (and used) have in common:
            </p>
            {[
              {
                label: 'The logline owns the first page',
                body: 'Every winning deck puts the logline front and center — not buried in slide 4. If the buyer has to hunt for what the show is, they are already distracted.',
              },
              {
                label: 'Characters are specific, not generic',
                body: 'The character slides in the best pitch decks do not describe a type of person — they describe a specific individual with a specific conflict. "A third-generation auctioneer in rural Texas who is racing to save his family\'s business from bankruptcy" is sellable. "An interesting entrepreneur" is not.',
              },
              {
                label: 'Comps are current and on-network',
                body: 'The best pitch deck examples we have seen use comp shows from the past two to three years, from the specific network being pitched. "Your audience already watches X — this is the next step" is more persuasive than any abstract comparison.',
              },
              {
                label: 'The production team slide is a closing argument',
                body: 'The final content slide answers: "Can these people actually make this show?" Logos, key credits, and a brief track record summary. A production partner like MY Entertainment provides the credibility that transforms this slide from weak to convincing.',
              },
            ].map(({ label, body }) => (
              <div key={label} style={{ borderLeft: '3px solid #e51d26', paddingLeft: 16, marginBottom: 20 }}>
                <h3 style={{ ...h3Style, color: '#f2f4f7', textTransform: 'none' as const, letterSpacing: 0, marginBottom: 6 }}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}
            <p style={bodyText}>
              The annotated template below gives you the structural framework from these examples.
              The free PDF download contains slide-by-slide guidance so you can apply these lessons
              to your specific concept.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2c — TV Pitch Template (H2 keyword target)                  */}
      {/* Targets "tv pitch template" (vol 30, KD 3, CPC $60).               */}
      {/* Explicitly names the asset as a "tv pitch template" for SEO.      */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="deck-prose">
            <h2 style={h2Style}>TV Pitch Template — What&apos;s Included</h2>
            <p style={bodyText}>
              The free download on this page is a complete{' '}
              <strong style={{ color: '#f2f4f7' }}>TV pitch template</strong> in PDF format.
              It is not a generic presentation template — it is built specifically for unscripted
              television pitches, with guidance on what commissioning editors at cable networks,
              broadcast channels, and streaming platforms expect to see in each section.
            </p>
            <p style={bodyText}>
              The TV pitch template covers eight sections:
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
              <li style={{ marginBottom: 8 }}>Title &amp; Logline — your show in one sentence</li>
              <li style={{ marginBottom: 8 }}>The Hook / Why Now — cultural moment or urgency angle</li>
              <li style={{ marginBottom: 8 }}>Show Format — episode count, structure, production model</li>
              <li style={{ marginBottom: 8 }}>Characters / Talent — specific people, not types</li>
              <li style={{ marginBottom: 8 }}>Episode Arc / Season Map — proof the format sustains</li>
              <li style={{ marginBottom: 8 }}>Target Audience — demographics, psychographics, comp shows</li>
              <li style={{ marginBottom: 8 }}>Competitive Landscape — current comps, your differentiation</li>
              <li>Production Team — credentials that say "we can deliver this"</li>
            </ol>
            <p style={bodyText}>
              Each section of the TV pitch template includes annotated guidance — not just blank boxes,
              but explanations of what to write, how much detail to include, and what mistakes to avoid.
              Download it free above.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — The eight slides (annotated guide)                      */}
      {/* This is the main content block. It mirrors the PDF template but    */}
      {/* is indexable by Google — the PDF content is not. This section      */}
      {/* targets "what goes in a tv pitch deck" informational sub-queries.  */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2
            style={{
              ...h2Style,
              textAlign: 'center',
            }}
          >
            The Eight Slides — Annotated
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 620,
              margin: '0 auto 8px',
            }}
          >
            This is what the template covers — each slide explained with guidance on what to include.
          </p>

          {/* Slide card grid — 2 columns desktop, 1 mobile */}
          <div className="deck-slide-grid">
            {SLIDES.map(({ num, title, required, guidance }) => (
              <div
                key={num}
                style={{
                  // Card: dark border on black. Required slides get a red left border
                  // as a subtle visual indicator of their importance.
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderLeft: required ? '3px solid #e51d26' : '3px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '20px 20px 20px 18px',
                }}
              >
                {/* Slide number — Oswald bold, red accent */}
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
                  {/* "Required" badge — small inline label, aria-hidden as supplementary */}
                  {required && (
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-block',
                        marginLeft: 8,
                        fontSize: 10,
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 400,
                        color: '#e51d26',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        verticalAlign: 'middle',
                      }}
                    >
                      Required
                    </span>
                  )}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13 }}>{guidance}</p>
              </div>
            ))}
          </div>

          {/* Repeat download CTA after the content for mid-page conversion */}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <span className="mye-tooltip-wrap">
              <a
                href={TEMPLATE_PDF_PATH}
                download="MY-Entertainment-TV-Show-Pitch-Deck-Template.pdf"
                className="deck-cta-btn"
                aria-label="Download the pitch deck template PDF"
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
                <span aria-hidden="true">↓</span>
                Download the Template
              </a>
              <span className="mye-tooltip" aria-hidden="true">
                Save PDF to your device
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — How to use the template                                 */}
      {/* Practical guidance that earns dwell time and demonstrates MYE's   */}
      {/* expertise. Cross-links to /how-to-pitch-a-tv-show for full guide. */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="deck-prose">
            <h2 style={h2Style}>How to Use This Template</h2>
            <p style={bodyText}>
              Start with Slide 01 — the logline. If you can&apos;t write a single clear sentence
              describing your show, no amount of strong slides in the other seven sections will save the
              pitch. The logline is the filter. Get it right before you build anything else.
            </p>

            {/* Numbered tips — practical guidance for template use */}
            {[
              {
                n: 1,
                tip: 'Customize every slide to your specific show.',
                body: 'Generic language is the pitch-deck killer. Replace every placeholder with specific details about your concept, your characters, and your target network. Buyers read dozens of decks; yours needs to feel specific.',
              },
              {
                n: 2,
                tip: 'Know your target network before you fill in Slide 06.',
                body: 'The audience slide and the competitive landscape slide (Slides 06 and 07) only make sense relative to a specific buyer. If you\'re pitching Travel Channel, your comps are Travel Channel shows. Build this deck for one network at a time.',
              },
              {
                n: 3,
                tip: 'Pair the deck with a sizzle reel.',
                body: 'The deck explains the show; the reel shows it. In today\'s pitch environment, a deck alone is significantly weaker than a deck-plus-reel package. If you don\'t yet have a reel, include a production plan for it in Slide 08.',
              },
              {
                n: 4,
                tip: 'Keep it to 10–15 slides.',
                body: 'Add a cover slide and a contact/next-steps slide to the eight template slides for a 10-slide deck. If you feel the need to go past 15 slides, you\'re adding slides that should be in a separate treatment document — not the deck.',
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
                {/* Step number circle — red, Oswald */}
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
              For a complete walkthrough of the pitch process — from concept to commission — read our
              guide on{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                how to pitch a TV show
              </Link>
              , which covers the deck structure, sizzle reel role, who buys, and common mistakes.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — FAQ                                                     */}
      {/* FAQPage schema enables rich results. Text MUST match faqSchema      */}
      {/* above verbatim to avoid structured-data / content mismatch.       */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="deck-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {/* FAQ items rendered as visible text — identical to JSON-LD schema above */}
            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="deck-faq-item">
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
                {/* Answer — must match faqSchema.mainEntity[idx].acceptedAnswer.text verbatim */}
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — CTA: work with MYE                                      */}
      {/* Converts template-seeker into a B2B lead. Cluster cross-links pass */}
      {/* PageRank back to flagship pages /sizzle-reel and /how-to-pitch.   */}
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
            Need More Than a Template?
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
            MY Entertainment doesn&apos;t just provide templates — we build the full pitch package,
            produce the sizzle reel, and submit directly to commissioning editors at your target
            network. If your concept is ready for a real partner, reach out.
          </p>

          {/* Primary CTA — pitch services. Icon + label + tooltip + aria-label per CLAUDE.md. */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/contact"
              className="deck-cta-btn"
              aria-label="Contact MY Entertainment to pitch your TV show with professional support"
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
              {/* Leading icon — envelope/contact affordance */}
              <span aria-hidden="true">✉</span>
              Work With MY Entertainment
            </a>
            {/* aria-hidden tooltip — not announced by screen readers (button already labelled) */}
            <span className="mye-tooltip" aria-hidden="true">
              Open the MYE contact form
            </span>
          </span>

          {/* Cluster cross-links — A↔B↔C↔D full mesh */}
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
            <Link href="/sizzle-reel" style={inlineLink}>
              What Is a Sizzle Reel?
            </Link>
            {' · '}
            <Link href="/tv-production-company" style={inlineLink}>
              Our Production Services
            </Link>
            {' · '}
            {/* Added seo/mye-pitch-money-2026-06-04 — TV bible is the companion doc to pitch deck */}
            <Link href="/tv-pitch-bible" style={inlineLink}>
              What Is a TV Show Bible?
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
