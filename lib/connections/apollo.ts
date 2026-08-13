// Apollo people-match: source a verified email + LinkedIn URL for a lead.
//
// Uses the Assignment Desk Apollo account key (HARD RULE: never 1@gototeam.com).
// Key comes from APOLLO_API_KEY env, else the local key file. Misses cost 0
// credits, so tiering (Tier 3 = no Apollo call) is the cost control.
//
// The email is only trustworthy when email_status === 'verified'; the connect
// endpoint gates the email send on that. linkedin_url is returned on any hit.

import fs from 'node:fs';

// Local dev fallback only — the key file the apollo-enrich skill maintains on
// PB's workstation. It does NOT exist on Railway (or on any other machine), so
// production MUST provide APOLLO_API_KEY.
const APOLLO_KEY_FILE =
  'C:/Users/pb/Documents/Claude Code Local/CT/Matt Manufacturing Campaign/campaign/.apollo_key';

/**
 * Resolve the Apollo key: env first, then the local key file.
 *
 * WHY THE EXPLICIT ERROR: when APOLLO_API_KEY was unset in production this fell
 * through to readFileSync on a Windows path that cannot exist there. The raw
 * ENOENT ("no such file or directory, open 'C:/Users/pb/...'") was caught
 * upstream and written verbatim into connection_leads.email_status, so the UI
 * showed a filesystem error where a contact status belonged, and every lead
 * silently ended up with no email and no linkedin_url — which in turn made
 * Connect Selected skip 100% of rows (email needs email_status='verified',
 * LinkedIn needs a linkedin_url). Nothing ever queued and nothing ever sent.
 *
 * Naming the missing env var directly makes that a two-minute config fix
 * instead of a filesystem red herring.
 */
function apolloKey(): string {
  const fromEnv = process.env.APOLLO_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  try {
    const fromFile = fs.readFileSync(APOLLO_KEY_FILE, 'utf-8').trim();
    if (fromFile) return fromFile;
  } catch {
    // fall through to the explicit error below
  }

  throw new Error(
    'APOLLO_API_KEY is not set. Apollo enrichment cannot run without it, so no ' +
      'lead will get an email address or LinkedIn URL. Set APOLLO_API_KEY in the ' +
      'Railway service variables (Assignment Desk Apollo account — never 1@gototeam.com).'
  );
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
