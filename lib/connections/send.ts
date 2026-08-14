// Outbound email for the Connect action, sent as Shawn (sm@gototeam.com) via a
// minted service-account token (domain-wide delegation) and a RAW Gmail REST
// call with Connection: close (consistent with dedup; avoids the SDK premature
// close).
//
// ── Why this tries several scopes ───────────────────────────────────────────
// Sending a Gmail message only requires that the DWD grant include ONE of these
// scopes; `messages.send` is permitted by gmail.send, by gmail.modify, and by
// the full mail scope. When this was first built only gmail.send was requested,
// and it was not in the Workspace DWD grant for this service account — so every
// send failed with unauthorized_client and no email ever went out.
//
// Assignment Desk's Gmail integration (src/lib/gmail-integration.ts there) has
// worked for a long time on gmail.modify, so the grant shape differs per service
// account. Rather than hard-code one guess, we try each send-capable scope in
// order and use the first the Workspace actually grants. If none are granted we
// throw a single error naming every scope tried and the exact Google reason, so
// the failure is actionable ("ask the Workspace admin to add scope X for client
// ID Y") instead of an opaque unauthorized_client.
//
// Once any one of these scopes is added to the DWD grant this starts working
// with no code change and no redeploy.

import { mintGoogleAccessToken, SHAWN_MAILBOX } from './google';

/**
 * Scopes that permit users.messages.send, cheapest/narrowest first.
 * gmail.compose is deliberately NOT here: it can create drafts but cannot send.
 */
const SEND_CAPABLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://mail.google.com/',
];

/**
 * RFC 2047 encoded-word for a header value.
 *
 * WHY: message HEADERS are ASCII-only. The body is fine — it declares
 * charset=utf-8 — but a Subject containing any non-ASCII character (em dash,
 * curly quote, accented name) is transmitted as raw UTF-8 bytes and rendered
 * byte-per-character by the receiving client. "Machine — test" arrived as
 * "Machine Ã¢Â€Â" test". Drafts are LLM-written and love em dashes, the compose
 * modal accepts free text, and names like "Cuarón" are already in the lead
 * list, so this is a matter of when, not if.
 *
 * Pure-ASCII values are returned untouched (encoding them would be legal but
 * makes subjects unreadable in logs and some search tools).
 *
 * Encoded-words are capped at 75 chars by the spec. `=?UTF-8?B?` + `?=` costs
 * 12, so we chunk at 45 UTF-8 bytes → 60 base64 chars → 72 total. Chunking
 * walks CODE POINTS, never bytes: splitting mid-character would corrupt exactly
 * the characters this is meant to protect.
 */
function encodeMimeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;

  const MAX_BYTES = 45;
  const chunks: string[] = [];
  let buf = '';
  for (const ch of value) {
    if (Buffer.byteLength(buf + ch, 'utf8') > MAX_BYTES) {
      chunks.push(buf);
      buf = ch;
    } else {
      buf += ch;
    }
  }
  if (buf) chunks.push(buf);

  // Continuation lines are joined with CRLF + a single space (folding).
  return chunks
    .map((c) => `=?UTF-8?B?${Buffer.from(c, 'utf8').toString('base64')}?=`)
    .join('\r\n ');
}

/** Build an RFC-5322 message. Plain text — Shawn's voice is plain, not HTML. */
function buildRaw(from: string, to: string, subject: string, body: string): string {
  return Buffer.from(
    // Display name goes through the same encoder — it is a header too.
    `From: ${encodeMimeHeader('Shawn Moffatt')} <${from}>\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${encodeMimeHeader(subject)}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `Content-Transfer-Encoding: 8bit\r\n` +
      `\r\n` +
      body
  ).toString('base64url');
}

export interface SendResult {
  /** Gmail message id — proof the message was actually accepted. */
  id: string;
  threadId: string | null;
  /** Which scope the Workspace actually accepted (useful in logs/diagnostics). */
  scopeUsed: string;
}

/**
 * Send as Shawn. Resolves with the Gmail message id on success.
 * Throws with an aggregated, actionable message if no scope works.
 */
export async function sendConnectEmail(
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  if (!to?.trim()) throw new Error('No recipient address');

  const raw = buildRaw(SHAWN_MAILBOX, to, subject, body);
  const failures: string[] = [];

  for (const scope of SEND_CAPABLE_SCOPES) {
    let token: string;
    try {
      token = await mintGoogleAccessToken([scope], SHAWN_MAILBOX);
    } catch (err) {
      // Scope not in the DWD grant — Google rejects at token-mint time.
      failures.push(`${scope.split('/').pop()}: ${(err as Error).message}`);
      continue;
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Connection: 'close' },
      body: JSON.stringify({ raw }),
    });

    if (res.ok) {
      const json = (await res.json()) as { id?: string; threadId?: string };
      if (!json.id) throw new Error('Gmail accepted the send but returned no message id');
      return { id: json.id, threadId: json.threadId ?? null, scopeUsed: scope };
    }

    // A token was minted but the API still refused. 401/403 => scope/grant
    // problem, keep trying. Anything else (bad address, quota, 5xx) is a real
    // send failure and must surface immediately rather than being masked by a
    // later scope's error.
    const detail = (await res.text()).slice(0, 240);
    if (res.status === 401 || res.status === 403) {
      failures.push(`${scope.split('/').pop()}: Gmail ${res.status} ${detail}`);
      continue;
    }
    throw new Error(`Gmail send ${res.status}: ${detail}`);
  }

  // Distinguish the two very different causes, because they need different
  // people to fix them and the wrong message sends you hunting in the wrong
  // console. A missing/unreadable service-account key fails identically for
  // EVERY scope (ENOENT / no credentials), which is not a permissions problem
  // at all — the app simply has no key to sign with.
  const credentialsMissing = failures.every(
    (f) => /ENOENT|no such file|GOOGLE_SERVICE_ACCOUNT|no credentials/i.test(f)
  );

  if (credentialsMissing) {
    throw new Error(
      `Gmail send failed — the Google service-account key is not available to this app, ` +
        `so it could not authenticate as ${SHAWN_MAILBOX} at all. This is a missing ` +
        `credential, not a permissions problem: set GOOGLE_SERVICE_ACCOUNT_JSON in the ` +
        `Railway service variables (or GOOGLE_SERVICE_ACCOUNT_KEY_PATH locally). ` +
        `Underlying error — ${failures[0]}`
    );
  }

  throw new Error(
    `Gmail send blocked — the key works, but no send-capable scope is granted for ` +
      `${SHAWN_MAILBOX}. A Google Workspace admin must add one of these scopes to the ` +
      `domain-wide delegation grant for this service account's client ID (Admin console → ` +
      `Security → Access and data control → API controls → Domain-wide delegation). ` +
      `Tried — ${failures.join(' | ')}`
  );
}
