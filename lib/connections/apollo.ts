// Apollo people-match: source a verified email + LinkedIn URL for a lead.
//
// Uses the Assignment Desk Apollo account key (HARD RULE: never 1@gototeam.com).
// Key comes from APOLLO_API_KEY env, else the local key file. Misses cost 0
// credits, so tiering (Tier 3 = no Apollo call) is the cost control.
//
// The email is only trustworthy when email_status === 'verified'; the connect
// endpoint gates the email send on that. linkedin_url is returned on any hit.

import fs from 'node:fs';

const APOLLO_KEY_FILE =
  'C:/Users/pb/Documents/Claude Code Local/CT/Matt Manufacturing Campaign/campaign/.apollo_key';

function apolloKey(): string {
  const fromEnv = process.env.APOLLO_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  // Local dev fallback: read the key file the apollo-enrich skill maintains.
  return fs.readFileSync(APOLLO_KEY_FILE, 'utf-8').trim();
}

export interface ApolloResult {
  email: string | null;
  email_status: string | null; // 'verified' | 'unavailable' | 'guessed' | ...
  linkedin_url: string | null;
  credits_consumed: number | null;
}

interface ApolloMatch {
  email?: string | null;
  email_status?: string | null;
  linkedin_url?: string | null;
}

interface ApolloResponse {
  matches?: ApolloMatch[];
  people?: ApolloMatch[];
  credits_consumed?: number;
}

export async function apolloMatch(
  first: string,
  last: string,
  organization: string
): Promise<ApolloResult> {
  const res = await fetch('https://api.apollo.io/api/v1/people/bulk_match', {
    method: 'POST',
    headers: {
      // x-api-key header auth (URL-param auth is deprecated per the skill).
      'x-api-key': apolloKey(),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      details: [{ first_name: first, last_name: last, organization_name: organization }],
      reveal_personal_emails: false,
    }),
  });

  if (!res.ok) {
    // Surface the exact Apollo error (status + body) so it reaches the UI.
    throw new Error(`Apollo ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json = (await res.json()) as ApolloResponse;
  const m = json.matches?.[0] ?? json.people?.[0] ?? null;
  const emailStatus = m?.email_status ?? null;

  return {
    // Keep the email even if not verified so the UI can show status accurately;
    // the send gate (connect route) is what enforces verified-only.
    email: m?.email ?? null,
    email_status: emailStatus,
    linkedin_url: m?.linkedin_url ?? null,
    credits_consumed: typeof json.credits_consumed === 'number' ? json.credits_consumed : null,
  };
}
