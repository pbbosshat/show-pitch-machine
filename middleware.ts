// Route protection middleware — redirects unauthenticated requests to /login.
// Runs at the edge (no Node.js APIs); only checks cookie presence.
// Full session validation happens inside each API route via getSessionUser().

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Exact paths that are always public
const PUBLIC_PATHS = new Set(['/', '/login', '/forgot-password', '/reset-password']);
// Path prefixes that are always public
const PUBLIC_PREFIXES = ['/site', '/portal', '/api/auth', '/_next', '/favicon.ico'];

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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
