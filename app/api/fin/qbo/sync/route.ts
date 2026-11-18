/**
 * POST /api/fin/qbo/sync (admin) — post tagged, unsynced charges to QuickBooks.
 * Body: { chargeIds?: number[], statementId?: number }   (neither = every eligible charge)
 * → { results: [{ chargeId, ok, qboTxnId?, error?, skipped?, receipt?, receiptError? }] }
 *
 * - chargeIds: one result per id. Ineligible charges (already synced, not tagged,
 *   deleted, being synced by another request, not found) come back as
 *   { ok:false, skipped:true, error:<reason> } and nothing is sent for them.
 * - statementId: only eligible charges in the statement are posted; ineligible ones
 *   are OMITTED. Synced charges whose receipt hasn't reached QuickBooks yet get the
 *   receipt retried and appear in the results too.
 * Every attempt is written to the sync log. See lib/fin/qbo/sync.ts for the
 * no-double-post guarantees.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { syncCharges } from '@/lib/fin/qbo/sync';

export async function POST(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json().catch(() => ({}))) as { chargeIds?: unknown; statementId?: unknown };
  let chargeIds: number[] | undefined;
  if (body.chargeIds !== undefined) {
    if (!Array.isArray(body.chargeIds) || !body.chargeIds.every((n) => Number.isSafeInteger(n) && (n as number) > 0)) {
      return NextResponse.json({ error: 'chargeIds must be a list of charge ids.' }, { status: 400 });
    }
    chargeIds = body.chargeIds as number[];
    if (chargeIds.length > 1000) return NextResponse.json({ error: 'Too many charges at once (max 1000).' }, { status: 400 });
  }
  let statementId: number | undefined;
  if (body.statementId !== undefined) {
    if (!Number.isSafeInteger(body.statementId) || (body.statementId as number) <= 0) {
      return NextResponse.json({ error: 'statementId must be a statement id.' }, { status: 400 });
    }
    statementId = body.statementId as number;
  }

  const results = await syncCharges({ chargeIds, statementId, userId: admin.id });
  return NextResponse.json({ results });
}
