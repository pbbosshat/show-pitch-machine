/**
 * POST   /api/intelligence/briefing/feedback
 * DELETE /api/intelligence/briefing/feedback
 * GET    /api/intelligence/briefing/feedback
 * Called by: Intelligence briefing page (browser session, admin-authenticated)
 * Auth: spm_session cookie (admin session required)
 *
 * POST — record user feedback on a briefing item (one record per article; upsert on re-flag)
 *   Body: { article_id: string, reason: string, headline?: string, source?: string }
 *   Response: { ok: true }
 *
 * DELETE — remove a flag from an article
 *   Body: { article_id: string }
 *   Response: { ok: true }
 *
 * GET — return all feedback with a summary breakdown, for filter-tuning review
 *   Response: { items: FeedbackRow[], summary: { reason: string, count: number }[] }
 *
 * Valid reasons: not_relevant | scripted | wrong_genre | in_pipeline | duplicate
 * Feedback rows drive the intelligence filter-tuning workflow — flagged articles
 * surface in the review panel so the relevance classifier can be updated.
 */

import { NextResponse } from 'next/server';
import { run, query } from '@/lib/db';

const VALID_REASONS = new Set(['not_relevant', 'scripted', 'wrong_genre', 'in_pipeline', 'duplicate']);

export interface FeedbackRow {
  id: number;
  article_id: string;
  reason: string;
  headline: string | null;
  source: string | null;
  created_at: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      article_id?: string;
      reason?: string;
      headline?: string;
      source?: string;
    };

    const { article_id, reason, headline = null, source = null } = body;

    if (!article_id || typeof article_id !== 'string') {
      return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
    }
    if (!reason || !VALID_REASONS.has(reason)) {
      return NextResponse.json(
        { error: `reason must be one of: ${[...VALID_REASONS].join(', ')}` },
        { status: 400 },
      );
    }

    // Use EXTRACT(EPOCH...) instead of SQLite's strftime('%s','now') for the
    // ON CONFLICT update path — keeps created_at consistent with the initial insert.
    await run(
      `INSERT INTO briefing_feedback (article_id, reason, headline, source)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(article_id) DO UPDATE SET
         reason     = excluded.reason,
         headline   = excluded.headline,
         source     = excluded.source,
         created_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`,
      [article_id, reason, headline, source],
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { article_id?: string };
    const { article_id } = body;

    if (!article_id || typeof article_id !== 'string') {
      return NextResponse.json({ error: 'article_id is required' }, { status: 400 });
    }

    await run('DELETE FROM briefing_feedback WHERE article_id = ?', [article_id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const items = await query<FeedbackRow>(
      `SELECT id, article_id, reason, headline, source, created_at
       FROM briefing_feedback
       ORDER BY created_at DESC
       LIMIT 500`,
    );

    const summary = await query<{ reason: string; count: number }>(
      `SELECT reason, COUNT(*) AS count
       FROM briefing_feedback
       GROUP BY reason
       ORDER BY count DESC`,
    );

    return NextResponse.json({ items, summary });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
