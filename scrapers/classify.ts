/**
 * MYE Relevance Classifier — deterministic, no AI calls.
 *
 * Classifies trade data into format_type and relevance_tier so the greenlits
 * feed only surfaces content in MYE's production lane. All logic is rule-based:
 * fast, auditable, and runnable offline.
 *
 * Tier meanings:
 *   1-direct   — MYE actively produces and pitches this exact format
 *   2-adjacent — unscripted/factual but not MYE's core genres; buyer-signal value only
 *   3-skip     — wrong lane entirely (scripted drama/comedy, talk, news, film, kids)
 */

export type FormatType =
  | 'paranormal'
  | 'true-crime'
  | 'documentary'
  | 'reality'
  | 'competition'
  | 'lifestyle'
  | 'travel'
  | 'nature'
  | 'sports-factual'
  | 'scripted-drama'
  | 'scripted-comedy'
  | 'animation'
  | 'talk'
  | 'news'
  | 'feature-film'
  | 'kids'
  | 'sports-rights'
  | 'sports-coverage'   // schedule/sponsorship/broadcast articles — not a production format
  | 'job-listing'       // industry job postings — not trade content
  | 'consumer-article'  // viewer-facing lists, product reviews, shopping guides
  | 'junk'              // scraper artifacts: section headers, bare URLs, divider lines
  | 'other';

export type RelevanceTier = '1-direct' | '2-adjacent' | '3-skip';

// signal_type distinguishes WHY an item is relevant — greenlit means buyer is active,
// freed-budget means they just cancelled an in-lane show and need a replacement.
export type SignalType =
  | 'greenlit'      // network commissioned a new show in MYE's lane
  | 'renewed'       // existing in-lane show renewed → buyer still committed to genre
  | 'freed-budget'  // in-lane show cancelled → open slot, budget available
  | 'mandate'       // explicit buyer mandate statement
  | 'noise';        // scripted / outside MYE's lane — skip

export interface ClassificationResult {
  format_type: FormatType;
  relevance_tier: RelevanceTier;
  signal_type: SignalType;
  tier_reason: string;
}

// ─── Tier Membership ──────────────────────────────────────────────────────────

const TIER_1_FORMATS = new Set<FormatType>([
  'paranormal', 'true-crime', 'documentary', 'reality',
  'competition', 'lifestyle', 'travel', 'nature', 'sports-factual',
]);

const TIER_3_FORMATS = new Set<FormatType>([
  'scripted-drama', 'scripted-comedy', 'animation',
  'talk', 'news', 'feature-film', 'kids', 'sports-rights',
  'sports-coverage', 'job-listing', 'consumer-article', 'junk',
]);

// signal_type is computed after tier is known, based on item_type context
function tierFor(fmt: FormatType, reason: string, signal: SignalType = 'greenlit'): ClassificationResult {
  if (TIER_1_FORMATS.has(fmt)) return { format_type: fmt, relevance_tier: '1-direct', signal_type: signal, tier_reason: reason };
  if (TIER_3_FORMATS.has(fmt)) return { format_type: fmt, relevance_tier: '3-skip', signal_type: 'noise', tier_reason: reason };
  return { format_type: fmt, relevance_tier: '2-adjacent', signal_type: signal, tier_reason: reason };
}

// ─── Known Scripted Show Titles ───────────────────────────────────────────────
// Matched case-insensitively against headline text. Extend as new scripted
// renewals appear in the scrape feed — if it's in this list, it's always Tier 3.

const KNOWN_SCRIPTED_TITLES = [
  "grey's anatomy", 'criminal minds', 'law & order', 'chicago fire', 'chicago med',
  'chicago p.d.', 'the rookie', 'will trent', 'shifting gears', 'scrubs',
  'stranger things', 'school spirits', "nobody wants this", 'rooster',
  'beyond the gates', 'the madison', 'brilliant minds', "the 'burbs",
  'wizards beyond waverly', 'yellowstone', 'tulsa king', '1923', '1883',
  'succession', 'the last of us', 'house of the dragon', 'andor', 'shogun',
  'the diplomat', 'bridgerton', 'wednesday', 'abbott elementary', 'ghosts',
  'the conners', 'young sheldon', 'ncis', 'blue bloods', 'fbi', 'seal team',
  'fire country', 'hawaii five-0', 'magnum p.i.',
  'the handmaid\'s tale', 'severance', 'ted lasso', 'for all mankind',
  'the morning show', 'slow horses', 'bad sisters', 'euphoria', 'white lotus',
  'landman', 'lioness', 'mayor of kingstown', 'power', 'snowfall', 'ozark',
  'squid game', 'from renewed',
];

