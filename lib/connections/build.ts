// Daily Connections build + enrich orchestration.
//
// buildDailyConnections(days):
//   1. Pull the briefing-DEFAULT article set (same filter as the Intelligence
//      briefing, include_skip off) for the window.
//   2. Extract people (Groq), tier them, fuzzy-match existing buyer_contacts.
//   3. Upsert connection_leads keyed by UNIQUE(article_id, person_name) so
//      re-running the same day creates zero duplicates.
//   4. Enrich Tier 1/2 leads immediately (dedup, Apollo, draft). Tier 3 is
//      note-only (no Apollo call, apollo_checked_at stays NULL).
//
// enrichLead(id): the same dedup -> Apollo -> draft pass, reused by the Tier 3
// "Add to connect list" promotion route.

import { randomUUID } from 'crypto';
import { query, queryOne, run } from '@/lib/db';
import { extractPeople, type ExtractedPerson } from './extract';
import { tierFor } from './tier';
import { similarity, splitName } from './match';
import { dedupPerson } from './dedup';
import { apolloMatch } from './apollo';
import { generateDraft } from './draft';

// Auto-match confidence to link a lead to an existing buyer_contacts row.
const MATCH_THRESHOLD = 0.75;

// Safety cap: never process more than this many articles in one build. Today's
// relevant set is well under this; the cap just bounds a runaway window.
const MAX_ARTICLES = 120;

// Pace between Groq extraction calls. Groq's free tier caps tokens-per-minute
// (12k on 70b), and the daily build otherwise fires every extraction in a burst
// and 429s. A short delay keeps us under the per-minute cap. Server-side only.
const EXTRACT_DELAY_MS = 5000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cheap pre-gate: only spend an LLM extraction call on articles that plausibly
// name an executive. Exec-moves/mandates always qualify; otherwise the headline
// or lede must carry an exec-move signal word. This skips the pure music/chart/
// obituary noise in the relevant feed (e.g. most Billboard items), which contains
// no execs, saving tokens and improving signal. Not a change to the relevance
// filter itself, just which relevant articles are worth an extraction call.
const EXEC_SIGNAL_RE =
  /\b(appoint|apppoints|names?|named|hire[ds]?|join[eds]*|promot|exits?|exit(ed|ing)|departs?|depart(ed|ing)|steps? down|stepping down|to lead|takes over|succeed|commission(er|ed)?|president|\bceo\b|\bcoo\b|\bcfo\b|\bcco\b|\bevp\b|\bsvp\b|\bvp\b|chief|head of|executive|exec\b)\b/i;

/**
 * Same-person detection WITHIN one article.
 *
 * The lead table dedups on ON CONFLICT (article_id, person_name) — an exact
 * string match. That is too strict: the extractor reads the headline on one run
 * and the body on another, so the same person arrived twice as "Jessie Parker"
 * and "Jessica Lynch Parker" from a single article, producing two rows for one
 * human that then get emailed and invited separately.
 *
 * Rule: surnames must match exactly, AND either the first names are identical
 * (so "Del Titus Bawuah" collapses into "Del Bawuah") or they share a prefix of
 * at least 5 characters (jessie/jessica -> "jessi").
 *
 * 5, not 4, because 4 merges michelle/michael — two different people who share a
 * surname. That is the failure that matters: a false merge silently destroys a
 * real lead, whereas a missed merge only leaves a visible duplicate someone can
 * dismiss. The same threshold means jenny/jennifer (prefix 4) is NOT merged;
 * that is the trade accepted on purpose. Scoped to a single article, where two
 * distinct people sharing a surname AND a first-name stem is vanishingly rare.
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function commonPrefixLen(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export function isSamePersonName(a: string, b: string): boolean {
  const A = normalizeName(a).split(' ').filter(Boolean);
  const B = normalizeName(b).split(' ').filter(Boolean);
  if (!A.length || !B.length) return false;
  if (A.join(' ') === B.join(' ')) return true;
  if (A[A.length - 1] !== B[B.length - 1]) return false; // surname must match
  if (A[0] === B[0]) return true; // same first name, differing middle names
  return commonPrefixLen(A[0], B[0]) >= 5;
}

function looksExecRelevant(art: ArticleRow): boolean {
  if (art.item_type === 'exec-move' || art.item_type === 'mandate-statement') return true;
  const hay = `${art.headline ?? ''} ${(art.body ?? '').slice(0, 400)}`;
  return EXEC_SIGNAL_RE.test(hay);
}

interface ArticleRow {
  id: string;
  headline: string | null;
  body: string | null;
  item_type: string | null;
  relevance_tier: string | null;
  source: string | null;
  url: string | null;
  scraped_at: number | null;
  buyer_company: string | null;
}

interface ContactRow {
  id: string;
  name: string;
}

export interface ConnectionLeadRow {
  id: string;
  article_id: string;
  lead_date: string;
  person_name: string;
  person_title: string | null;
  company: string | null;
  prior_company: string | null;
  reason: string | null;
  tier: number;
  tier_reason: string | null;
  status: string;
  dedup_status: string | null;
  dedup_evidence: string | null;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
  apollo_checked_at: number | null;
  matched_contact_id: string | null;
  voice_variant: string | null;
  draft_email_subject: string | null;
  draft_email_body: string | null;
  draft_li_note: string | null;
  created_at: number;
  updated_at: number;
}

/** Local YYYY-MM-DD (not UTC) so "today" matches the user's calendar day. */
export function todayLocalISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** One-line reason-for-connection from the person + article. */
function buildReason(p: ExtractedPerson, art: ArticleRow): string {
  if (p.type === 'exec-move') {
    if (p.new_company && p.new_title) return `Named ${p.new_title} at ${p.new_company}.`;
    if (p.new_company) return `Joining ${p.new_company}.`;
    if (p.old_company) return `Exiting ${p.old_company}${p.old_title ? ` (${p.old_title})` : ''}.`;
  }
  return (art.headline ?? '').slice(0, 120);
}

