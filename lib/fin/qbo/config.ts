// QuickBooks Online (Intuit) configuration for MYE Admin.
//
// Env vars (set on Railway — see docs/mye-admin-quickbooks-setup.md):
//   QBO_CLIENT_ID, QBO_CLIENT_SECRET   — from the Intuit developer app (Keys & credentials)
//   QBO_REDIRECT_URI                   — must exactly match a Redirect URI on the Intuit app,
//                                        e.g. https://www.myentertainment.tv/api/fin/qbo/callback
//                                        (use www — the bare domain 301-redirects to www)
//   QBO_ENVIRONMENT                    — 'sandbox' (default) | 'production'
//
// Test-only overrides (IGNORED when NODE_ENV=production, so a stray value can never
// send real tokens somewhere else):
//   QBO_API_BASE    — replaces the accounting API host (e.g. http://127.0.0.1:4555)
//   QBO_OAUTH_BASE  — replaces the three Intuit OAuth hosts; paths stay the same
//                     (/connect/oauth2, /oauth2/v1/tokens/bearer, /v2/oauth2/tokens/revoke)
// They exist so scripts can exercise this code against a local mock of Intuit.
//
// Nothing in this file throws when the vars are missing: the app must keep working
// (upload, tagging from cached lists) and the QuickBooks page says
// "QuickBooks isn't configured yet".

export type QboEnvironment = 'sandbox' | 'production';

export const QBO_SCOPE = 'com.intuit.quickbooks.accounting';
export const QBO_MINOR_VERSION = '75';
/** Cookie holding the OAuth state nonce between /connect and /callback. */
export const QBO_STATE_COOKIE = 'mye_qbo_oauth_state';
export const QBO_STATE_MAX_AGE_SECONDS = 10 * 60;

/** Default name of the Amex liability account the purchases post against. */
export const DEFAULT_CARD_ACCOUNT_NAME = '2200 MCS Show AMEX';

export function qboEnvironment(): QboEnvironment {
  return process.env.QBO_ENVIRONMENT?.trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
}

export function isQboConfigured(): boolean {
  return Boolean(
    process.env.QBO_CLIENT_ID?.trim() &&
      process.env.QBO_CLIENT_SECRET?.trim() &&
      process.env.QBO_REDIRECT_URI?.trim()
  );
}

export interface QboCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class QboNotConfiguredError extends Error {
  constructor() {
    super("QuickBooks isn't configured yet.");
    this.name = 'QboNotConfiguredError';
  }
}

export function qboCredentials(): QboCredentials {
  if (!isQboConfigured()) throw new QboNotConfiguredError();
  return {
    clientId: process.env.QBO_CLIENT_ID!.trim(),
    clientSecret: process.env.QBO_CLIENT_SECRET!.trim(),
    redirectUri: process.env.QBO_REDIRECT_URI!.trim(),
  };
}

function override(name: 'QBO_API_BASE' | 'QBO_OAUTH_BASE'): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  const v = process.env[name]?.trim();
  return v ? v.replace(/\/+$/, '') : null;
}

export function qboApiBase(): string {
  return (
    override('QBO_API_BASE') ??
    (qboEnvironment() === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com')
  );
}

export function qboOAuthUrls(): { authorize: string; token: string; revoke: string } {
  const o = override('QBO_OAUTH_BASE');
  return {
    authorize: `${o ?? 'https://appcenter.intuit.com'}/connect/oauth2`,
    token: `${o ?? 'https://oauth.platform.intuit.com'}/oauth2/v1/tokens/bearer`,
    revoke: `${o ?? 'https://developer.api.intuit.com'}/v2/oauth2/tokens/revoke`,
  };
}

/**
 * Public origin of this app, taken from QBO_REDIRECT_URI so redirects after the
 * OAuth callback land on the real host (req.url can be Railway's internal host).
 */
export function appOriginFromRedirectUri(fallback: string): string {
  try {
    const u = process.env.QBO_REDIRECT_URI?.trim();
    if (u) return new URL(u).origin;
  } catch {
    // fall through
  }
  return fallback;
}
