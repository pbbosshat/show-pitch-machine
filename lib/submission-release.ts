/**
 * The MY Entertainment Submissions Release — single source of truth.
 *
 * WHY this file exists: the release is a legal agreement, so the exact wording a
 * submitter agreed to has to be reproducible after the fact. Keeping the text,
 * its version, and the list of gated entry points in ONE module means:
 *   • the form renders exactly the wording the server records agreement to;
 *   • client and server cannot drift on WHICH forms require a release;
 *   • changing the wording is a deliberate act that bumps SUBMISSION_RELEASE_VERSION,
 *     leaving historical rows pointing at the version they actually accepted.
 *
 * The canonical signed PDF lives at public/submission-release-form.pdf. The text
 * below is a faithful transcription of it — including the original's own spelling
 * (e.g. "licenses" in the preamble). Do NOT silently "correct" this prose: it is a
 * contract, and the recorded version must match what was displayed.
 *
 * IF YOU EDIT THE WORDING: bump SUBMISSION_RELEASE_VERSION in the same commit, and
 * replace public/submission-release-form.pdf so the downloadable copy agrees with
 * the on-screen copy. Never edit the text and leave the version untouched — that
 * silently rewrites what past submitters are recorded as having agreed to.
 */

/**
 * Version stamp recorded on every acceptance (contact_leads.release_version).
 * Date-based rather than incrementing so a row's value is self-describing.
 */
export const SUBMISSION_RELEASE_VERSION = '2026-08-18';

export const SUBMISSION_RELEASE_TITLE = 'MY Entertainment Submissions Release';

/** The legal entity named in the agreement. */
export const SUBMISSION_RELEASE_ENTITY =
  'My Tupelo Entertainment LLC d/b/a My Entertainment';

/** Unnumbered paragraphs that precede the numbered clauses. */
export const SUBMISSION_RELEASE_PREAMBLE: readonly string[] = [
  'There is a possibility that the Material may be identical with or similar to material which has or may come to you from other sources. Unless you can obtain adequate protection in advance, you will refuse to consider submitted material. The protection for you must be sufficiently broad to protect you, your related corporations, and your and their employees, agents, licenses and assigns and all parties to whom you submit material. Therefore, all references to you includes each and all of the foregoing.',
  'As an inducement to you to examine the Material, and in consideration of you so doing, I represent, warrant and agree as follows:',
];

/** The eleven numbered clauses, in order. */
export const SUBMISSION_RELEASE_CLAUSES: readonly string[] = [
  'The Material is submitted by me voluntarily, on an unsolicited basis, and not in confidence and no confidential relationship is intended or created between us by reason of the submission of the Material. Nothing in this agreement, nor the submission of the Material, shall be deemed to place you in any different position from any other member of the public with respect to the Material. Accordingly, any part of the Material which could be freely used by any member of the public may be used by you without liability to me.',
  'I acknowledge that at this time you have no intent to compensate me in any way and I have no expectation of receiving any compensation. I understand and agree that your use of material containing features or elements similar to or identical with those contained in the submitted Material shall not obligate you to negotiate with me nor entitle me to any compensation if you determine that you have an independent legal right to use such other material which is not derived from me (either because such material’s features or elements were not new or novel, or did not originate with me, or were or may hereafter be independently created and submitted by other persons, including your employees).',
  'I represent and warrant that I own the Material free of all claims or encumbrances, and that I have the exclusive right to offer all rights in the Material to you. If any of the Material is based on another published work (“Underlying Material”), I will so indicate to you in writing and I agree that you may use any portions of the Underlying Material fully and without negotiating with me (except to the extent that I own or have contractual rights to the Underlying Material) as the basis for an audiovisual project.',
  'I agree that no obligation of any kind is assumed or may be applied against you by reason of your consideration of the submitted Material or any discussions or negotiations we may have with respect thereto, except pursuant to an express written agreement hereafter executed by you and me which, by its terms, will be the only contract between us.',
  'I have retained at least one copy or duplicate of all Material submitted to you, and I assume full responsibility for any loss of the submitted material, irrespective of whether it is lost, stolen or destroyed in transit, or while in your possession, or otherwise.',
  'Except as otherwise provided in this agreement, I hereby release you of and from any and all claims, demands and liabilities of every kind whatsoever, known or unknown, that may arise in relation to the Material or by reason of any claim now or hereafter made by me that you have used or appropriated the Material, except for fraud or willful injury on your part.',
  'Should any provision of this agreement be void or unenforceable, such provision shall be deemed omitted, and this agreement with such provision omitted shall remain in full force and effect.',
  'This agreement represents our entire agreement. No statements or representations have been made except those expressly stated in this agreement. This agreement may be modified only by a subsequent written agreement signed both by you and me.',
  'This agreement shall be governed by the laws of New York. Any action I may have against you must be brought within nine (9) months after the execution of this agreement, or else the right to bring such action shall be deemed waived.',
  'You may freely assign your rights under this agreement.',
  'If more than one party signs this agreement as submittor, then references to “I” or “me” throughout this agreement shall apply to each party, jointly and severally.',
];

