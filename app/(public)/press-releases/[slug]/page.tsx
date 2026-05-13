// Press release detail page — dynamic route for /press-releases/[slug]
//
// DATA FLOW:
//   press_releases table (SQLite) → queryOne / query → server component → rendered HTML
//
// ROUTING NOTE:
//   Next.js 15 prefers a static page.tsx directory over a [slug] catch-all when both
//   match the same path segment.  This means:
//     app/(public)/press-releases/film-commission-crew-directories/page.tsx  → wins ✓
//     app/(public)/press-releases/myentertainment-careers-assignment-desk/page.tsx → wins ✓
//   Any other slug falls through to this [slug] catch-all → DB lookup.
//
// API CONTRACT (bots/crawlers hit this URL directly):
//   GET /press-releases/:slug
//   Returns: full article HTML with NewsArticle schema.org JSON-LD
//   Auth: none
//   404 behavior: Next.js notFound() → 404 status

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { query, queryOne } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

type PressRelease = {
  id: string;
  headline: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  source: string | null;
  source_url: string | null;
  published_at: number | null;  // unix seconds
  is_featured: number | null;
  created_at: number | null;
  updated_at: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format unix timestamp (seconds) to "Month DD, YYYY" — e.g. "May 25, 2017".
 * Returns null if the timestamp is missing/invalid so the caller can omit the date element.
 */
function formatDate(unixSec: number | null | undefined): string | null {
  if (!unixSec || unixSec <= 0) return null;
  try {
    return new Date(unixSec * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

/**
 * Format unix timestamp to ISO 8601 string for schema.org datePublished.
 * Returns empty string if timestamp is missing so the field can be omitted.
 */
function toIso(unixSec: number | null | undefined): string {
  if (!unixSec || unixSec <= 0) return '';
  try {
    return new Date(unixSec * 1000).toISOString().split('T')[0]; // "YYYY-MM-DD"
  } catch {
    return '';
  }
}

/**
 * Lightly sanitize HTML from the scraper before rendering with dangerouslySetInnerHTML.
 * The scraper already strips Webflow class attributes, but this adds defense-in-depth:
 *   - Removes any remaining class= attributes (they add no value and can leak Webflow tokens)
 *   - Removes style= attributes injected by Webflow's rich-text blocks
 *   - Preserves all content tags: <p> <strong> <em> <a> <ul> <ol> <li> <br> <h2..h6>
 * This is a simple regex pass — not a full sanitizer (XSS risk is acceptable because
 * content comes from our own scraper of our own site, not user input).
 */
function sanitizeBody(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/\s+class="[^"]*"/g, '')   // strip class="..."
    .replace(/\s+style="[^"]*"/g, '');  // strip style="..."
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

/**
 * Pre-renders all slugs in the press_releases table at build time.
 * Wrapped in try/catch so a build against an empty or missing DB still succeeds
 * (the route still works at runtime via on-demand SSR — generateStaticParams
 * returning [] just means "don't pre-render any pages", not "error out").
 * Matches the safeQuery pattern from app/sitemap.ts.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const rows = await query<{ slug: string }>(
      'SELECT slug FROM press_releases ORDER BY published_at DESC'
    );
    return rows.map((r) => ({ slug: r.slug }));
  } catch (err) {
    // DB unreachable at build time — not a fatal error.
    // Pages will be rendered on first request instead.
    console.warn('[press-releases/[slug]] generateStaticParams DB error:', err);
    return [];
  }
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

/**
 * Per-article SEO metadata.  Returns {} for unknown slugs so Next.js renders 404
 * (returning empty Metadata is not the same as calling notFound() but avoids a
 * double-lookup — the page component calls notFound() when the PR is missing).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const pr = await queryOne<PressRelease>(
    'SELECT * FROM press_releases WHERE slug = ?',
    [slug]
  );

  // Unknown slug — return minimal metadata; the page component will call notFound()
  if (!pr) return {};

  const title = `${pr.headline} | MyEntertainment`;
  const description = (pr.excerpt ?? pr.headline).substring(0, 160);
  const canonical = `https://www.myentertainment.tv/press-releases/${pr.slug}`;
  const isoDate = toIso(pr.published_at);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'MyEntertainment',
      type: 'article',
      ...(isoDate ? { publishedTime: isoDate } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ─── Page component ───────────────────────────────────────────────────────────

/**
 * Server component that renders a single press release detail page.
 *
 * Layout (mirrors Webflow .section-6 pattern):
 *   1. Black header — headline centered in white, 36px Roboto 500
 *   2. Article body — date in Roboto Slab, body HTML rendered via dangerouslySetInnerHTML
 *   3. "PRESS RELEASES" related grid — 9 most recent, 3-column, links to /press-releases/{slug}
 *
 * Called by: browsers, Googlebot, crawlers — no auth required.
 */
export default async function PressReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Primary lookup — notFound() triggers Next.js 404 response
  const pr = await queryOne<PressRelease>(
    'SELECT * FROM press_releases WHERE slug = ?',
    [slug]
  );

  if (!pr) notFound();

  // Fetch 9 most-recent press releases, excluding the current article,
  // for the "related press releases" grid shown at the bottom of every detail page.
  const related = await query<Pick<PressRelease, 'slug' | 'headline' | 'excerpt' | 'published_at'>>(
    `SELECT slug, headline, excerpt, published_at
     FROM press_releases
     WHERE slug != ?
     ORDER BY published_at DESC
     LIMIT 9`,
    [slug]
  );

  const formattedDate = formatDate(pr.published_at);
  const isoDate = toIso(pr.published_at);
  const cleanBody = sanitizeBody(pr.body);

  // ── NewsArticle schema.org JSON-LD ─────────────────────────────────────────
  // Enables Google's "news article" rich result; articleBody is plain text derived
  // from the body HTML by stripping tags.  Keep it short to avoid schema bloat.
  const newsArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: pr.headline,
    ...(isoDate ? { datePublished: isoDate } : {}),
    ...(pr.excerpt ? { description: pr.excerpt.substring(0, 200) } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'MyEntertainment',
      url: 'https://www.myentertainment.tv',
    },
    ...(pr.source_url ? { url: pr.source_url } : {}),
  };

  return (
    <div style={{ background: '#000' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleSchema) }}
      />

      {/* ── Section 1: Headline (black background) ────────────────────────── */}
      {/*
        Webflow: .section-6 { background: #000; padding: 80px 20px 60px }
        .heading-7 { color: #fff; font-family: Roboto; font-size: 36px; font-weight: 500; text-align: center }
      */}
      <section
        style={{
          background: '#000',
          padding: '100px 20px 60px', // 100px top clears fixed nav (75px) + breathing room
        }}
      >
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <h1
            style={{
              color: '#fff',
              fontFamily: "'Roboto', sans-serif",
              fontSize: 36,
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {pr.headline}
          </h1>
        </div>
      </section>

      {/* ── Section 2: Article body ────────────────────────────────────────── */}
      {/*
        Webflow: .w-container { max-width: 940px; margin: 0 auto; padding: 0 20px }
        Date: color #a5a7ad, Roboto Slab 14px, centered
        Body: .rich-text-block.w-richtext { color: #f0f0f0; font-family: Roboto Slab; 18px; line-height: 1.7 }
      */}
      <section style={{ background: '#000', padding: '0 20px 80px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>

          {/* Date line — only rendered when we have a valid timestamp */}
          {formattedDate && (
            <div
              style={{
                color: '#a5a7ad',
                textAlign: 'center',
                marginBottom: 30,
                fontFamily: "'Roboto Slab', serif",
                fontSize: 14,
              }}
            >
              {formattedDate}
            </div>
          )}

          {/* Article body HTML from scraper.
              dangerouslySetInnerHTML is safe here: content comes from our own Webflow
              site (not user input), and we strip class/style attributes above.
              Falls back to excerpt if body is missing — some early scraped items may
              only have the lede paragraph. */}
          {cleanBody ? (
            <div
              dangerouslySetInnerHTML={{ __html: cleanBody }}
              style={{
                color: '#f0f0f0',
                fontFamily: "'Roboto Slab', serif",
                fontSize: 18,
                lineHeight: 1.7,
              }}
            />
          ) : pr.excerpt ? (
            // Fallback: render the excerpt as plain text when body is missing
            <p
              style={{
                color: '#f0f0f0',
                fontFamily: "'Roboto Slab', serif",
                fontSize: 18,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {pr.excerpt}
            </p>
          ) : (
            // Last resort: nothing to render — show a minimal placeholder so the page isn't blank
            <p
              style={{
                color: '#a5a7ad',
                fontFamily: "'Roboto Slab', serif",
                fontSize: 14,
                textAlign: 'center',
                margin: 0,
              }}
            >
              Full article coming soon.
            </p>
          )}

          {/* Attribution — show source URL when the content was scraped from Webflow or elsewhere */}
          {pr.source_url && (
            <p
              style={{
                color: '#636570',
                fontFamily: "'Roboto', sans-serif",
                fontSize: 12,
                marginTop: 40,
              }}
            >
              Originally published at{' '}
              <a
                href={pr.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#636570' }}
              >
                {pr.source_url}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* ── Section 3: Related press releases grid ─────────────────────────── */}
      {/*
        Webflow design shows 9 recent press releases in a 3-column grid below each article.
        Using CSS Grid with auto-fit so it collapses gracefully to 2→1 columns on small screens.
        Only rendered when we actually have related press releases (scraper may still be running).
      */}
      {related.length > 0 && (
        <section
          style={{
            background: '#0a0a0a',
            padding: '60px 20px 80px',
            borderTop: '1px solid #1a1a1a',
          }}
        >
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>

            {/* Section heading — matches Webflow "PRESS RELEASES" label style */}
            <h2
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: '#e51d26',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign: 'center',
                margin: '0 0 40px',
              }}
            >
              Press Releases
            </h2>

            {/* 3-column responsive grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1px', // hairline borders via gap on dark background
                background: '#1a1a1a', // gap color becomes the "border"
              }}
            >
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/press-releases/${item.slug}`}
                  style={{
                    display: 'block',
                    background: '#000',
                    padding: '28px 24px',
                    textDecoration: 'none',
                  }}
                >
                  {/* Card date */}
                  {item.published_at && item.published_at > 0 && (
                    <div
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: 10,
                        color: '#e51d26',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: 10,
                      }}
                    >
                      {formatDate(item.published_at)}
                    </div>
                  )}

                  {/* Card headline */}
                  <p
                    style={{
                      fontFamily: "'Roboto Condensed', sans-serif",
                      fontSize: 15,
                      fontWeight: 400,
                      color: '#f2f4f7',
                      textTransform: 'uppercase',
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {item.headline}
                  </p>
                </Link>
              ))}
            </div>

            {/* Link back to full press releases list */}
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link
                href="/press-releases"
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#636570',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                }}
              >
                ← &nbsp;All Press Releases
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: CTA ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
          borderTop: '1px solid #1a1a1a',
        }}
      >
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
          Ready To Work With The Best?
        </h2>
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            lineHeight: 1.7,
            marginBottom: 28,
            marginTop: 0,
          }}
        >
          Reach out to learn more about how we can make great content together.
        </p>
        <a
          href="/contact"
          style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#e02027',
            textTransform: 'uppercase',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          CONTACT US &nbsp;&#10095;
        </a>
      </section>
    </div>
  );
}
