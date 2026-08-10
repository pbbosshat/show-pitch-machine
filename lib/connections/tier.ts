// Tiering rules for extracted people (PRD section 6.3).
//
//   Tier 1: newly in-seat at a buyer (dev/programming/acquisitions/commission
//           role at a network or streamer), OR a job-hunting exec who just
//           exited a buyer seat. Shawn actively likes helping people who are
//           newly in-seat or between roles, so both land Tier 1.
//   Tier 2: other credible exec moves (prodco leadership, promotions in place).
//   Tier 3: everyone else (non-exec mentions, out-of-lane). Note-only, no
//           enrichment spend until a human promotes them.
//
// Deterministic override: a source article classified relevance_tier='3-skip'
// forces Tier 3 unless the article item_type is itself 'exec-move'.

import type { ExtractedPerson } from './extract';

// Titles that indicate a buyer / commissioning / content-decision seat.
const BUYER_TITLE_RE =
  /commission|development|programming|acquisition|content|unscripted|nonfiction|non-fiction|factual|original|greenlight|editorial|entertainment|chief|president|\bceo\b|\bcco\b|\bvp\b|svp|evp|head of|director of/i;

// Language that indicates the person is leaving / between roles (a job-hunter).
const EXIT_RE = /exit|depart|steps? down|stepping down|leaving|to leave|out at|resign/i;

export interface TierResult {
  tier: number; // 1 | 2 | 3
  tier_reason: string;
}

export function tierFor(
  person: ExtractedPerson,
  article: { item_type: string | null; relevance_tier: string | null }
): TierResult {
  // A person only "mentioned" (not themselves moving) is note-only.
  if (person.type !== 'exec-move') {
    return { tier: 3, tier_reason: 'Named in a relevant article but not an executive move.' };
  }

  // Out-of-lane content article that is not itself an exec-move: note-only.
  if (article.relevance_tier === '3-skip' && article.item_type !== 'exec-move') {
    return { tier: 3, tier_reason: 'Source article classified out of lane (3-skip).' };
  }

  const combinedTitle = `${person.new_title ?? ''} ${person.old_title ?? ''}`;
  const buyerSeat = BUYER_TITLE_RE.test(combinedTitle);
  const jobHunter = !person.new_company || EXIT_RE.test(combinedTitle);

  if (buyerSeat && person.new_company) {
    return {
      tier: 1,
      tier_reason: `Newly in a buyer or decision seat at ${person.new_company}.`,
    };
  }
  if (jobHunter) {
    return {
      tier: 1,
      tier_reason: 'Exec in motion (exiting or between roles); a warm connect Shawn likes to make.',
    };
  }
  return { tier: 2, tier_reason: 'Credible executive move worth a connect.' };
}
