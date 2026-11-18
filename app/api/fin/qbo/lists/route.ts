/**
 * GET /api/fin/qbo/lists (any signed-in MYE Admin user) — dropdown data for tagging,
 * read from the cache tables (works when QuickBooks is disconnected/unconfigured).
 * → { accounts: [{ qbo_id, acct_num, name, fully_qualified_name, account_type }],
 *     classes:  [{ qbo_id, name, fully_qualified_name }],
 *     refreshedAt: ISO string | null,
 *     cardAccountQboId: string | null }   // the Amex card account purchases post against
 *                                          // (never a valid expense Account for tagging)
 * Active entries only. Accounts are sorted by acct_num (no number last), then name.
 * All active accounts are returned (including the credit-card account itself) —
 * the UI decides what to show.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinUser } from '@/lib/fin/auth';
import { getCachedLists, resolveCardAccount } from '@/lib/fin/qbo/lists';

export async function GET(req: NextRequest) {
  const user = await requireFinUser(req);
  if (user instanceof NextResponse) return user;
  const [lists, card] = await Promise.all([getCachedLists(), resolveCardAccount()]);
  return NextResponse.json({ ...lists, cardAccountQboId: card.account?.qbo_id ?? null });
}
