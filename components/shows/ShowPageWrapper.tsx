/**
 * ShowPageWrapper — server component that wraps every show page (both custom
 * OneSheet variants and the generic AvailablePackageClient fallback) with:
 *
 *  1. JSON-LD WebPage schema with relatedLink pointing to the 4 B2B money pages.
 *     WHY: relatedLink is a schema.org property that explicitly tells crawlers
 *     "these pages are semantically related" — stronger signal than an
 *     anonymous <a> tag alone. Google uses structured data to understand site
 *     topology, so adding relatedLink accelerates PageRank flow to the money pages.
 *
 *  2. BuyerCTA feeder block below the show content.
 *     WHY: see BuyerCTA.tsx for the full anchor-variation rationale. The block
 *     is placed *after* children so the show pitch is never interrupted.
 *
 * This wrapper is server-rendered so the JSON-LD script tag is in the initial
 * HTML, visible to Googlebot without JavaScript execution.
 *
 * Usage in page.tsx:
 *   return (
 *     <ShowPageWrapper title={safeTitle}>
 *       <SomeOneSheetComponent title={safeTitle} />
 *     </ShowPageWrapper>
 *   );
 *
 * NOTE: AvailablePackageClient (the generic fallback) already imports BuyerCTA
 * directly because it is a client component and cannot receive a server wrapper
 * around its internal layout without a refactor. The JSON-LD is still injected
 * here for the generic path — see page.tsx for the hybrid approach.
 */

import { JsonLd } from '@/components/site/JsonLd';
import BuyerCTA from '@/components/shows/BuyerCTA';

// The B2B money pages — sizzleReel/howToPitch/prodCo/pitchDeck must match
// routes shipped in PR #3. /tv-distribution-company added 2026-07-01: it is
// the PRIMARY distribution money-keyword pillar (sitemap priority 1.0) but
// was missing from this relatedLink structured-data signal on every one of
// the ~60 show pages — the same gap fixed in BuyerCTA.tsx and SiteFooter.tsx.
// Listed here as a const so they appear in one canonical place and
// are trivially auditable if slugs ever change.
const MONEY_PAGE_URLS = [
  'https://www.myentertainment.tv/sizzle-reel',
  'https://www.myentertainment.tv/how-to-pitch-a-tv-show',
  'https://www.myentertainment.tv/tv-production-company',
  'https://www.myentertainment.tv/tv-show-pitch-deck',
  'https://www.myentertainment.tv/tv-distribution-company',
] as const;

interface Props {
  title: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  children: React.ReactNode;
  /** Set true when the child already renders BuyerCTA internally (e.g.
   *  AvailablePackageClient) so we don't render a duplicate block. */
  noExtraCta?: boolean;
}

export default function ShowPageWrapper({
  title,
  slug,
  imageUrl,
  description,
  children,
  noExtraCta = false,
}: Props) {
  // WebPage JSON-LD for this show page.
  // relatedLink tells Google these 4 money pages are editorially related —
  // this is a direct structured-data signal, not just an implicit link.
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${title} | MY Entertainment`,
    url: `https://www.myentertainment.tv/available/${slug}`,
    // description is optional — only include when we have real copy
    ...(description ? { description: description.slice(0, 300) } : {}),
    // thumbnailUrl helps Google display the show image in rich results
    ...(imageUrl ? { thumbnailUrl: imageUrl } : {}),
    isPartOf: {
      '@type': 'WebSite',
      name: 'MY Entertainment',
      url: 'https://www.myentertainment.tv',
    },
    // relatedLink: explicit editorial signal to crawlers that the money pages
    // are semantically connected to this show page. Google uses this to
    // understand site topology and flow PageRank accordingly.
    relatedLink: MONEY_PAGE_URLS,
  };

  return (
    <>
      {/* JSON-LD injected server-side — crawlers see it in raw HTML */}
      <JsonLd data={webPageSchema} />

      {/* The actual show page content (OneSheet or generic client) */}
      {children}

      {/* Buyer feeder block — always after show content, never before.
          Uses slug for deterministic anchor-text variant selection.
          Skipped when noExtraCta=true because the child already renders
          BuyerCTA internally (e.g. AvailablePackageClient). */}
      {!noExtraCta && <BuyerCTA title={title} slug={slug} />}
    </>
  );
}
