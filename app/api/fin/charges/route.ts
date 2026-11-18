/**
 * /api/fin/charges — charges list.
 * GET ?statementId=&cardholderId=<id|unmatched>&status=new|tagged|synced&includeClosed=1
 *   → { charges: ChargeView[] }
 * Cardholders always get only their own (non-deleted) charges; the cardholderId
 * filter is ignored for them. Without statementId, only open (not closed) months
 * are listed unless includeClosed=1.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinUser } from '@/lib/fin/auth';
import { listChargesForUser, parseId, type ChargeFilters, type ChargeStatus } from '@/lib/fin/amex/charges';

const STATUSES: ChargeStatus[] = ['new', 'tagged', 'synced'];

export async function GET(req: NextRequest) {
  const user = await requireFinUser(req);
  if (user instanceof NextResponse) return user;
  const sp = req.nextUrl.searchParams;

  const f: ChargeFilters = {};
  const sid = sp.get('statementId');
  if (sid) {
    const n = parseId(sid);
    if (!n) return NextResponse.json({ charges: [] });
    f.statementId = n;
  }
  const ch = sp.get('cardholderId');
  if (ch && user.role === 'admin') {
    if (ch === 'unmatched') f.cardholderId = 'unmatched';
    else {
      const n = parseId(ch);
      if (!n) return NextResponse.json({ charges: [] });
      f.cardholderId = n;
    }
  }
  const status = sp.get('status');
  if (status) {
    if (!STATUSES.includes(status as ChargeStatus)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
    f.status = status as ChargeStatus;
  }
  f.includeClosed = sp.get('includeClosed') === '1';

  return NextResponse.json({ charges: await listChargesForUser(user, f) });
}
