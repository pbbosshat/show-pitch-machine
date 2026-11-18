/**
 * GET /api/fin/qbo/status (admin) → QboStatus (lib/fin/qbo/status.ts):
 * { configured, environment, connected, realmId, connectedAt, connectedByName,
 *   refreshExpiresAt, cardAccount, cardAccountDefaulted, cardAccountMissing,
 *   lists: { accounts, classes, refreshedAt } }
 * Never returns tokens.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { getQboStatus } from '@/lib/fin/qbo/status';

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json(await getQboStatus());
}
