/**
 * GET /api/networks/[id]
 * Called by: network detail page server component
 * Auth: none
 * Response: { data: NetworkDetail }
 *
 * NetworkDetail includes the buyer_companies row plus:
 *   contacts      — all buyer_contacts for this company_id (BuyerContactSummary[])
 *   recent_deals  — last 20 deals with this network_id, joined for show/buyer/prodco names
 *   market_orders — last 20 market_orders linked via buyer_company_id, joined for show title
 *
 * Returns 404 { error: string } if the company is not found.
 *
 * NOTE: market_orders links to buyer_companies via buyer_company_id (not network_id).
 * Contacts, deals, and market_orders are fetched via JSON subqueries to keep it one query.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { NetworkDetail } from '@/types';

// Raw DB row — JSON subquery results arrive as strings that need parsing
interface NetworkRow extends Omit<NetworkDetail, 'contacts' | 'recent_deals' | 'market_orders'> {
  contacts_json: string | null;
  recent_deals_json: string | null;
  market_orders_json: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<NetworkRow>(
      `SELECT
        bc.id,
        bc.name,
        bc.type,
        bc.tier,
        bc.hq_city,
        bc.notes,
        bc.created_at,
        bc.updated_at,

        -- All contacts at this company, ordered by activity so the most-active surface first
        (SELECT json_group_array(json_object(
          'id',              bcon.id,
          'name',            bcon.name,
          'title',           bcon.title,
          'email',           bcon.email,
          'activity_status', bcon.activity_status,
          'role_type',       bcon.role_type,
          'is_buyer_seat',   bcon.is_buyer_seat
        ) ORDER BY bcon.last_greenlit_date DESC)
         FROM buyer_contacts bcon
         WHERE bcon.company_id = bc.id
        ) AS contacts_json,

        -- Last 20 deals at this network, denormalized for UI display
        (SELECT json_group_array(json_object(
          'id',          d.id,
          'show_title',  d.show_title,
          'buyer_id',    d.buyer_id,
          'buyer_name',  d.buyer_name,
          'prodco_name', d.prodco_name,
          'deal_date',   d.deal_date,
          'deal_type',   d.deal_type,
          'genre',       d.genre
        ) ORDER BY d.deal_date DESC)
         FROM (
           SELECT * FROM deals
           WHERE network_id = bc.id
           ORDER BY deal_date DESC
           LIMIT 20
         ) d
        ) AS recent_deals_json,

        -- Last 20 market orders linked to this company via buyer_company_id
        (SELECT json_group_array(json_object(
          'id',         mo.id,
          'show_title', mo.show_title,
          'order_date', mo.order_date,
          'genre',      mo.genre,
          'format',     mo.format,
          'source',     mo.source
        ) ORDER BY mo.order_date DESC)
         FROM (
           SELECT * FROM market_orders
           WHERE buyer_company_id = bc.id
           ORDER BY order_date DESC
           LIMIT 20
         ) mo
        ) AS market_orders_json

       FROM buyer_companies bc
       WHERE bc.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Network not found' }, { status: 404 });
    }

    // Deserialize the three JSON subquery strings into typed arrays
    const contacts = row.contacts_json ? JSON.parse(row.contacts_json) : [];
    const recent_deals = row.recent_deals_json ? JSON.parse(row.recent_deals_json) : [];
    const market_orders = row.market_orders_json ? JSON.parse(row.market_orders_json) : [];

    // Strip the raw JSON fields before responding
    const { contacts_json: _c, recent_deals_json: _d, market_orders_json: _m, ...rest } = row;

    const data: NetworkDetail = { ...rest, contacts, recent_deals, market_orders };
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
