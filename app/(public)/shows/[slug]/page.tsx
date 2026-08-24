// Show detail page — frame-accurate clone of myentertainment.tv/shows/[slug]
// Server Component with generateStaticParams for all 40 internal shows.
// Layout: black header section (title graphic) → white content section (video + description + logo)
// → black CTA section.
//
// Show data was extracted from this file into lib/data/shows.ts (seo/option-a-fan-and-b2b).
// Both this page and any future page that needs show content import from that shared file.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ShowPageTracker from '@/components/shows/ShowPageTracker';
import NewsletterSignup from '@/components/newsletter/NewsletterSignup';
import { SHOWS } from '@/lib/data/shows';

// ─────────────────────────────────────────────────────────────────────────────
// Static params — pre-render all show detail pages at build time
// ─────────────────────────────────────────────────────────────────────────────
export function generateStaticParams() {
  return SHOWS.map((show) => ({ slug: show.slug }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-show SEO metadata — title matches Webflow pattern "Show Title - MyEntertainment Shows"
// ─────────────────────────────────────────────────────────────────────────────

// Show-specific metadata overrides for high-impression / low-CTR keywords.
// Each entry replaces the default "title | MyEntertainment" + truncated-description
// pattern for that slug with a hand-crafted snippet targeting searcher intent.
// Keep title ≤ 60 chars and description ≤ 155 chars to avoid SERP truncation.
const SHOW_META_OVERRIDES: Record<string, { title: string; description: string }> = {
  // "destination fear" — pos 8.8, 1,229 impressions, 0 clicks (30 days to 2026-05-25).
  // Searchers want to confirm they've found the Travel Channel paranormal show
  // and see who made it. Previous snippet led with "GHOST ADVENTURES spin-off"
  // which buried the show's own identity and truncated mid-sentence.
  'destination-fear': {
    title: 'Destination Fear (Travel Channel) | MY Entertainment',
    description:
      'Dakota Laden explores haunted locations across America. Travel Channel paranormal series from MY Entertainment, producers of Ghost Adventures.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const show = SHOWS.find((s) => s.slug === slug);
  if (!show) return {};
  const canonicalUrl = `https://www.myentertainment.tv/shows/${show.slug}`;

  // Use hand-crafted override if available; fall back to auto-generated snippet.
  const override = SHOW_META_OVERRIDES[slug];
  const title = override ? override.title : `${show.title} | MyEntertainment`;
  const desc = override
    ? override.description
    : show.description.replace(/\n/g, ' ').substring(0, 160);

  return {
    title,
    description: desc,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description: desc,
      url: canonicalUrl,
      siteName: 'MyEntertainment',
      type: 'video.tv_show',
      images: [{ url: show.titleImgSrc, alt: `${show.title} — MyEntertainment` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [show.titleImgSrc],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ShowPage component
// ─────────────────────────────────────────────────────────────────────────────
export default async function ShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const show = SHOWS.find((s) => s.slug === slug);

  if (!show) notFound();

  // Paragraphs are separated by double newline in the description string
  const paragraphs = show.description.split('\n\n').filter(Boolean);

  const tvSeriesSchema = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.title,
    description: show.description.replace(/\n/g, ' ').substring(0, 500),
    url: `https://www.myentertainment.tv/shows/${show.slug}`,
    image: show.titleImgSrc,
    productionCompany: {
      '@type': 'Organization',
      name: 'MyEntertainment',
      url: 'https://www.myentertainment.tv',
    },
  };

  return (
    <div style={{ background: '#000' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tvSeriesSchema) }} />

      {/* ── Section 1: Title graphic (black background, clears fixed nav) ── */}
      {/* Webflow: .section-3 { background: #000 } + .show-pages.title-graphic { margin-top: 75px } */}
      <section style={{ background: '#000', paddingTop: 75, paddingBottom: 0 }}>
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '0 20px' }}>
          <img
            src={show.titleImgSrc}
            alt={show.title}
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      </section>

      {/* ── Section 2: Video + description (white background) ── */}
      {/* Webflow: .section.black { background-color: #fff; padding: 60px 0 } (misleading class name) */}
      <section style={{ background: '#fff', paddingTop: 60, paddingBottom: 60 }}>

        {/* YouTube embed — responsive 16:9 via padding-top technique */}
        {show.youtubeId && (
          <div style={{ maxWidth: 940, margin: '0 auto', padding: '0 20px' }}>
            <div style={{ position: 'relative', paddingTop: '56.17%', width: '100%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${show.youtubeId}`}
                title={show.title}
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Show title, description, and contact nudge — Webflow: .container-3 */}
        <div
          style={{
            maxWidth: 940,
            margin: '40px auto 0',
            padding: '0 20px',
          }}
        >
          {/* Webflow: h1.show-pages.title-header { color: #000; font-family: Roboto; text-align: center } */}
          <h1
            style={{
              color: '#000',
              fontFamily: "'Roboto', sans-serif",
              fontSize: 38,
              fontWeight: 700,
              textAlign: 'center',
              textTransform: 'uppercase',
              margin: '20px 0',
              letterSpacing: '0.02em',
            }}
          >
            {show.title}
          </h1>

          {/* Webflow: .subtitle { color: #464646; font-family: Roboto Slab; 24px/300; line-height: 30px } */}
          <div
            style={{
              color: '#464646',
              fontFamily: "'Roboto Slab', sans-serif",
              fontSize: 24,
              fontWeight: 300,
              lineHeight: '30px',
              textAlign: 'center',
              marginBottom: 40,
              textShadow: '0 2px rgba(0,0,0,0.1)',
            }}
          >
            {paragraphs.map((para, i) => (
              <p key={i} style={{ marginTop: i === 0 ? 0 : 20, marginBottom: 0 }}>
                {para}
              </p>
            ))}
          </div>

          {/*
            Newsletter signup — placed between the show description and the network logo.
            The lead-in copy names the specific show so it feels personalized.
            Component handles its own email submission to /api/newsletter.
          */}
          <NewsletterSignup showSlug={show.slug} showTitle={show.title} />

          {/* Webflow: .support { text-align: right; margin-top: 60px } */}
          <p
            style={{
              textAlign: 'right',
              marginTop: 60,
              marginBottom: 20,
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#464646',
            }}
          >
            Ready to work with the best?&nbsp; We love pitches!&nbsp; Contact us today at{' '}
            <a
              href="mailto:info@myentertainment.tv"
              style={{ color: '#464646' }}
            >
              info@myentertainment.tv
            </a>
          </p>
        </div>

        {/* Network logo — Webflow: .div-block-17 { text-align: center } */}
        {show.logoSrc && (
          <div
            style={{
              maxWidth: 940,
              margin: '0 auto',
              padding: '0 20px',
              textAlign: 'center',
            }}
          >
            {show.logoHref ? (
              <a
                href={show.logoHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block' }}
              >
                <img
                  src={show.logoSrc}
                  alt={show.logoAlt}
                  style={{ width: 250, maxWidth: '100%', display: 'block' }}
                />
              </a>
            ) : (
              <img
                src={show.logoSrc}
                alt={show.logoAlt}
                style={{ width: 250, maxWidth: '100%', display: 'inline-block' }}
              />
            )}
          </div>
        )}
      </section>

      {/* ── Section 3: CTA — two-column layout matching Webflow .section.sign-up ── */}
      {/*
        Webflow: .sign-up { background: #000; color: #ebedf2; padding: 18px 53px }
        .sign-up-title { Roboto 36px/500 }
        .subtitle.pricing { color: var(--mye-red); Roboto 18px/400 }
        .button { background: #e51d26; Roboto Condensed 16px uppercase }
      */}
      <section
        style={{
          background: '#000',
          color: '#ebedf2',
          padding: '18px 53px',
        }}
      >
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 24,
            }}
          >
            <div style={{ flex: '1 1 360px' }}>
              <h2
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 36,
                  fontWeight: 500,
                  color: '#ebedf2',
                  margin: '0 0 8px',
                  textShadow: '0 2px rgba(0,0,0,0.1)',
                }}
              >
                ready to work with the best?
              </h2>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#e51d26',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Reach out to learn more about how we can make great content together.
              </p>
            </div>

            <div style={{ flex: '0 0 auto', textAlign: 'center', paddingTop: 9 }}>
              {/*
                ShowPageTracker is a 'use client' component that:
                1. Fires view_show_page on mount (engagement, not a Key Event).
                2. Fires request_buyers_pack on this CTA click (Key Event —
                   mark in GA4 Admin for properties/486537975).
                The CTA appearance is identical to the original Link; only
                onClick tracking is added. aria-label names the show so
                screen readers announce the specific action.
              */}
              <ShowPageTracker
                showSlug={show.slug}
                ctaHref="/work-with-us"
                ctaChildren={<>contact&nbsp;us&nbsp;&nbsp;&#10095;</>}
                ctaStyle={{
                  display: 'inline-block',
                  background: '#e51d26',
                  color: '#fff',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                  textShadow: '0 1px rgba(0,0,0,0.1)',
                  borderRadius: 2,
                  padding: '13px 24px',
                }}
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
