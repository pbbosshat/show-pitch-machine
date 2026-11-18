/**
 * GET /api/fin/qbo/callback — Intuit redirects here after the admin approves.
 * Middleware lets this through; it does its own checks:
 *   1. a signed-in ADMIN (mye_admin_session) — else redirect to /admin/login (or /admin),
 *   2. `state` matches the state cookie AND the HMAC bound to this admin session (CSRF),
 * then exchanges the code for tokens, saves realmId + tokens, and fills the list cache.
 * If it is a different QuickBooks company than last time, the old company's ids are
 * cleared first and ?switched=<charges reset> is added so the page can say so.
 * Always ends with a redirect back to /admin/quickbooks with ?connected=1 or ?error=….
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getFinSessionToken, getFinUser } from '@/lib/fin/auth';
import { QBO_STATE_COOKIE, appOriginFromRedirectUri, isQboConfigured } from '@/lib/fin/qbo/config';
import { saveNewConnection } from '@/lib/fin/qbo/connection';
import { refreshLists } from '@/lib/fin/qbo/lists';
import { exchangeAuthorizationCode, verifyOAuthState } from '@/lib/fin/qbo/oauth';

export async function GET(req: NextRequest) {
  const origin = appOriginFromRedirectUri(req.nextUrl.origin);
  const back = new URL('/admin/quickbooks', origin);

  const done = () => {
    const res = NextResponse.redirect(back);
    res.cookies.set(QBO_STATE_COOKIE, '', { path: '/api/fin/qbo', maxAge: 0 });
    return res;
  };
  const fail = (msg: string) => {
    back.searchParams.set('error', msg);
    return done();
  };

  const user = await getFinUser(req);
  if (!user) return NextResponse.redirect(new URL('/admin/login', origin));
  if (user.role !== 'admin') return NextResponse.redirect(new URL('/admin', origin));
  if (!isQboConfigured()) return fail("QuickBooks isn't configured yet.");

  const p = req.nextUrl.searchParams;
  const state = p.get('state');
  const ok = verifyOAuthState(state, req.cookies.get(QBO_STATE_COOKIE)?.value, await getFinSessionToken(req));
  if (!ok) return fail('The QuickBooks sign-in link expired or did not come from this browser. Click Connect again.');

  const intuitError = p.get('error');
  if (intuitError) {
    return fail(intuitError === 'access_denied' ? 'QuickBooks connection was cancelled.' : `QuickBooks said: ${intuitError}`);
  }
  const code = p.get('code');
  const realmId = p.get('realmId');
  if (!code || !realmId) return fail('QuickBooks did not send back a company. Click Connect again.');

  let saved: Awaited<ReturnType<typeof saveNewConnection>>;
  try {
    const tokens = await exchangeAuthorizationCode(code);
    saved = await saveNewConnection(realmId, tokens, user.id);
  } catch (err) {
    return fail((err as Error).message);
  }

  back.searchParams.set('connected', '1');
  // Different QuickBooks company than last time: the old Account/Class ids were
  // cleared (see saveNewConnection). The QuickBooks page shows this once.
  if (saved.companyChanged) back.searchParams.set('switched', String(saved.chargesReset));
  try {
    await refreshLists();
  } catch (err) {
    back.searchParams.set('warning', `Connected, but loading the account and Class lists failed: ${(err as Error).message}`);
  }
  return done();
}
