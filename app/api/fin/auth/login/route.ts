/**
 * POST /api/fin/auth/login — MYE Admin sign-in (separate from staff /api/auth/login).
 * Body: { email, password }
 * 200 { ok, user } + sets mye_admin_session cookie (12h)
 * 400 missing fields · 401 bad credentials (same message AND same hashing time for
 * unknown email, wrong password, or deactivated user) · 429 too many failures
 * (limits in lib/fin/auth.ts: per email+IP, per IP, per email; same answer whether
 * or not the email exists).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import {
  FIN_SESSION_COOKIE,
  FIN_LOGIN_WINDOW_MINUTES,
  burnFinPasswordCheck,
  clearFinLoginFailures,
  createFinSession,
  finClientIp,
  finSessionCookieOptions,
  normalizeEmail,
  reserveFinLoginAttempt,
  verifyFinPassword,
  type FinRole,
} from '@/lib/fin/auth';

interface Row {
  id: number;
  email: string;
  name: string;
  role: FinRole;
  password_hash: string | null;
  active: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const ip = finClientIp(req);
    // Counts this attempt as a failure up front (atomically); cleared below on success.
    if ((await reserveFinLoginAttempt(email, ip)).locked) {
      return NextResponse.json(
        { error: `Too many failed sign-ins. Try again in ${FIN_LOGIN_WINDOW_MINUTES} minutes.` },
        { status: 429 }
      );
    }

    const user = await queryOne<Row>(
      'SELECT id, email, name, role, password_hash, active FROM fin_users WHERE lower(email) = ?',
      [email]
    );

    const valid =
      user && user.active && user.password_hash
        ? verifyFinPassword(password, user.password_hash)
        : burnFinPasswordCheck(password);
    if (!user || !valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await clearFinLoginFailures(email, ip);
    const token = await createFinSession(user.id);
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    res.cookies.set(FIN_SESSION_COOKIE, token, finSessionCookieOptions());
    return res;
  } catch (err) {
    console.error('[fin login] error:', err);
    return NextResponse.json({ error: 'Sign-in failed. Please try again.' }, { status: 500 });
  }
}