// ─── Scripted / Kill-List Patterns ───────────────────────────────────────────

const SCRIPTED_DRAMA_PATTERNS = [
  // Explicit scripted labels
  /\bscripted\s+(drama|series|pilot)\b/i,
  /\bpilot\s+order\b/i,
  /\bstraight-to-series\b/i,
  /\bnarrative\s+series\b/i,
  // Format descriptors trade pubs use for scripted shows
  /\bprocedural\b/i,
  /\bhour-?long\s+drama\b/i,
  /\bdrama\s+series\b/i,
  /\bmockumentary\b/i,
  /\bcomedy[- ]drama\b|\bdramedy\b/i,
  /\bsoap\s+opera\b|\bdaytime\s+soap\b/i,
  // Genre-qualified dramas — these compound forms always mean scripted in trade press
  /\b(?:medical|legal|police|crime|political|family|teen|period|action|spy|war|romantic|sci-?fi|science[\s-]fiction)\s+drama\b/i,
  // Genre-qualified thrillers — almost always scripted
  /\b(?:legal|political|psychological|crime|spy|tech|dark)\s+thriller\b/i,
];

const SCRIPTED_COMEDY_PATTERNS = [
  /\bhalf-?hour\s+comedy\b/i,
  /\bsingle-?cam\s+comedy\b/i,
  /\bmulti-?cam\s+comedy\b/i,
  /\bsitcom\b/i,
  /\bscripted\s+comedy\b/i,
  /\bworkplace\s+comedy\b/i,
  /\bromantic\s+comedy\b/i,
  /\bdark\s+comedy\b/i,
  /\bmedical\s+comedy\b/i,
];

const ANIMATION_PATTERNS = [
  /\banimat(?:ed|ion)\s+(series|comedy|drama)\b/i,
  /\bcartoon\s+series\b/i,
  /\badult\s+animat/i,
];

const TALK_PATTERNS = [
  /\btalk\s+show\b/i,
  /\bmorning\s+show\b/i,
  /\blate[- ]?night\b/i,
  /\bdaytime\s+(show|series)\b/i,
  /\bsaturday\s+night\s+live\b/i,
  /\btoday\s+show\b/i,
];

const KIDS_PATTERNS = [
  /\bchildren'?s?\s+(series|show|program)/i,
  /\bkids'\s+(series|show|network)/i,
  /\bpreschool\s+series\b/i,
];

const SPORTS_RIGHTS_PATTERNS = [
  /\bolympics?\s+rights?\b/i,
  /\bnfl\s+rights?\b/i,
  /\bnba\s+rights?\b/i,
  /\bmlb\s+rights?\b/i,
  /\bnhl\s+rights?\b/i,
  /\bbroadcast(?:ing)?\s+rights?\b/i,
  /\bstreaming\s+rights?\b/i,
  /\brights?\s+deal\b/i,
];

// Sports broadcast/schedule articles — sponsorships, game schedules, "what's on" roundups.
// Distinct from sports-rights (carriage deals) and sports-factual (shows MYE produces).
const SPORTS_COVERAGE_PATTERNS = [
  /\bwhat'?s\s+on\s+(this\s+)?(weekend|tonight|sunday|monday|saturday)\b/i,
  /\bplayoffs?\s+continue\b/i,
  /\btitle\s+sponsor\b/i,
  /\bnaming\s+rights?\b/i,
  /\bsponsorship\s+deal\b/i,
  /\bsigns\s+.{0,40}\s+as\s+(title|presenting|official)\s+sponsor\b/i,
  /\bwhat\s+to\s+watch\b/i,
  /\bgame\s+schedule\b/i,
];

