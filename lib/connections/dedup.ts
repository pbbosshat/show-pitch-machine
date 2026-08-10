// Dedup a lead against Shawn's Gmail + Google Calendar so we do not cold-pitch
// someone he already knows. Reads sm@gototeam.com via a minted service-account
// token (gmail.readonly + calendar.readonly, both granted) and RAW REST calls
// with Connection: close (the googleapis SDK premature-closed here). Read-only.
//
// Returns one of:
//   known_gmail    - a message to/from this person (or matching their name)
//   known_calendar - an event mentioning them in the last 2 years
//   clear          - no prior contact found
//   unchecked      - a lookup errored (exact error in the evidence, so the UI
//                    shows the real reason instead of silently claiming "clear")

import { mintGoogleAccessToken, googleApiGet, SHAWN_MAILBOX } from './google';

const GMAIL_RO = 'https://www.googleapis.com/auth/gmail.readonly';
const CAL_RO = 'https://www.googleapis.com/auth/calendar.readonly';

export interface DedupResult {
  dedup_status: 'known_gmail' | 'known_calendar' | 'clear' | 'unchecked';
  dedup_evidence: string | null;
}

interface GmailListResp { messages?: { id?: string }[] }
interface GmailMsgResp { internalDate?: string; payload?: { headers?: { name?: string; value?: string }[] } }
interface CalListResp {
  items?: { summary?: string; start?: { dateTime?: string; date?: string } }[];
}

/** Short 'YYYY-MM-DD' from an epoch-ms string, or '' if unparseable. */
function shortDate(ms: string | undefined): string {
  if (!ms) return '';
  const n = Number(ms);
  if (!Number.isFinite(n)) return '';
  return new Date(n).toISOString().slice(0, 10);
}

// Trade-newsletter sender domains that flood Shawn's inbox. A name-only search
// otherwise matches these (a person merely mentioned in a trade email), which is
// NOT prior contact. Excluding them keeps name-only dedup meaningful.
const NEWSLETTER_EXCLUDE = [
  'deadline.com', 'variety.com', 'hollywoodreporter.com', 'thr.com', 'tvline.com',
  'cynopsis.com', 'realscreen.com', 'c21media.net', 'broadcastingcable.com', 'nexttv.com',
  'productionweekly.com', 'worldscreen.com', 'indiewire.com', 'billboard.com',
  'senalnews.com', 'broadbandtvnews.com',
].map((d) => `-from:${d}`).join(' ');

export async function dedupPerson(name: string, email?: string | null): Promise<DedupResult> {
  // ── Gmail ──────────────────────────────────────────────────────────────────
  try {
    const token = await mintGoogleAccessToken([GMAIL_RO], SHAWN_MAILBOX);
    // With an email, match real correspondence (from/to). Without one, do a
    // name-phrase search but exclude trade newsletters so a mere press mention
    // does not read as "Shawn knows them".
    const q = email ? `from:${email} OR to:${email}` : `"${name}" ${NEWSLETTER_EXCLUDE}`;
    const list = await googleApiGet<GmailListResp>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=3&q=${encodeURIComponent(q)}`,
      token
    );
    const first = list.messages?.[0];
    if (first?.id) {
      const msg = await googleApiGet<GmailMsgResp>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${first.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
        token
      );
      const headers = msg.payload?.headers ?? [];
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '(no subject)';
      return { dedup_status: 'known_gmail', dedup_evidence: `Gmail ${shortDate(msg.internalDate)} "${subject.slice(0, 70)}"` };
    }
  } catch (err) {
    return { dedup_status: 'unchecked', dedup_evidence: `Gmail lookup failed: ${(err as Error).message}` };
  }

  // ── Calendar ────────────────────────────────────────────────────────────────
  try {
    const token = await mintGoogleAccessToken([CAL_RO], SHAWN_MAILBOX);
    const timeMin = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?singleEvents=true&maxResults=5&timeMin=${encodeURIComponent(timeMin)}&q=${encodeURIComponent(email || name)}`;
    const ev = await googleApiGet<CalListResp>(url, token);
    const item = ev.items?.[0];
    if (item) {
      const when = item.start?.dateTime || item.start?.date || '';
      return {
        dedup_status: 'known_calendar',
        dedup_evidence: `Calendar ${when.slice(0, 10)} "${(item.summary ?? '(no title)').slice(0, 70)}"`,
      };
    }
  } catch (err) {
    return { dedup_status: 'unchecked', dedup_evidence: `Calendar lookup failed: ${(err as Error).message}` };
  }

  return { dedup_status: 'clear', dedup_evidence: null };
}
