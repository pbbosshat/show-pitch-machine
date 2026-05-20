'use client';

/* ============================================================
   SubmissionDownloadLink — tracks the Submission Release Form
   PDF download as a GA4 download_epk conversion event.

   WHY a separate client component: contact/page.tsx is a Server
   Component. This thin 'use client' wrapper lets us attach an
   onClick handler to the download anchor without converting the
   entire page to a client component.

   The submission release form download is the closest functional
   equivalent to an EPK download on this page — a visitor who
   downloads the form is signalling intent to formally pitch a show,
   which is a high-intent lead action. We map it to download_epk
   (the taxonomy event) rather than a bespoke event name so that GA4
   Key Event configuration stays at exactly four events per domain.

   Mark download_epk as a Key Event in GA4 Admin:
   properties/486537975 → Admin → Events → download_epk → toggle on.
   ============================================================ */

import { trackEpkDownload } from '@/lib/analytics';

interface SubmissionDownloadLinkProps {
  href: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function SubmissionDownloadLink({
  href,
  style,
  children,
}: SubmissionDownloadLinkProps) {
  /* Fire download_epk on click — not on actual file receipt, because
     there is no browser hook for "file fully downloaded". The click is
     the intent signal and is consistent with how GA4 enhanced measurement
     itself tracks file_download events (anchor click, not transfer complete).

     Edge case — right-click → Save As: the contextmenu event does not
     trigger onClick, so Save As downloads are not tracked. This is
     acceptable; Save As is rare and the download_epk count will be a
     conservative undercount rather than an overcount. */
  function handleClick() {
    trackEpkDownload({
      // show_slug is 'submission-release-form' because this download is not
      // tied to a specific show slug — it's a generic pitch submission form.
      // Using a descriptive constant here keeps the GA4 Exploration filter
      // "show_slug = submission-release-form" clean and queryable.
      showSlug: 'submission-release-form',
      showGenre: 'pitch',
    });
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      style={style}
      aria-label="Download the MY Entertainment Submission Release Form (PDF)"
    >
      {children}
    </a>
  );
}
