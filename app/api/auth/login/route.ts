// POST /api/auth/login — authenticate with email + password, set session cookie.
// Body: { email: string; password: string }
// On success: sets httpOnly spm_session cookie + returns { ok, user }.
// On failure: returns { error } with appropriate 4xx status.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword, createSession, ensureAuthSchema, SESSION_COOKIE } from '@/lib/auth';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  password_hash: string | null;
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();

    const body = await request.json().catch(() => ({}));
    const { email, password } = body as Record<string, string>;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await queryOne<UserRow>(
      'SELECT id, name, email, role, password_hash FROM team_users WHERE lower(email) = lower(?)',
      [email.trim()]
    );

    // Return identical error for unknown email vs. wrong password (prevents enumeration)
    if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[login] unhandled error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
