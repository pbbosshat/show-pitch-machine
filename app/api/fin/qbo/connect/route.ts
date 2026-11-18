/**
 * GET /api/fin/qbo/connect (admin) — start the Intuit OAuth flow.
 * Sets a short-lived httpOnly state cookie and redirects to Intuit's consent page.
 * The state is bound to this admin session (see lib/fin/qbo/oauth.ts).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getFinSessionToken, requireFinAdmin } from '@/lib/fin/auth';
import {
  QBO_STATE_COOKIE,
  QBO_STATE_MAX_AGE_SECONDS,
  appOriginFromRedirectUri,
  isQboConfigured,
} from '@/lib/fin/qbo/config';
import { buildAuthorizeUrl, createOAuthState } from '@/lib/fin/qbo/oauth';

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const back = new URL('/admin/quickbooks', appOriginFromRedirectUri(req.nextUrl.origin));
  if (!isQboConfigured()) {
    back.searchParams.set('error', "QuickBooks isn't configured yet.");
    return NextResponse.redirect(back);
  }

  const sessionToken = await getFinSessionToken(req);
  const { nonce, state } = createOAuthState(sessionToken!);
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set(QBO_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must survive the top-level redirect back from Intuit
    path: '/api/fin/qbo',
    maxAge: QBO_STATE_MAX_AGE_SECONDS,
  });
  return res;
}
