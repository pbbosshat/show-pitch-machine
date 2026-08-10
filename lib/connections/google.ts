// Service-account (domain-wide delegation) access for the Daily Connections
// pipeline, implemented with RAW fetch (not the googleapis SDK).
//
// Why raw fetch: the googleapis/gaxios client reuses keep-alive sockets that
// prematurely close in this runtime ("Premature close" on the oauth2 token
// endpoint on every call), which broke Gmail/Calendar dedup. Minting the JWT
// ourselves and calling the REST APIs with `Connection: close` is rock-solid,
// the same fix we used for Groq. Same service account and key source as
// lib/gmail.ts (GOOGLE_SERVICE_ACCOUNT_JSON on Railway, or the local key file).
//
// Scopes verified live 2026-08-10 for sm@gototeam.com: gmail.readonly and
// calendar.readonly granted; gmail.send NOT yet granted (mintGoogleAccessToken
// throws the exact Google error for that scope until PB adds it to the DWD grant).

import crypto from 'node:crypto';
import fs from 'node:fs';

// The one mailbox Daily Connections reads (dedup) and sends from. shawnmoffatt@
// is an alias of the same mailbox, so sm@ is the canonical subject.
export const SHAWN_MAILBOX = 'sm@gototeam.com';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

let _key: ServiceAccountKey | null = null;

export function loadServiceAccountKey(): ServiceAccountKey {
  if (_key) return _key;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    : fs.readFileSync(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
          'C:/Users/pb/.claude/google/service_account.json',
        'utf-8'
      );
  const parsed = JSON.parse(raw) as ServiceAccountKey;
  _key = { client_email: parsed.client_email, private_key: parsed.private_key };
  return _key;
}

const b64url = (input: string): string => Buffer.from(input).toString('base64url');

// Cache access tokens per (subject, scopes) until they near expiry, so a build
// that dedups many leads mints one token per scope set, not one per lead.
const tokenCache = new Map<string, { token: string; exp: number }>();

/**
 * Mint a domain-wide-delegation access token for `subject` with `scopes` by
 * signing a JWT with the service account key and exchanging it at Google's
 * token endpoint (raw fetch, Connection: close). Throws the exact Google error
 * (e.g. unauthorized_client when a scope is not granted) so callers surface it.
 */
export async function mintGoogleAccessToken(scopes: string[], subject: string): Promise<string> {
  const cacheKey = `${subject}|${scopes.join(',')}`;
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.exp > now + 60) return cached.token;

  const { client_email, private_key } = loadServiceAccountKey();
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: client_email,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      sub: subject,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(private_key, 'base64url');
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Connection: 'close' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 220)}`);
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error('Google token response had no access_token');

  tokenCache.set(cacheKey, { token: j.access_token, exp: now + (j.expires_in ?? 3600) });
  return j.access_token;
}

/** GET a Google REST API URL with the bearer token and Connection: close. */
export async function googleApiGet<T = unknown>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Connection: 'close' },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 220)}`);
  return (await res.json()) as T;
}
