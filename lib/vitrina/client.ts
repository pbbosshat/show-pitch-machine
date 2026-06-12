// Vitrina API client — wraps the VIQI AI endpoint.
// VIQI is Vitrina's multi-agent entertainment intelligence tool. It spins up
// parallel agents (Company Profiler, Person Profiler, Deals Analyst, etc.)
// and streams back a synthesized answer.
//
// Endpoint: POST https://app.vitrina.ai/api/v1/cmd/viqi4
// Auth:     Bearer <Cognito access token>  (managed by lib/vitrina/auth.ts)
// Response: Server-Sent Events stream — data: lines, terminated by data: [DONE]

import { v4 as uuidv4 } from 'uuid';
import { getVitrinaAuth } from './auth';

const VIQI_URL = 'https://app.vitrina.ai/api/v1/cmd/viqi4';

// Shawn's Vitrina profile — required by every VIQI request.
// pintRoles must include "VIQI" for the endpoint to accept the request.
const VITRINA_USER = {
  id: '66fd40145c57b43066ba1884',
  hubspotId: '',
  userName: 'sm@gototeam.com',
  email: 'sm@gototeam.com',
  firstName: 'Shawn',
  lastName: 'Moffatt',
  fullName: 'Shawn Moffatt',
  status: 'FORCE_CHANGE_PASSWORD',
  enabled: true,
  roles: ['PINT'],
  createDate: 1727873043,
  lastModifiedDate: 1776922538720,
  tenantCode: '66fd40135c57b43066ba1881',
  address: '',
  job: {
    title: 'CEO',
    location: { country: 'United States of America', city: 'New York' },
  },
  phone: { phoneNumber: 8434608330, countryCode: 1, countryShort: 'US' },
  profileImageURL:
    'https://psl-vtr-user-profile-prod.s3.us-east-2.amazonaws.com/user/66fd40145c57b43066ba1884/profile_pic/profilePic.jpeg',
  companyId: 'b98d726c391a763698175906a22e079775e50c36f6663f912f9a6a0e',
  companyName: 'MY Entertainment',
  lookingFor:
    'Looking for Co-Production Partners, Deal makers, data on unscripted show sales in the us',
  persona: {
    personaType: 'C-Level Exec',
    personaSubType: 'Content Strategy',
    personaDescription: '',
  },
  ndaStatus: false,
  deleteProfilePic: false,
  pintRoles: [
    'VIQI',
    'COMPANY_MANAGER',
    'CONTENT_MANAGER',
    'PERSON_MANAGER',
    'STORE_FRONT_EDITOR',
    'PINT_VIEWER',
  ],
  personAssociated: ['90b4f94ec5e3e71ba9fea53258350447f20ce343f5bd50bba62f8d5e'],
};

export async function queryViqi(query: string): Promise<string> {
  const { idToken, accessToken, source } = await getVitrinaAuth();

  const res = await fetch(VIQI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Vitrina API auth scheme (verified against the live web app): the ID token
      // goes in Authorization, the access token in X-vtr-auth-at, plus the source
      // header. Omitting the source / using the access token here => 401 "Invalid source".
      Authorization: `Bearer ${idToken}`,
      'X-vtr-auth-at': accessToken,
      'X-vtr-auth-src': source,
    },
    body: JSON.stringify({
      query,
      user_details: VITRINA_USER,
      request_id: uuidv4(),
      conversation_id: uuidv4(),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`[vitrina] VIQI ${res.status}: ${errBody.substring(0, 200)}`);
  }

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('text/event-stream')) {
    return collectSSEStream(res);
  }

  // Non-streaming JSON response (some VIQI versions return the full answer at once)
  const json = await res.json().catch(() => null);
  if (json) return typeof json === 'string' ? json : JSON.stringify(json, null, 2);

  return await res.text();
}

// Read an SSE stream and extract the substantive text answer.
// VIQI streams agent status events first, then the final synthesized answer.
// We accumulate all text content chunks; the caller (Claude) ignores status noise.
async function collectSSEStream(res: Response): Promise<string> {
  if (!res.body) return '';

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let raw = '';

  // 270-second hard cap — VIQI multi-agent synthesis can take 2-5 minutes;
  // must stay under the 300s maxDuration set on the route handler
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error('[vitrina] Stream timeout after 270s')), 270_000)
  );

  try {
    await Promise.race([
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
        }
      })(),
      timeout,
    ]);
  } catch (e) {
    if ((e as Error).message?.includes('timeout')) {
      console.warn('[vitrina] Stream timed out — returning partial result');
    } else {
      throw e;
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  // Parse SSE events: each meaningful line starts with "data: "
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;

    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;

      // Extract text from common streaming JSON shapes
      const content =
        (parsed.content as string | undefined) ??
        (parsed.text as string | undefined) ??
        ((parsed.delta as Record<string, unknown> | undefined)?.content as string | undefined) ??
        ((parsed.choices as Array<{ delta?: { content?: string }; message?: { content?: string } }> | undefined)?.[0]
          ?.delta?.content) ??
        ((parsed.choices as Array<{ delta?: { content?: string }; message?: { content?: string } }> | undefined)?.[0]
          ?.message?.content);

      if (typeof content === 'string' && content.trim()) {
        chunks.push(content);
      }
    } catch {
      // Not JSON — treat as raw text (skip obvious status/UI markers)
      if (payload && !payload.startsWith('{') && payload.length > 5) {
        chunks.push(payload);
      }
    }
  }

  // If SSE parsing yielded something, return it; otherwise fall back to raw text
  if (chunks.length > 0) return chunks.join('');

  // Raw fallback: strip SSE framing and return the text content
  const stripped = raw
    .split('\n')
    .filter(l => l.startsWith('data:'))
    .map(l => l.slice(5).trim())
    .filter(l => l && l !== '[DONE]')
    .join('\n');

  return stripped || raw.substring(0, 8_000);
}
