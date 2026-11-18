/**
 * GET /api/fin/qbo/log (admin) — recent QuickBooks sync attempts, newest first.
 * Query: ?limit=50 (max 500) &chargeId= &statementId=
 * → { log: [{ id, charge_id, ok, message, qbo_txn_id, created_at, created_by_name,
 *             txn_date, amex_description, amount_cents, statement_id }] }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { getSyncLog } from '@/lib/fin/qbo/status';

function posInt(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const p = req.nextUrl.searchParams;
  const log = await getSyncLog({
    limit: posInt(p.get('limit')),
    chargeId: posInt(p.get('chargeId')),
    statementId: posInt(p.get('statementId')),
  });
  return NextResponse.json({ log });
}