/** Wording next to the acceptance checkbox. Shown verbatim to the submitter. */
export const SUBMISSION_RELEASE_CONSENT_LABEL =
  `I have read and agree to the ${SUBMISSION_RELEASE_TITLE}. I am signing this agreement electronically by typing my full legal name below, and I intend that signature to have the same effect as a handwritten one.`;

/** Options for "Nature of the Material", per the release's own examples. */
export const MATERIAL_NATURE_OPTIONS: readonly string[] = [
  'Treatment',
  'Outline',
  'Teaser tape / sizzle reel',
  'Pitch deck',
  'Script',
  'Format bible',
  'Other',
];

/**
 * Public form entry points whose submissions REQUIRE an accepted release.
 *
 * Deliberately an allow-list of gated sources rather than a deny-list of open
 * ones. Three groups of callers post to /api/contact and MUST stay ungated:
 *   • /contact — general business enquiries (press, vendors, job seekers)
 *   • the ten /available/[slug] one-sheets — buyers requesting materials FROM
 *     MY Entertainment, the opposite direction of travel from a submission
 *   • any historical/no-JS form post that predates this field
 * An allow-list keeps all of them working by default; a deny-list would have
 * silently broken every caller that forgot to identify itself.
 */
export const RELEASE_REQUIRED_SOURCES = ['pitch', 'work-with-us'] as const;

export type ReleaseRequiredSource = (typeof RELEASE_REQUIRED_SOURCES)[number];

/**
 * Whether a submission from `source` must carry an accepted release.
 * Shared by the form (to render the release block) and the API (to enforce it),
 * so the two can never disagree about which pages are gated.
 */
export function isReleaseRequired(source: string | null | undefined): boolean {
  return (
    typeof source === 'string' &&
    (RELEASE_REQUIRED_SOURCES as readonly string[]).includes(source)
  );
}

/**
 * Normalize + sanity-check the optional "link to your materials" URL.
 *
 * Returns the normalized URL string, or null when the value can't be a usable
 * link. Permissive on purpose: submitters paste Drive/Dropbox/Vimeo/WeTransfer
 * links in whatever shape their app copied, so we
 *   • trim whitespace,
 *   • prepend https:// when the scheme was left off ("drive.google.com/…"),
 *   • require it to parse as http(s) with a dot in the hostname,
 *   • cap length at 2048 so a public form can't stuff arbitrary blobs in.
 * Anything else (javascript:, mailto:, plain words like "attached") → null.
 *
 * Shared by ContactForm (to normalize before sending) and /api/contact (to
 * validate what actually arrives, since the endpoint is public).
 */
export function normalizeMaterialLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048 || /\s/.test(trimmed)) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Does the typed signature plausibly belong to the person named on the form?
 *
 * Requires the signature to contain both the first and last name given above it.
 * Deliberately permissive about everything else so legitimate signatures are not
 * rejected: middle names, initials, suffixes ("Jr."), accents and double spacing
 * all pass. What it stops is a submitter typing "asdf" or "n/a" into a field the
 * agreement treats as their signature — which would leave a worthless record.
 *
 * This is an integrity check on the record, NOT identity verification: nothing
 * here proves the person is who they claim. Its job is to make the stored
 * signature correspond to the stored name.
 *
 * Shared by client and server so the browser cannot show a green light for
 * something the API will reject.
 */
export function signatureMatchesName(
  signature: string,
  firstName: string,
  lastName: string
): boolean {
  // Strip accents, collapse punctuation/whitespace, lowercase — so "José R. Díaz-Ruiz"
  // still matches first "Jose" / last "Diaz Ruiz".
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // combining diacritical marks
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const sig = norm(signature);
  const first = norm(firstName);
  const last = norm(lastName);
  if (!sig || !first || !last) return false;

  // Word-boundary containment, so "an" does not match inside "Daniel".
  const hasWordRun = (haystack: string, needle: string) => {
    const h = ` ${haystack} `;
    const n = ` ${needle} `;
    return h.includes(n);
  };

  return hasWordRun(sig, first) && hasWordRun(sig, last);
}
