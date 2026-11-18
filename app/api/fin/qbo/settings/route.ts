/**
 * /api/fin/qbo/settings (admin) — the card account purchases post against.
 * GET → { cardAccount: {qbo_id, acct_num, name, fully_qualified_name, account_type} | null,
 *         defaulted: boolean }   (defaulted = using "2200 MCS Show AMEX" found by name/number)
 * PUT { cardAccountQboId: string | null } → same shape. null = go back to the default.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { resolveCardAccount, setCardAccount } from '@/lib/fin/qbo/lists';

async function current() {
  const { account, defaulted } = await resolveCardAccount();
  return { cardAccount: account, defaulted };
}

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json(await current());
}

export async function PUT(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const body = (await req.json().catch(() => ({}))) as { cardAccountQboId?: unknown };
  const v = body.cardAccountQboId;
  if (v !== null && (typeof v !== 'string' || !v.trim())) {
    return NextResponse.json({ error: 'cardAccountQboId must be an account id or null.' }, { status: 400 });
  }
  try {
    await setCardAccount(v === null ? null : v.trim());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  return NextResponse.json(await current());
}
