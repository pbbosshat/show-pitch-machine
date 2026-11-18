// MYE Admin auth — the walled-off finance area's OWN login.
//
// Completely separate from staff auth (lib/auth.ts `spm_session` + `sessions` +
// `team_users`): different cookie (mye_admin_session), different tables
// (fin_users / fin_sessions). A staff session grants nothing here and an admin-area
// session grants nothing in the staff app. Only the password hashing helpers are
// shared (PBKDF2 "<salt>:<hash>" format from lib/auth.ts).
//
// Usage in a route handler:
//   const user = await requireFinUser();          // or requireFinAdmin()
//   if (user instanceof NextResponse) return user; // 401 / 403 JSON
//
// Usage in a server component page:
//   const user = await requireFinPageUser();       // redirects to /admin/login
//   const admin = await requireFinPageAdmin();     // also redirects non-admins to /admin

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { createPasswordHash, hashPassword } from '@/lib/auth';
import { withTransaction } from '@/lib/fin/qbo/db';

export const FIN_SESSION_COOKIE = 'mye_admin_session';
export const FIN_SESSION_HOURS = 12;
const FIN_SESSION_MS = FIN_SESSION_HOURS * 60 * 60 * 1000;

/**
 * Sign-in limits, all counted over the last FIN_LOGIN_WINDOW_MINUTES:
 *  - 10 failures for one email FROM ONE IP → that email is blocked from that IP,
 *  - 30 failures from one IP (any emails) → that IP is blocked,
 *  - 50 failures for one email from ALL IPs → that email is blocked everywhere
 *    (caps spread-out guessing), EXCEPT from an IP that signed in successfully as
 *    that email in the last FIN_LOGIN_TRUSTED_IP_DAYS days. So an attacker spraying
 *    guesses from many IPs can't lock the real person out of their usual network;
 *    the two per-IP limits above still apply to that IP.
 * Unknown emails are counted the same way, so the "too many tries" answer doesn't
 * reveal whether an account exists. IP: see finClientIp().
 */
export const FIN_LOGIN_MAX_FAILURES = 10;
export const FIN_LOGIN_MAX_FAILURES_PER_IP = 30;
export const FIN_LOGIN_MAX_FAILURES_PER_EMAIL = 50;
export const FIN_LOGIN_WINDOW_MINUTES = 15;
export const FIN_LOGIN_TRUSTED_IP_DAYS = 30;

export const FIN_MIN_PASSWORD_LENGTH = 8;

export type FinRole = 'admin' | 'cardholder';

export interface FinUser {
  id: number;
  email: string;
  name: string;
  role: FinRole;
}

// ── Passwords ────────────────────────────────────────────────────────────────

/** "<salt>:<hash>" credential string (same format as staff auth). */
export function hashFinPassword(password: string): string {
  return createPasswordHash(password);
}

/** Constant-time check of a password against a "<salt>:<hash>" credential. */
export function verifyFinPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hashPassword(password, salt), 'utf8');
  const b = Buffer.from(hash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

let dummyHash: string | null = null;
/**
 * Spend the same hashing time as a real check when the user is missing or
 * deactivated, so response time doesn't reveal which emails exist. Always false.
 */
export function burnFinPasswordCheck(password: string): false {
  dummyHash ??= createPasswordHash(randomBytes(16).toString('hex'));
  verifyFinPassword(password, dummyHash);
  return false;
}

/** Returns an error message if the password is unacceptable, else null. */
export function validateFinPassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < FIN_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${FIN_MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── Sessions ─────────────────────────────────────────────────────────────────

/** Cookie options for the admin session cookie. */
export function finSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: FIN_SESSION_HOURS * 60 * 60,
  };
}

/** Create a session row and return its opaque token (set it as the cookie value). */
export async function createFinSession(userId: number): Promise<string> {
  // Opportunistic cleanup of expired sessions so the table doesn't grow forever.
  await run('DELETE FROM fin_sessions WHERE expires_at < now()');
  const token = randomBytes(32).toString('hex');
  await run(
    'INSERT INTO fin_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, new Date(Date.now() + FIN_SESSION_MS)]
  );
  return token;
}

/** Delete a session by token. No-op if missing. */
export async function destroyFinSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await run('DELETE FROM fin_sessions WHERE token = ?', [token]);
}

/** Delete every session for a user (used on deactivate / password reset). */
export async function destroyAllFinSessionsForUser(userId: number): Promise<void> {
  await run('DELETE FROM fin_sessions WHERE user_id = ?', [userId]);
}

/** Read the admin-session token from a request, or from next/headers cookies(). */
export async function getFinSessionToken(req?: NextRequest | Request): Promise<string | null> {
  if (req && 'cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    return (req as NextRequest).cookies.get(FIN_SESSION_COOKIE)?.value ?? null;
  }
  const store = await cookies();
  return store.get(FIN_SESSION_COOKIE)?.value ?? null;
}

/**
 * The signed-in admin-area user, or null. Only the mye_admin_session cookie is
 * consulted; staff `spm_session` is ignored. Expired sessions and deactivated
 * users return null. Works in route handlers (pass req or not) and server components.
 */
