/**
 * POST /api/fin/qbo/refresh-lists (admin) — reload active accounts + classes from
 * QuickBooks into the cache. → { accounts, classes, refreshedAt }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { isQboConfigured } from '@/lib/fin/qbo/config';
import { QboNotConnectedError } from '@/lib/fin/qbo/connection';
import { refreshLists } from '@/lib/fin/qbo/lists';

export async function POST(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  if (!isQboConfigured()) return NextResponse.json({ error: "QuickBooks isn't configured yet." }, { status: 400 });

  try {
    return NextResponse.json(await refreshLists());
  } catch (err) {
    const status = err instanceof QboNotConnectedError ? 409 : 502;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