// Job listings — Cynopsis and other newsletters use ">>" suffix and ALL CAPS titles.
const JOB_LISTING_PATTERNS = [
  />>\s*$/,                              // Cynopsis "JOB TITLE >>" convention
  /^[A-Z][A-Z\s,&:\/\-\.]{15,}>>?\s*$/, // ALL CAPS headline ending in >> or just caps
  /\bprofessor\s+of\s+the\s+practice\b/i,
  /\bassociate\s+professor\b/i,
  /\bassistant\s+professor\b/i,
  /\bfeatured\s+job\b/i,
];

// Consumer/viewer-facing articles — product reviews, anticipated-show lists, shopping guides.
// These appear in THR and IndieWire and have no production signal value.
const CONSUMER_ARTICLE_PATTERNS = [
  /\bwe\s+found\s+the\s+best\b/i,
  /\bhere'?s\s+where\s+you\s+can\s+get\b/i,
  /\bbest\s+\w+\s+(alternative|deal|buy|pick)\b/i,
  /\bmost\s+anticipated\s+.{0,20}\s+(shows?|movies?|series)\b/i,
  /\beverything\s+we\s+know\s+so\s+far\b/i,
  /\bbubble\s+show\s+you\s+most\s+want\b/i,
  /\bscorecard\b.*\b(renewal|cancellation)\b/i,
];

const FEATURE_FILM_PATTERNS = [
  /\bfeature\s+film\b/i,
  /\bfilm\s+(project|production|pickup)\b/i,
  /\bmovie\s+order\b/i,
  /\bshort\s+film\b/i,
  /\bpalme\s+d'or\b/i,  // Cannes short film festival signal
];

// Section headers and scraper artifacts to kill before any classification runs.
// These are bare strings that newsletter/scraper pipelines sometimes emit as "articles".
const JUNK_HEADLINE_EXACT = new Set([
  'business', 'box office', 'awards', 'video', 'international',
  'music', 'lifestyle', 'account', 'sports', 'executive',
  'production', 'development', 'technology', 'people',
]);