export async function getFinUser(req?: NextRequest | Request): Promise<FinUser | null> {
  const token = await getFinSessionToken(req);
  if (!token) return null;
  const row = await queryOne<FinUser>(
    `SELECT u.id, u.email, u.name, u.role
       FROM fin_sessions s
       JOIN fin_users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > now() AND u.active = TRUE`,
    [token]
  );
  return row ?? null;
}

// ── Route-handler guards ─────────────────────────────────────────────────────

/** The user, or a 401 JSON NextResponse. */
export async function requireFinUser(req?: NextRequest | Request): Promise<FinUser | NextResponse> {
  const user = await getFinUser(req);
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  return user;
}

/** The admin user, or a 401 (not signed in) / 403 (not an admin) JSON NextResponse. */
export async function requireFinAdmin(req?: NextRequest | Request): Promise<FinUser | NextResponse> {
  const user = await getFinUser(req);
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  return user;
}

// ── Server-component page guards ─────────────────────────────────────────────

/** For /admin pages: the user, or redirect to /admin/login. */
export async function requireFinPageUser(): Promise<FinUser> {
  const user = await getFinUser();
  if (!user) redirect('/admin/login');
  return user;
}

/** For admin-only /admin pages: the admin, or redirect (login if signed out, /admin if cardholder). */
export async function requireFinPageAdmin(): Promise<FinUser> {
  const user = await requireFinPageUser();
  if (user.role !== 'admin') redirect('/admin');
  return user;
}

// ── Login lockout ────────────────────────────────────────────────────────────

/**
 * Client IP for rate limiting. Production is Cloudflare → Railway, so:
 *  1. `cf-connecting-ip` — set by Cloudflare to the real visitor IP (it overwrites any
 *     value the client sent);
 *  2. else the LAST x-forwarded-for entry — the hop appended by the platform proxy.
 *     Earlier entries are whatever the client claimed and can be forged, so they are
 *     never used (with Cloudflare in front this is a Cloudflare edge IP, which is why
 *     cf-connecting-ip comes first);
 *  3. else "unknown".
 */
export function finClientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  const xffLast = req.headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();
  return (cf || xffLast || 'unknown').slice(0, 100);
}

/**
 * Atomically check the limits and, if not locked, record this attempt as a failure
 * up front (it is removed again on success). Done under a transaction-scoped
 * advisory lock, so concurrent guesses can't all slip past the check before any of
 * them is counted.
 */
export async function reserveFinLoginAttempt(email: string, ip: string): Promise<{ locked: boolean }> {
  const e = normalizeEmail(email);
  return withTransaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('fin_login_failures'))");
    const r = await tx.queryOne<{ email_ip: number; ip_all: number; email_all: number }>(
      `SELECT count(*) FILTER (WHERE email = ? AND ip = ?)::int AS email_ip,
              count(*) FILTER (WHERE ip = ?)::int AS ip_all,
              count(*) FILTER (WHERE email = ?)::int AS email_all
         FROM fin_login_failures
        WHERE created_at > now() - make_interval(mins => ?)`,
      [e, ip, ip, e, FIN_LOGIN_WINDOW_MINUTES]
    );
    let locked =
      (r?.email_ip ?? 0) >= FIN_LOGIN_MAX_FAILURES ||
      (r?.ip_all ?? 0) >= FIN_LOGIN_MAX_FAILURES_PER_IP ||
      (r?.email_all ?? 0) >= FIN_LOGIN_MAX_FAILURES_PER_EMAIL;
    // Only the all-IP per-email cap is hit: still allow an IP this email recently
    // signed in from, so the real person isn't locked out by someone else's guessing.
    if (
      locked &&
      (r?.email_ip ?? 0) < FIN_LOGIN_MAX_FAILURES &&
      (r?.ip_all ?? 0) < FIN_LOGIN_MAX_FAILURES_PER_IP
    ) {
      const trusted = await tx.queryOne<{ ok: number }>(
        `SELECT 1 AS ok FROM fin_login_successes
          WHERE email = ? AND ip = ? AND last_at > now() - make_interval(days => ?)`,
        [e, ip, FIN_LOGIN_TRUSTED_IP_DAYS]
      );
      if (trusted) locked = false;
    }
    if (!locked) await tx.query('INSERT INTO fin_login_failures (email, ip) VALUES (?, ?)', [e, ip]);
    // Keep the table small: anything older than a day is irrelevant.
    await tx.query(`DELETE FROM fin_login_failures WHERE created_at < now() - interval '1 day'`);
    return { locked };
  });
}

/**
 * After a successful sign-in: forget this email's failures from this IP (incl. the
 * reserved attempt), and remember this IP as one the email signs in from (see the
 * trusted-IP exception in reserveFinLoginAttempt).
 */
export async function clearFinLoginFailures(email: string, ip: string): Promise<void> {
  const e = normalizeEmail(email);
  await run('DELETE FROM fin_login_failures WHERE email = ? AND ip = ?', [e, ip]);
  if (ip === 'unknown') return; // not a real address — never trust it
  await run(
    `INSERT INTO fin_login_successes (email, ip, last_at) VALUES (?, ?, now())
     ON CONFLICT (email, ip) DO UPDATE SET last_at = now()`,
    [e, ip]
  );
  await run(
    `DELETE FROM fin_login_successes WHERE last_at < now() - make_interval(days => ?)`,
    [FIN_LOGIN_TRUSTED_IP_DAYS]
  );
}
