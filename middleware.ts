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
  // B2B work-with-us landing page (Option A SEO sprint, 2026-05-22)
  '/work-with-us',
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
  // Also skip common public-folder static assets (images, fonts, etc.)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)).*)'],
};
