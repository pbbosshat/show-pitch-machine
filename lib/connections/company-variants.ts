// Generate alternative company names to retry an Apollo lookup with.
//
// WHY THIS EXISTS: Apollo's people/match is anchored on organization_name, and
// the name the trade press writes is often not the name Apollo indexes. The
// "Retry — second pass" button used to re-run the IDENTICAL query with the
// IDENTICAL inputs, so it could only ever return the identical nothing — it was
// a retry in name only.
//
// Measured against the leads that were stuck on "none found" (2026-08-20):
//
//   Jessie Parker      company field EMPTY        -> "Laneway Festival" (mined
//                      from her reason text)      -> verified address + LinkedIn
//   Del Titus Bawuah   "ArtsHouse Media Group (AMG)" -> "ArtsHouse Media Group"
//                                                  -> LinkedIn URL
//
// Not everything is recoverable this way: Corie Henson's employer is written
// "Beast Industries Studios" but indexed by Apollo as "MrBeast", which no string
// transform can derive and Apollo's own org search does not resolve either.
// Honest ceiling, not a silver bullet.
//
// Ordering matters — most-specific first, because the first candidate that
// returns an address wins and a looser name risks matching a different person
// with the same name at a different company.

/** Strip a trailing parenthetical: "ArtsHouse Media Group (AMG)" -> "ArtsHouse Media Group". */
function withoutParenthetical(s: string): string | null {
  const m = s.match(/^(.*?)\s*\([^)]*\)\s*$/);
  return m && m[1].trim() ? m[1].trim() : null;
}

/** Pull the parenthetical out: "ArtsHouse Media Group (AMG)" -> "AMG". */
function parentheticalOnly(s: string): string | null {
  const m = s.match(/\(([^)]{2,40})\)/);
  return m ? m[1].trim() : null;
}

// Generic corporate tails that the trades append but Apollo often omits.
// "Beast Industries Studios" -> "Beast Industries". One word at a time, so
// "ArtsHouse Media Group" also yields "ArtsHouse Media" and "ArtsHouse".
const GENERIC_TAIL = /\s+(studios?|group|media|entertainment|productions?|pictures|films?|networks?|television|tv|company|co|inc|llc|ltd|limited|holdings?|international|worldwide|global)\.?$/i;

function trimGenericTails(s: string): string[] {
  const out: string[] = [];
  let cur = s.trim();
  // Cap at 3 so a long name cannot degrade into a single generic word.
  for (let i = 0; i < 3; i++) {
    const next = cur.replace(GENERIC_TAIL, '').trim();
    if (next === cur || next.length < 3) break;
    out.push(next);
    cur = next;
  }
  return out;
}

/**
 * Mine a company name out of free text (the lead's reason, or the article
 * headline). Handles the phrasings the extractor writes and the trades use:
 *   "Exiting Laneway Festival (General Manager)."  -> Laneway Festival
 *   "Named General Counsel at Merlin."             -> Merlin
 *   "Del Titus Bawuah Joins AMG to Drive..."       -> AMG
 *
 * Requires Capitalised words so it does not grab ordinary prose, and stops at
 * lowercase connectives ("to", "after") which reliably end a company name.
 */
export function mineCompanyFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const found: string[] = [];
  const CAP = `[A-Z][\\w&'’.-]*(?:\\s+[A-Z][\\w&'’.-]*){0,3}`;
  const patterns = [
    // 'gi' — the keyword is case-insensitive because reasons are written
    // "Exiting Laneway Festival…" and "Named … at Merlin". The capture group
    // still demands Capitalised words so ordinary prose is not swept up.
    new RegExp(`\\b(?:exiting|leaving|departs?(?:\\s+from)?)\\s+(${CAP})`, 'gi'),
    new RegExp(`\\b(?:joins?|joined|joining)\\s+(${CAP})`, 'gi'),
    new RegExp(`\\bat\\s+(${CAP})`, 'gi'),
    new RegExp(`\\b(?:to|of)\\s+(${CAP})\\s+(?:as|to)\\b`, 'gi'),
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const cand = m[1].trim().replace(/[.,;:]$/, '');
      if (cand.length >= 3) found.push(cand);
    }
  }
  return found;
}

/**
 * Ordered, de-duplicated company names to try for one lead.
 * The caller stops at the first that yields contact details.
 */
export function companyCandidates(
  company: string | null | undefined,
  reason?: string | null,
  headline?: string | null
): string[] {
  const out: string[] = [];
  const push = (v: string | null | undefined) => {
    const t = (v ?? '').trim();
    if (!t || t.length < 2) return;
    if (out.some((e) => e.toLowerCase() === t.toLowerCase())) return;
    out.push(t);
  };

  const base = (company ?? '').trim();
  if (base) {
    push(base);                       // exactly what the first pass used
    const stripped = withoutParenthetical(base);
    push(stripped);                   // "X (Y)" -> "X"
    trimGenericTails(base).forEach(push);
    // Tails on the cleaned form too: "ArtsHouse Media Group (AMG)" should also
    // yield "ArtsHouse Media" and "ArtsHouse", not stop at the stripped name.
    if (stripped) trimGenericTails(stripped).forEach(push);
    push(parentheticalOnly(base));    // "X (Y)" -> "Y"  (acronyms last: loosest)
  }

  // Text-mined names. Critical when the company field is empty — the extractor
  // sometimes records no company even though the reason names the employer
  // outright, which left the lead permanently unenrichable.
  mineCompanyFromText(reason).forEach((c) => {
    push(c);
    push(withoutParenthetical(c));
    trimGenericTails(c).forEach(push);
  });
  mineCompanyFromText(headline).forEach(push);

  return out;
}