/**
 * Build (or refresh) today's connection leads.
 * Idempotent: existing (article_id, person_name) rows are left untouched.
 */
export async function buildDailyConnections(
  days = 1
): Promise<{ built: number; skipped: number; byTier: Record<string, number> }> {
  const now = Date.now();
  const since = now - days * 24 * 60 * 60 * 1000;
  const leadDate = todayLocalISO();

  // Briefing-default filter (mirror app/api/intelligence/briefing/route.ts):
  // exec-moves and mandates always; greenlit/cancelled/other only when not 3-skip.
  const articles = await query<ArticleRow>(
    `SELECT id, headline, body, item_type, relevance_tier, source, url, scraped_at, buyer_company
       FROM trade_articles
      WHERE (
              item_type IN ('greenlit','cancelled','exec-move','mandate-statement')
              OR (item_type = 'other' AND relevance_tier IN ('1-direct','2-adjacent'))
            )
        AND headline IS NOT NULL
        AND length(trim(headline)) > 4
        AND (item_type NOT IN ('greenlit','cancelled','other') OR relevance_tier IS DISTINCT FROM '3-skip')
        AND scraped_at >= ?
      ORDER BY scraped_at DESC
      LIMIT ?`,
    [since, MAX_ARTICLES]
  );

  // Load buyer_contacts once for fuzzy matching (avoid N+1).
  const contacts = await query<ContactRow>('SELECT id, name FROM buyer_contacts');

  let built = 0;
  let skipped = 0;
  const byTier: Record<string, number> = { '1': 0, '2': 0, '3': 0 };

  for (const art of articles) {
    // Skip articles that plainly name no executive (music/chart/obituary noise).
    if (!looksExecRelevant(art)) continue;

    const people = await extractPeople(art.headline ?? '', art.body);

    // Names already recorded for THIS article — used to collapse extractor name
    // variants (see isSamePersonName). Seeded from the DB so a re-build does not
    // create a second row under a different spelling, then appended to as we go
    // so two variants inside one batch collapse too.
    const seenNames: string[] = (
      await query<{ person_name: string }>(
        'SELECT person_name FROM connection_leads WHERE article_id = ?',
        [art.id]
      )
    ).map((r) => r.person_name);
    // Pace to respect Groq's per-minute token cap.
    await sleep(EXTRACT_DELAY_MS);

    for (const p of people) {
      const name = (p.name ?? '').trim();
      if (name.length < 3) continue;

      // Already have this human under a different spelling from this article.
      if (seenNames.some((prev) => isSamePersonName(prev, name))) {
        skipped++;
        continue;
      }

      const { tier, tier_reason } = tierFor(p, art);
      const reason = buildReason(p, art);
      // Apollo people-match is anchored on organization_name, so a lead with no
      // company is nearly unenrichable. A 'mentioned' exec's current employer
      // lives in old_company (not new_company), and some exec-moves omit
      // new_company, so fall back through old_company before the article's
      // buyer_company. Only null when no company is known anywhere.
      const company = p.new_company ?? p.old_company ?? art.buyer_company ?? null;

      // Fuzzy-match to an existing buyer contact (probably-known signal).
      let matchedId: string | null = null;
      let best = 0;
      for (const c of contacts) {
        const s = similarity(name, c.name);
        if (s > best) {
          best = s;
          matchedId = c.id;
        }
      }
      const matched_contact_id = best >= MATCH_THRESHOLD ? matchedId : null;

      seenNames.push(name);

      const id = randomUUID();
      // ON CONFLICT DO NOTHING makes re-builds idempotent; changes === 0 means
      // this (article, person) was already built today (or earlier).
      const res = await run(
        `INSERT INTO connection_leads
           (id, article_id, lead_date, person_name, person_title, company, prior_company,
            reason, tier, tier_reason, status, dedup_status, matched_contact_id,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'unchecked', ?, ?, ?)
         ON CONFLICT (article_id, person_name) DO NOTHING`,
        [
          id,
          art.id,
          leadDate,
          name,
          p.new_title ?? p.old_title ?? null,
          company,
          p.old_company ?? null,
          reason,
          tier,
          tier_reason,
          matched_contact_id,
          now,
          now,
        ]
      );

      if (res.changes === 0) {
        skipped++;
        continue;
      }

      built++;
      byTier[String(tier)] = (byTier[String(tier)] ?? 0) + 1;

      // Enrich Tier 1/2 immediately. Tier 3 stays note-only until promoted.
      if (tier === 1 || tier === 2) {
        try {
          await enrichLead(id);
        } catch (err) {
          // Do not fail the whole build for one lead's enrichment error.
          console.error('[connections/build] enrich failed for', name, (err as Error).message);
        }
      }
    }
  }

  return { built, skipped, byTier };
}

