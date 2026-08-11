/**
 * POST /api/connections/[id]/redraft
 * Regenerates only the draft fields (email_subject, email_body, li_note) for an
 * existing connection lead using its current DB data. Does NOT re-run Apollo or
 * dedup — uses whatever is already stored. Safe to call repeatedly.
 *
 * Useful when the Groq draft call was skipped (e.g., Apollo API key missing on
 * Railway) and draft_li_note / draft_email_* are null, without having to run
 * the full enrich cycle (which requires Apollo).
 */
import { NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { generateDraft } from '@/lib/connections/draft';
import { type ConnectionLeadRow } from '@/lib/connections/build';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the existing lead — all fields needed to reconstruct the draft prompt.
    const lead = await queryOne<ConnectionLeadRow>(
      'SELECT * FROM connection_leads WHERE id = ?',
      [id]
    );
    if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Pull the article headline for context (may be null; generateDraft handles that).
    const articleHeadline = await queryOne<{ headline: string | null }>(
      'SELECT headline FROM trade_articles WHERE id = ?',
      [lead.article_id]
    );

    // Preserve whatever voice_variant was set during enrich; default to stranger
    // if the lead was never enriched (e.g., Tier 3 with no Apollo pass).
    const voice_variant: 'stranger' | 'reconnect' =
      lead.voice_variant === 'reconnect' ? 'reconnect' : 'stranger';

    const draft = await generateDraft({
      person_name: lead.person_name,
      person_title: lead.person_title,
      company: lead.company,
      prior_company: lead.prior_company,
      reason: lead.reason,
      article_headline: articleHeadline?.headline ?? null,
      dedup_evidence: lead.dedup_evidence,
      voice_variant,
    });

    // Write only the three draft fields — leave all enrichment/Apollo/dedup data
    // untouched so this endpoint is truly side-effect-free on everything else.
    await run(
      `UPDATE connection_leads
          SET draft_email_subject = ?, draft_email_body = ?, draft_li_note = ?,
              updated_at = ?
        WHERE id = ?`,
      [draft.email_subject || null, draft.email_body || null, draft.li_note || null, Date.now(), id]
    );

    return NextResponse.json({
      success: true,
      draft_li_note: draft.li_note,
      draft_email_subject: draft.email_subject,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
