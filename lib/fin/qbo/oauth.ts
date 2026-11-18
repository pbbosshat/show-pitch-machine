// Intuit OAuth 2.0 (authorization code flow) — pure HTTP + state helpers.
// No DB access here; see connection.ts for storing tokens.
//
// CSRF protection for the callback: /connect generates a random nonce, stores it in
// an httpOnly cookie, and sends Intuit `state = <nonce>.<hmac>` where
// hmac = HMAC-SHA256(client secret, nonce + admin session token). The callback
// accepts only if (1) the cookie nonce equals the state nonce, and (2) the HMAC
// recomputed from the CURRENT admin session matches. So a callback URL can only be
// completed by the same signed-in admin, in the same browser, that started it.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { QBO_SCOPE, qboCredentials, qboOAuthUrls } from './config';

export interface IntuitTokenSet {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires (Intuit: 3600). */
  expiresIn: number;
  /** Seconds until the refresh token expires (Intuit: ~100 days). */
  refreshExpiresIn: number;
}

export class QboOAuthError extends Error {
  constructor(
    message: string,
    /** Intuit's `error` code, e.g. 'invalid_grant' (refresh token expired/revoked). */
    readonly code: string | null = null
  ) {
    super(message);
    this.name = 'QboOAuthError';
  }
}

// ── State ────────────────────────────────────────────────────────────────────

function stateMac(nonce: string, sessionToken: string): string {
  const { clientSecret } = qboCredentials();
  return createHmac('sha256', clientSecret).update(`${nonce}:${sessionToken}`).digest('base64url');
}

/** Returns the nonce (for the cookie) and the full state value (for Intuit). */
export function createOAuthState(sessionToken: string): { nonce: string; state: string } {
  const nonce = randomBytes(24).toString('base64url');
  return { nonce, state: `${nonce}.${stateMac(nonce, sessionToken)}` };
}

export function verifyOAuthState(
  state: string | null | undefined,
  cookieNonce: string | null | undefined,
  sessionToken: string | null | undefined
): boolean {
  if (!state || !cookieNonce || !sessionToken) return false;
  const dot = state.indexOf('.');
  if (dot <= 0) return false;
  const nonce = state.slice(0, dot);
  const mac = state.slice(dot + 1);
  const a = Buffer.from(nonce);
  const b = Buffer.from(cookieNonce);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expected = Buffer.from(stateMac(nonce, sessionToken));
  const got = Buffer.from(mac);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = qboCredentials();
  const u = new URL(qboOAuthUrls().authorize);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', QBO_SCOPE);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

// ── Token endpoint ───────────────────────────────────────────────────────────

function basicAuth(): string {
  const { clientId, clientSecret } = qboCredentials();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function tokenRequest(form: Record<string, string>): Promise<IntuitTokenSet> {
  let res: Response;
  try {
    res = await fetch(qboOAuthUrls().token, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new QboOAuthError(`Couldn't reach Intuit: ${(err as Error).message}`);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof data.access_token !== 'string' || typeof data.refresh_token !== 'string') {
    const code = typeof data.error === 'string' ? data.error : null;
    const desc = typeof data.error_description === 'string' ? data.error_description : `HTTP ${res.status}`;
    throw new QboOAuthError(`Intuit sign-in failed: ${code ?? ''} ${desc}`.trim(), code);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in) || 3600,
    refreshExpiresIn: Number(data.x_refresh_token_expires_in) || 100 * 24 * 3600,
  };
}

export function exchangeAuthorizationCode(code: string): Promise<IntuitTokenSet> {
  const { redirectUri } = qboCredentials();
  return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
}

/** Intuit rotates refresh tokens: the response's refreshToken MUST replace the stored one. */
export function refreshAccessToken(refreshToken: string): Promise<IntuitTokenSet> {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

/** Revoke a token at Intuit (revoking the refresh token ends the whole grant). */
export async function revokeToken(token: string): Promise<void> {
  const res = await fetch(qboOAuthUrls().revoke, {
    method: 'POST',
    headers: { Authorization: basicAuth(), Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new QboOAuthError(`Intuit revoke failed (HTTP ${res.status})`);
}