/**
 * Dedup + Apollo + draft for a single lead, persisting all fields and flipping
 * status to 'ready'. Reused by the Tier 3 promotion route.
 */
export async function enrichLead(id: string): Promise<ConnectionLeadRow> {
  const lead = await queryOne<ConnectionLeadRow>('SELECT * FROM connection_leads WHERE id = ?', [id]);
  if (!lead) throw new Error(`connection lead ${id} not found`);

  await run(`UPDATE connection_leads SET status = 'enriching', updated_at = ? WHERE id = ?`, [Date.now(), id]);

  // 1) Apollo for email + LinkedIn URL. Run FIRST so dedup can match on the real
  //    email (an exact from:/to: search) instead of a loose name search that
  //    false-matches trade newsletters in Shawn's inbox. Capture the exact error
  //    into email_status so a failure is visible rather than looking like "no email".
  let email: string | null = null;
  let email_status: string | null = null;
  let linkedin_url: string | null = null;
  try {
    const { first, last } = splitName(lead.person_name);
    const a = await apolloMatch(first, last, lead.company ?? '');
    email = a.email;
    email_status = a.email_status;
    linkedin_url = a.linkedin_url;
  } catch (err) {
    email_status = `apollo error: ${(err as Error).message}`;
  }

  // 2) Dedup against Shawn's Gmail + Calendar (read-only). Prefer the Apollo email
  //    for an exact match; fall back to a newsletter-excluded name search. Never throws.
  const dedup = await dedupPerson(lead.person_name, email ?? lead.email ?? undefined).catch((err) => ({
    dedup_status: 'unchecked' as const,
    dedup_evidence: `dedup error: ${(err as Error).message}`,
  }));

  // Known people get the warm reconnect voice; strangers get the intro voice.
  const voice_variant: 'stranger' | 'reconnect' =
    dedup.dedup_status === 'known_gmail' || dedup.dedup_status === 'known_calendar'
      ? 'reconnect'
      : 'stranger';

  // 3) Draft in Shawn's voice. If drafting fails, keep nulls but do not throw.
  let draft = { email_subject: '', email_body: '', li_note: '' };
  try {
    const articleHeadline = await queryOne<{ headline: string | null }>(
      'SELECT headline FROM trade_articles WHERE id = ?',
      [lead.article_id]
    );
    draft = await generateDraft({
      person_name: lead.person_name,
      person_title: lead.person_title,
      company: lead.company,
      prior_company: lead.prior_company,
      reason: lead.reason,
      article_headline: articleHeadline?.headline ?? null,
      dedup_evidence: dedup.dedup_evidence,
      voice_variant,
    });
  } catch (err) {
    console.error('[connections/enrich] draft failed:', (err as Error).message);
  }

  const now = Date.now();
  await run(
    `UPDATE connection_leads
        SET dedup_status = ?, dedup_evidence = ?, email = ?, email_status = ?,
            linkedin_url = ?, apollo_checked_at = ?, voice_variant = ?,
            draft_email_subject = ?, draft_email_body = ?, draft_li_note = ?,
            status = 'ready', updated_at = ?
      WHERE id = ?`,
    [
      dedup.dedup_status,
      dedup.dedup_evidence,
      email,
      email_status,
      linkedin_url,
      now, // apollo_checked_at: set even on miss, so we do not re-bill Apollo
      voice_variant,
      draft.email_subject || null,
      draft.email_body || null,
      draft.li_note || null,
      now,
      id,
    ]
  );

  const updated = await queryOne<ConnectionLeadRow>('SELECT * FROM connection_leads WHERE id = ?', [id]);
  if (!updated) throw new Error(`connection lead ${id} vanished during enrich`);
  return updated;
}
