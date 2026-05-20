'use client';

/* ============================================================
   ShowPageTracker — fires GA4 events for /shows/[slug] pages.

   WHY a separate client component: the show detail page
   (app/(public)/shows/[slug]/page.tsx) is a Server Component so
   it cannot use useEffect or onClick handlers directly. This thin
   'use client' wrapper handles all analytics for that page and is
   imported at the bottom of the server component's JSX tree.

   Events fired:
   1. view_show_page — on mount (useEffect), engagement only.
      Do NOT mark as Key Event in GA4 Admin.
   2. request_buyers_pack — on "Contact Us" CTA click.
      Mark as Key Event in GA4 Admin (properties/486537975).
      The "Contact Us" CTA on a show detail page is the highest-
      intent action a TV buyer or distributor takes — it is the
      functional equivalent of a buyers-pack request even before
      a dedicated /buyers page exists.
   ============================================================ */

import { useEffect } from 'react';
import Link from 'next/link';
import { trackShowPageView, trackBuyersPackRequest } from '@/lib/analytics';

interface ShowPageTrackerProps {
  showSlug: string;
  showGenre?: string;
  /** Children rendered inside the CTA button — passed through unchanged. */
  ctaChildren: React.ReactNode;
  /** href for the CTA link — typically '/contact'. */
  ctaHref: string;
  /** Inline style forwarded to the CTA anchor element unchanged. */
  ctaStyle?: React.CSSProperties;
}

export default function ShowPageTracker({
  showSlug,
  showGenre,
  ctaChildren,
  ctaHref,
  ctaStyle,
}: ShowPageTrackerProps) {
  /* Fire view_show_page once on mount.
     The empty dependency array ensures this runs exactly once per
     page load, not on every re-render. SPA soft-navigation to a
     different show slug will re-mount this component (Next.js App
     Router unmounts on slug change) so there is no risk of the wrong
     slug being logged on navigation. */
  useEffect(() => {
    trackShowPageView({ showSlug, showGenre });
  }, [showSlug, showGenre]);

  /* request_buyers_pack fires on CTA click.
     This is the conversion event — mark it as a Key Event in GA4
     Admin (properties/486537975). It fires on the click, not on a
     subsequent form submission, because the CTA navigates to /contact
     rather than submitting in-place. The click itself is the highest-
     intent signal available on a show detail page. */
  function handleCtaClick() {
    trackBuyersPackRequest({
      showSlug,
      sourceSection: 'show-detail-cta',
    });
  }

  return (
    <Link
      href={ctaHref}
      style={ctaStyle}
      onClick={handleCtaClick}
      aria-label={`Contact MY Entertainment about ${showSlug}`}
    >
      {ctaChildren}
    </Link>
  );
}
