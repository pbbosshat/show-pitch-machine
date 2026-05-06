/**
 * GET /api/buyers/[id]/articles
 *   Returns trade press articles linked to a buyer contact via entity_article_links.
 *   Uses entity_type = 'buyer_contact' to scope to the buyer dimension.
 *
 * Called by: BuyerTabs "Trade Press" tab (client component, SWR)
 * Auth: none (matches pattern of sibling routes in this directory)
 * Response: { data: ArticleLink[] }
 *
 * ArticleLink shape:
 *   id, headline, url, source, item_type, scraped_at,
 *   signal_type, link_reason, auto_applied, applied_field, applied_value
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Joined shape from trade_articles + entity_article_links
interface ArticleLink {
  id: string;
  headline: string | null;
  url: string | null;
  source: string | null;
  item_type: string | null;
  scraped_at: number | null;
  signal_type: string | null;
  link_reason: string | null;
  auto_applied: number;
  applied_field: string | null;
  applied_value: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Join entity_article_links → trade_articles scoped to this buyer contact.
    // ORDER BY scraped_at DESC so the most recent trade press appears first.
    const articles = query<ArticleLink>(
      `SELECT ta.id, ta.headline, ta.url, ta.source, ta.item_type, ta.scraped_at,
              ta.signal_type, eal.link_reason, eal.auto_applied,
              eal.applied_field, eal.applied_value
       FROM entity_article_links eal
       JOIN trade_articles ta ON ta.id = eal.article_id
       WHERE eal.entity_type = 'buyer_contact' AND eal.entity_id = ?
       ORDER BY ta.scraped_at DESC
       LIMIT 50`,
      [id]
    );

    return NextResponse.json({ data: articles });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
