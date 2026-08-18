// Route protection middleware — redirects unauthenticated requests to /login.
// Runs at the edge (no Node.js APIs); only checks cookie presence.
// Full session validation happens inside each API route via getSessionUser().

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Exact paths that are always public (including clean public-site URLs via rewrites)
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/setup-account',
  // SEO endpoints — must be reachable by Googlebot/Bingbot without auth, otherwise
  // crawlers see a 307 to /login and the site stops being indexed.
  '/robots.txt',
  '/sitemap.xml',
  // GEO endpoints — llms.txt is the AI-crawler equivalent of robots.txt and
  // gives LLM training and retrieval systems a structured company summary.
  // llms-full.txt is the same idea but with full page content for retrieval-
  // augmented generation. Without these whitelists, the middleware redirects
  // both to /login, making them unreachable to ChatGPT/Claude/Perplexity.
  '/llms.txt',
  '/llms-full.txt',
  // Public site pages rewritten from /site/* — must be listed here so the
  // middleware doesn't intercept them before Next.js rewrites resolve.
  '/shows',
  '/genres',
  '/reel',
  '/about',
  '/available',
  '/international',
  '/press-releases',
  '/faq',
  '/contact',
  '/film-commissions',
  // B2B pitch SEO cluster — public marketing pages (PR #3)
  '/how-to-pitch-a-tv-show',
  '/sizzle-reel',
  '/tv-production-company',
  '/tv-show-pitch-deck',
  // Pillar page for the "tv show pitch" focus keyword (KD1). Was added (PR #9)
  // without its PUBLIC_PATHS entry, so middleware 307'd Googlebot to /login and
  // the page couldn't be crawled or ranked. This entry makes it publicly crawlable.
  '/tv-show-pitch',
  // Keyword-scale pages (2026-05-27): documentary production company page +
  // unscripted-tv-buyers / content-licensing page. Public marketing pages —
  // must be whitelisted or middleware 307s Googlebot to /login (see PR #9/#10).
  '/documentary',
  '/tv-buyers',
  // B2B work-with-us landing page (Option A SEO sprint, 2026-05-22)
  '/work-with-us',
  // New money-keyword pages — seo/mye-pitch-money-2026-06-04:
  //   /tv-distribution-company    — PRIMARY distribution pillar (buyer-intent thesis
  //                                 re-point 2026-06-04); targets "tv distribution company",
  //                                 "tv show distribution", "tv content licensing",
  //                                 "tv format rights", "unscripted tv distribution".
  //                                 MUST be public or Googlebot 307s to /login.
  //   /how-to-sell-a-tv-show-idea — top-of-funnel education (re-framed 2026-06-04)
  //   /tv-pitch-bible             — TV show bible / format bible guide
  //   /unscripted-tv-shows        — genre hub + distribution routing
  // All four must be public or Googlebot gets 307'd to /login.
  '/tv-distribution-company',
  '/how-to-sell-a-tv-show-idea',
  '/tv-pitch-bible',
  '/unscripted-tv-shows',
  // Producer submission / distribution landing page (feature/seo-distribution-page, merged #14).
  // Conversion asset for producers arriving via referral/brand/outreach.
  // Must be public or middleware 307s the visitor to /login.
  '/pitch',
  // Distribution-deal cluster — two new money-keyword pages (seo/mye-distribution-deal-2026-06-07):
  //   /tv-distribution-deal          — targets "tv distribution deal", "how to get tv distribution",
  //                                    "television distribution agreement" (producer research stage)
  //   /independent-film-distribution — targets "independent film distribution", "documentary
  //                                    distribution company", "how to distribute a documentary"
  // Both must be public or Googlebot gets 307'd to /login and the pages can't rank.
  '/tv-distribution-deal',
  '/independent-film-distribution',
  // /how-to-sell-a-tv-show — master pillar spanning pitch through distribution
  // deal (seo/mye-how-to-sell-a-tv-show-2026-07-17). Re-angled from the
  // nightly's original "how to distribute a tv show" proposal (near-zero
  // volume, creator-seeking-distribution framing already owned by
  // /tv-distribution-deal) to the seller-side query cluster real searchers
  // use: "how to sell a tv show" / "how to distribute a tv show" / "how to
  // pitch a tv show". Must be public or Googlebot gets 307'd to /login.
  '/how-to-sell-a-tv-show',
]);

// Path prefixes that are always public
const PUBLIC_PREFIXES = [
  '/site',
  '/portal',
  '/api/auth',
  '/api/dev-session',  // dev-only bypass — blocked in production inside the handler
  '/_next',
  '/favicon.ico',
  '/shows/',          // dynamic show detail pages e.g. /shows/some-slug
  '/press-releases/', // individual press release / article pages
  '/available/',      // buyer pitch deck pages — each has its own deck password gate
  '/api/available/',      // deck password verify endpoint — must be callable without a session
  '/api/contact',         // POST is public (form submission); GET enforces auth inside the handler
  '/api/newsletter',      // POST is public (fan newsletter signup from show pages + /work-with-us)
  '/api/admin/db-restore', // protected by ADMIN_RESTORE_SECRET header, not session cookie
  '/api/admin/backfill-deck-drive', // protected by ADMIN_RESTORE_SECRET header, not session cookie
  '/api/viqi',            // protected by VIQI_PROXY_SECRET header, not session cookie
  '/api/ingest/',         // Bang pushes classified articles here via INGEST_API_KEY (no session)
  '/api/cron/',             // cron endpoints protected by CRON_SECRET Bearer, not session cookie
  '/api/connections/queue', // Bubba LinkedIn engine polls the connect queue via INGEST_API_KEY Bearer, not a session cookie. Covers /queue and /queue/result. The session-gated connections routes (/build, /connect, list, /[id]) are NOT matched by this prefix.
  '/api/export/conversions', // SEO attribution export — protected by CONV_EXPORT_TOKEN Bearer auth inside the handler, not session cookie
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get('spm_session')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original destination so we can redirect back after login
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Also skip common public-folder static assets (images, fonts, documents).
  //
  // pdf/txt/xml MUST stay in this list. Anything served from public/ that is not
  // excluded here falls through to the session check below and is 307'd to
  // /login — so a public download link silently sends visitors to the staff
  // login screen instead of the file. That is exactly what happened to
  // /submission-release-form.pdf (linked from /contact, /work-with-us and the
  // Submissions Release block) and to /pitch-deck-template.pdf (linked from
  // /tv-show-pitch-deck): both existed in public/ and both were unreachable.
  //
  // txt and xml cover public/llms.txt, public/llms-full.txt and any static XML;
  // robots.txt and sitemap.xml are generated routes rather than files, but are
  // covered here too so crawlers can never be bounced to /login.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|pdf|txt|xml)).*)'],
};
