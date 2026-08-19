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
//
// It ALSO harvests the person's address while it is here. A "known_gmail" hit
// means a real thread exists between Shawn and this person — and that thread's
// From/To/Cc headers contain their actual address. Apollo resolves ~60% of
// exec-tier leads; this recovers people Apollo has never heard of but Shawn has
// literally already emailed, which is the strongest address we can possibly get.
// Same for a calendar event's attendee list.

import { mintGoogleAccessToken, googleApiGet, SHAWN_MAILBOX } from './google';

const GMAIL_RO = 'https://www.googleapis.com/auth/gmail.readonly';
const CAL_RO = 'https://www.googleapis.com/auth/calendar.readonly';

export interface DedupResult {
  dedup_status: 'known_gmail' | 'known_calendar' | 'clear' | 'unchecked';
  dedup_evidence: string | null;
  /** Address harvested from the matching thread/event, when one could be attributed. */
  discovered_email?: string | null;
}

interface GmailListResp { messages?: { id?: string }[] }
interface GmailMsgResp { internalDate?: string; payload?: { headers?: { name?: string; value?: string }[] } }
interface CalListResp {
  items?: {
    summary?: string;
    start?: { dateTime?: string; date?: string };
    attendees?: { email?: string; displayName?: string }[];
    organizer?: { email?: string; displayName?: string };
  }[];
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
const NEWSLETTER_DOMAINS = [
  'deadline.com', 'variety.com', 'hollywoodreporter.com', 'thr.com', 'tvline.com',
  'cynopsis.com', 'realscreen.com', 'c21media.net', 'broadcastingcable.com', 'nexttv.com',
  'productionweekly.com', 'worldscreen.com', 'indiewire.com', 'billboard.com',
  'senalnews.com', 'broadbandtvnews.com',
];
const NEWSLETTER_EXCLUDE = NEWSLETTER_DOMAINS.map((d) => `-from:${d}`).join(' ');

// Addresses that are never the lead: Shawn's own mailbox and its alias, plus
// automated senders. Harvesting one of these would put Shawn's own address on a
// lead and send him his own outreach.
const SELF_ADDRESSES = ['sm@gototeam.com', 'shawnmoffatt@gototeam.com'];
const NON_PERSON_HINTS = ['noreply', 'no-reply', 'donotreply', 'notifications', 'mailer-daemon', 'bounce', 'support@', 'info@'];

/** Split a header value into { display, email } pairs. Handles "Name <a@b>", bare "a@b", comma lists. */
function parseAddresses(value: string | undefined): { display: string; email: string }[] {
  if (!value) return [];
  return value
    .split(',')
    .map((chunk) => {
      const m = chunk.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/) || chunk.match(/^\s*()(\S+@\S+)\s*$/);
      if (!m) return null;
      return { display: (m[1] ?? '').trim(), email: (m[2] ?? '').trim().toLowerCase() };
    })
    .filter((x): x is { display: string; email: string } => !!x && x.email.includes('@'));
}

function surnameOf(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/**
 * Choose the address belonging to `name` out of a thread's participants.
 *
 * Requires positive attribution — the display name or the address itself must
 * contain the person's surname. A thread can have many participants, and
 * guessing would silently attach a stranger's address to a lead and send
 * outreach to the wrong person. No confident match returns null.
 */
export function pickAddressFor(
  name: string,
  candidates: { display: string; email: string }[]
): string | null {
  const surname = surnameOf(name);
  if (!surname || surname.length < 3) return null;

  const usable = candidates.filter((c) => {
    const e = c.email.toLowerCase();
    if (SELF_ADDRESSES.includes(e)) return false;
    if (NON_PERSON_HINTS.some((h) => e.includes(h))) return false;
    if (NEWSLETTER_DOMAINS.some((d) => e.endsWith(`@${d}`))) return false;
    return true;
  });

  const byDisplay = usable.find((c) => c.display.toLowerCase().includes(surname));
  if (byDisplay) return byDisplay.email;

  // local-part often encodes the name: jon.glass@, jglass@, glass@
  const byLocal = usable.find((c) => c.email.split('@')[0].toLowerCase().includes(surname));
  return byLocal ? byLocal.email : null;
}

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
      // From/To/Cc requested alongside Subject — same call, no extra quota, and
      // it is the only place this address exists.
      const msg = await googleApiGet<GmailMsgResp>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${first.id}` +
          `?format=metadata&metadataHeaders=Subject&metadataHeaders=Date` +
          `&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc`,
        token
      );
      const headers = msg.payload?.headers ?? [];
      const get = (h: string) => headers.find((x) => x.name?.toLowerCase() === h)?.value;
      const subject = get('subject') ?? '(no subject)';

      const participants = [
        ...parseAddresses(get('from')),
        ...parseAddresses(get('to')),
        ...parseAddresses(get('cc')),
      ];
      // If we searched BY an address we already had, keep it; otherwise attribute
      // one of the thread's participants to this person.
      const discovered = email ?? pickAddressFor(name, participants);

      // ── Participation test — the difference between "Shawn knows them" and
      //    "a newsletter mentioned them" ────────────────────────────────────
      // A name-only search matches ANY message containing the name, including
      // trade newsletters and press roundups that merely write about the person.
      // Treating those as prior contact was wrong twice over: the DEDUP column
      // claimed a relationship that does not exist, and voice_variant flipped to
      // 'reconnect', so the draft opened "it's been a while" to a total stranger.
      // Observed live on all four flagged leads — one was a 2013 list email.
      //
      // So a name-only hit only counts as known when the person is actually ON
      // the thread. That is exactly the condition under which we can attribute
      // an address, which is why the two checks collapse into one: no address
      // attributable => not correspondence => fall through to Calendar/clear.
      // A hand-supplied `email` skips this — a from:/to: search already proves it.
      if (email || discovered) {
        return {
          dedup_status: 'known_gmail',
          dedup_evidence: `Gmail ${shortDate(msg.internalDate)} "${subject.slice(0, 70)}"`,
          discovered_email: discovered ?? null,
        };
      }
      // Mentioned, not corresponded with — keep looking.
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
      // Attendees carry addresses directly — a meeting with someone is about as
      // strong a contact signal as exists.
      const attendees = [
        ...(item.attendees ?? []),
        ...(item.organizer ? [item.organizer] : []),
      ].map((a) => ({ display: a.displayName ?? '', email: (a.email ?? '').toLowerCase() }))
        .filter((a) => a.email.includes('@'));
      const discovered = email ?? pickAddressFor(name, attendees);

      return {
        dedup_status: 'known_calendar',
        dedup_evidence: `Calendar ${when.slice(0, 10)} "${(item.summary ?? '(no title)').slice(0, 70)}"`,
        discovered_email: discovered ?? null,
      };
    }
  } catch (err) {
    return { dedup_status: 'unchecked', dedup_evidence: `Calendar lookup failed: ${(err as Error).message}` };
  }

  return { dedup_status: 'clear', dedup_evidence: null, discovered_email: null };
}
