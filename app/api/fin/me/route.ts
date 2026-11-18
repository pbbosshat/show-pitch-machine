/**
 * GET /api/fin/me — the signed-in MYE Admin user.
 * 200 { user: { id, email, name, role } } · 401 when not signed in to the admin area.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinUser } from '@/lib/fin/auth';

export async function GET(req: NextRequest) {
  const user = await requireFinUser(req);
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ user });
}
