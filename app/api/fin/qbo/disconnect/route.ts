/**
 * POST /api/fin/qbo/disconnect (admin) — revoke the token at Intuit and forget it here.
 * The cached account/Class lists and the card-account setting are kept, so tagging
 * keeps working. → { ok: true, warning?: string }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { isQboConfigured } from '@/lib/fin/qbo/config';
import { disconnect } from '@/lib/fin/qbo/connection';

export async function POST(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isQboConfigured()) return NextResponse.json({ error: "QuickBooks isn't configured yet." }, { status: 400 });

  const { revokeWarning } = await disconnect();
  return NextResponse.json({
    ok: true,
    ...(revokeWarning ? { warning: `Disconnected here, but Intuit didn't confirm the revoke: ${revokeWarning}` } : {}),
  });
}