function isJunkHeadline(headline: string): boolean {
  const h = headline.trim();
  // Bare URL (e.g. "https://...")
  if (/^https?:\/\//i.test(h)) return true;
  // Bracket-wrapped URL from newsletter image/ad tags (e.g. "[https://cdnstoryimages...]")
  if (/^\[https?:\/\//i.test(h)) return true;
  // Divider line (only dashes, equals, underscores, spaces)
  if (/^[-=_\s]{4,}$/.test(h)) return true;
  // Exact section-header match (case-insensitive)
  if (JUNK_HEADLINE_EXACT.has(h.toLowerCase())) return true;
  // Very short and no alphanumeric word longer than 3 chars → likely a nav artifact
  if (h.length < 12 && !/[a-z]{4,}/i.test(h)) return true;
  return false;
}

// ─── Unscripted / MYE Lane Patterns ──────────────────────────────────────────
// Ordered most-specific first so paranormal matches before generic documentary.

const UNSCRIPTED_FORMAT_PATTERNS: Array<[RegExp, FormatType]> = [
  [/\bparanormal\b|\bghost\s+(hunting|adventure|investig)|\bhaunted\b|\bsupernatural\s+(series|investig)/i, 'paranormal'],
  [/\btrue[- ]?crime\b|\bcold\s+case\b|\bmurder\s+mystery|\bserial\s+killer\b/i, 'true-crime'],
  [/\bcooking\s+competition\b|\btalent\s+competition\b|\bsurvival\s+competition\b|\bcompetition\s+series\b/i, 'competition'],
  [/\bhome\s+renovation\b|\blifestyle\s+series\b|\binterior\s+design\s+series\b/i, 'lifestyle'],
  [/\btravel\s+(series|documentary|docuseries)\b|\bculinary\s+travel\b/i, 'travel'],
  [/\bnature\s+(series|documentary)\b|\bwildlife\s+(series|doc)\b|\bweather\s+series\b/i, 'nature'],
  [/\bsports?\s+(documentary|docuseries|film)\b|\bathlete\s+doc\b/i, 'sports-factual'],
  [/\bdocuseries\b|\bdocumentary\s+series\b/i, 'documentary'],
  [/\bdocumentary\b|\bdocufilm\b/i, 'documentary'],
  [/\breality\s+(series|competition|show)\b|\bunscripted\s+(series|show)\b/i, 'reality'],
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify a piece of trade content into format_type, relevance_tier, and signal_type.
 *
 * @param headline    - Article headline or show title (required)
 * @param body        - Full article body; improves accuracy for ambiguous headlines
 * @param genre       - Pre-extracted genre from shows table (e.g. "Paranormal")
 * @param format      - Pre-extracted format from shows table (e.g. "docuseries")
 * @param is_unscripted - 0 or 1 flag from shows.is_unscripted; 0 = immediate Tier 3
 * @param item_type   - Article item type from the scraper ('greenlit', 'cancelled', etc.)
 *                      Used to compute signal_type: cancellations in MYE's lane = freed-budget.
 */
export function classify(
  headline: string,
  body = '',
  genre?: string | null,
  format?: string | null,
  is_unscripted?: number | null,
  item_type?: string | null
): ClassificationResult {
  const text = `${headline} ${body}`.toLowerCase();
  const headlineLower = headline.toLowerCase();

  // Derive the base signal from item_type before classification runs
  const baseSignal = deriveBaseSignal(item_type, headlineLower);

  // ── Junk pre-filter — kill artifacts before any pattern matching ──────────────
  // Section headers, bare URLs, and divider lines from newsletter scrapers.
  if (isJunkHeadline(headline)) {
    return { format_type: 'junk', relevance_tier: '3-skip', signal_type: 'noise', tier_reason: 'scraper artifact / junk headline' };
  }

  // ── Job listings — Cynopsis ">>" convention and ALL CAPS postings ─────────────
  if (JOB_LISTING_PATTERNS.some((p) => p.test(headline))) {
    return { format_type: 'job-listing', relevance_tier: '3-skip', signal_type: 'noise', tier_reason: 'job listing / academic posting' };
  }

  // ── Consumer / viewer-facing articles ────────────────────────────────────────
  if (CONSUMER_ARTICLE_PATTERNS.some((p) => p.test(text))) {
    return { format_type: 'consumer-article', relevance_tier: '3-skip', signal_type: 'noise', tier_reason: 'consumer/viewer-facing article' };
  }

  // ── Negation guard: article explicitly says unscripted is excluded ────────────
  // Catches "The scorecard does not include unscripted series" false-positive pattern.
  if (/does not include unscripted|excludes unscripted|not include unscripted/i.test(text)) {
    return { format_type: 'scripted-drama', relevance_tier: '3-skip', signal_type: 'noise', tier_reason: 'article explicitly excludes unscripted content' };
  }

  // ── Body-text scripted signals — run before genre extraction ─────────────────
  // Trade articles say "medical drama", "crime drama", "workplace comedy" etc.
  // These beat anything extracted from incidental genre keywords in the body.
  if (SCRIPTED_DRAMA_PATTERNS.some((p) => p.test(text))) {
    return tierFor('scripted-drama', 'scripted drama pattern', 'noise');
  }
  if (SCRIPTED_COMEDY_PATTERNS.some((p) => p.test(text))) {
    return tierFor('scripted-comedy', 'scripted comedy pattern', 'noise');
  }
  if (ANIMATION_PATTERNS.some((p) => p.test(text))) {
    return tierFor('animation', 'animation pattern', 'noise');
  }
  if (TALK_PATTERNS.some((p) => p.test(text))) {
    return tierFor('talk', 'talk show pattern', 'noise');
  }
  if (KIDS_PATTERNS.some((p) => p.test(text))) {
    return tierFor('kids', 'kids content pattern', 'noise');
  }
  if (SPORTS_RIGHTS_PATTERNS.some((p) => p.test(text))) {
    return tierFor('sports-rights', 'sports rights deal — not a format signal', 'noise');
  }
  if (SPORTS_COVERAGE_PATTERNS.some((p) => p.test(text))) {
    return tierFor('sports-coverage', 'sports schedule / sponsorship — not a production format', 'noise');
  }
  if (FEATURE_FILM_PATTERNS.some((p) => p.test(text))) {
    return tierFor('feature-film', 'feature film', 'noise');
  }

  // ── Known scripted show titles — safety net for articles with no body-text label
  // Catches scripted shows (e.g. School Spirits, Nobody Wants This) whose renewal
  // articles describe the story rather than the format.
  for (const title of KNOWN_SCRIPTED_TITLES) {
    if (headlineLower.includes(title)) {
      return { format_type: 'scripted-drama', relevance_tier: '3-skip', signal_type: 'noise', tier_reason: `known scripted: "${title}"` };
    }
  }

  // ── Structured fields — only reached if no scripted signal fired above ─────────
  if (genre || format || is_unscripted != null) {
    const fromStructured = classifyFromStructuredFields(genre, format, is_unscripted);
    if (fromStructured) return applySignal(fromStructured, baseSignal);
  }

  // ── Unscripted / MYE lane positive signals ────────────────────────────────────
  for (const [pattern, fmt] of UNSCRIPTED_FORMAT_PATTERNS) {
    if (pattern.test(text)) {
      return tierFor(fmt, `matched: ${fmt}`, baseSignal);
    }
  }

  // ── Fallback: ambiguous — surface as adjacent so Shawn can still see it ───────
  return { format_type: 'other', relevance_tier: '2-adjacent', signal_type: baseSignal, tier_reason: 'no clear format signal' };
}

// Derive the appropriate signal from the article's item_type.
// Cancelled items in MYE's lane become freed-budget; everything else stays greenlit/mandate.
function deriveBaseSignal(item_type?: string | null, headline?: string): SignalType {
  if (!item_type) return 'greenlit';
  if (item_type === 'mandate-statement') return 'mandate';
  if (item_type === 'cancelled') return 'freed-budget';
  // "renewed" — distinguish from new greenlits using headline keywords
  if (item_type === 'greenlit' && headline && /\brenew(?:ed|al|s)\b/.test(headline)) return 'renewed';
  return 'greenlit';
}

// Apply signal_type to an already-classified result, respecting tier (Tier 3 is always noise)
function applySignal(result: ClassificationResult, signal: SignalType): ClassificationResult {
  return {
    ...result,
    signal_type: result.relevance_tier === '3-skip' ? 'noise' : signal,
  };
}

// ─── Structured-Field Classifier (shows table) ────────────────────────────────

function classifyFromStructuredFields(
  genre?: string | null,
  format?: string | null,
  is_unscripted?: number | null
): ClassificationResult | null {
  // is_unscripted=0 is the hardest signal: the show is scripted, regardless of genre label
  if (is_unscripted === 0) {
    return { format_type: 'scripted-drama', relevance_tier: '3-skip', signal_type: 'noise', tier_reason: 'is_unscripted=0' };
  }

  const g = (genre ?? '').toLowerCase();
  const f = (format ?? '').toLowerCase();
  const combined = `${g} ${f}`;

  if (/paranormal|ghost|haunted|supernatural/.test(combined))
    return tierFor('paranormal', `genre/format: ${combined.trim()}`);
  if (/true.?crime|cold.?case/.test(combined))
    return tierFor('true-crime', `genre/format: ${combined.trim()}`);
  if (/competition/.test(combined))
    return tierFor('competition', `genre/format: ${combined.trim()}`);
  if (/nature|weather|wildlife/.test(combined))
    return tierFor('nature', `genre/format: ${combined.trim()}`);
  if (/travel|food/.test(combined))
    return tierFor('travel', `genre/format: ${combined.trim()}`);
  if (/lifestyle|home|renovation/.test(combined))
    return tierFor('lifestyle', `genre/format: ${combined.trim()}`);
  if (/docuseries|documentary/.test(combined))
    return tierFor('documentary', `genre/format: ${combined.trim()}`);
  if (/reality|unscripted/.test(combined))
    return tierFor('reality', `genre/format: ${combined.trim()}`);
  if (/sports.*doc|doc.*sports/.test(combined))
    return tierFor('sports-factual', `genre/format: ${combined.trim()}`);
  if (/sports/.test(combined))
    return tierFor('sports-factual', `genre/format: ${combined.trim()}`);
  if (/kids|children|animation/.test(combined))
    return tierFor('kids', `genre/format: ${combined.trim()}`);
  if (/comedy/.test(combined)) {
    // Unscripted comedy (improv/game show) is adjacent; scripted comedy is Tier 3
    if (is_unscripted === 1) return tierFor('reality', `unscripted comedy`);
    return tierFor('scripted-comedy', 'comedy without unscripted flag');
  }

  return null; // structured fields present but not conclusive — fall through to text patterns
}
