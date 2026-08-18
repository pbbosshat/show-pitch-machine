// Auth utilities — password hashing, session management, password reset tokens.
// All crypto uses Node's built-in node:crypto (no native addons needed).
// Stored password format: "<salt_hex>:<hash_hex>" (PBKDF2/SHA-512, 100k iterations).
//
// Phase 1B note: all DB helpers (queryOne, run, getDb) are now async. Every function
// that calls the DB is async and must be awaited by callers. The schema bootstrap
// (ensureAuthSchema) is also async now — callers should await it or call from an
// async context.

import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { queryOne, run, getDb } from '@/lib/db';

export const SESSION_COOKIE = 'spm_session';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
const RESET_EXPIRY_MS   = 6 * 60 * 60 * 1000;         // 6 hours
const INVITE_EXPIRY_MS  = 72 * 60 * 60 * 1000;        // 72 hours

// ── Schema bootstrap ──────────────────────────────────────────────────────────
// Creates auth-specific tables/columns on first call; safe to call repeatedly.
// Returns a promise — callers must await this before running any auth queries.
let _schemaReady = false;
export async function ensureAuthSchema(): Promise<void> {
  if (_schemaReady) return;
  _schemaReady = true;
  const db = getDb(); // pg.Pool — sync getter, async operations follow

  // Create the sessions table if it doesn't exist. Uses IF NOT EXISTS so it's
  // idempotent across container restarts and dev hot-reloads.
  //
  // Timestamp columns are BIGINT, and must stay BIGINT: they store Date.now()
  // (~1.78T in 2026), which overflows INTEGER's 2.1B max. This lazy-create used
  // to say INTEGER, which is the exact bug migration 037 was written to fix —
  // any environment where this ran before 037's rewrite got overflowing
  // sessions. Keep this definition in lockstep with migrations/037.
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES team_users(id) ON DELETE CASCADE
    )
  `);

  // Add auth columns to team_users — silently skip if they already exist.
  // Postgres doesn't support ADD COLUMN IF NOT EXISTS in older versions, so we
  // use a DO block to catch the duplicate-column error rather than failing the whole call.
  // BIGINT for the same Date.now() reason as sessions above (was INTEGER; see 037).
  const authColumns: [string, string][] = [
    ['password_hash',           'TEXT'],
    ['updated_at',              'BIGINT'],
    ['password_reset_token',    'TEXT'],
    ['password_reset_expires',  'BIGINT'],
    ['invite_token',            'TEXT'],
    ['invite_expires',          'BIGINT'],
  ];

  for (const [col, type] of authColumns) {
    try {
      // ALTER TABLE … ADD COLUMN throws if the column already exists;
      // catch and swallow so we can keep going without aborting the bootstrap.
      await db.query(`ALTER TABLE team_users ADD COLUMN ${col} ${type}`);
    } catch {
      /* column already exists — that's fine */
    }
  }
}

// ── Password helpers ──────────────────────────────────────────────────────────

/**
 * Derive a hex hash from a password + salt using PBKDF2-SHA512 (100k iterations).
 * Pure CPU — no DB interaction.
 */
export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}

/**
 * Create a new "{salt}:{hash}" credential string suitable for storing in
 * team_users.password_hash. Generates a fresh random salt each call.
 */
export function createPasswordHash(password: string): string {
  const salt = randomBytes(32).toString('hex');
  return `${salt}:${hashPassword(password, salt)}`;
}

/**
 * Verify a plaintext password against a stored "{salt}:{hash}" credential.
 * Returns false if the stored format is unrecognisable (e.g. empty or corrupt).
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return hashPassword(password, salt) === hash;
}

// ── Session helpers ───────────────────────────────────────────────────────────
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

/**
 * Validate a session token and return the owning user, or null if the token is
 * missing, expired, or the user row no longer exists.
 *
 * Called by: API route middleware, server components that need auth context.
 */
export async function getSessionUser(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  await ensureAuthSchema();
  const now = Date.now();
  // Look up the session row — token is the PK so this is an index scan
  const row = await queryOne<{ user_id: string; expires_at: number }>(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?',
    [token]
  );
  if (!row || row.expires_at < now) return null;
  return await queryOne<SessionUser>(
    'SELECT id, name, email, role FROM team_users WHERE id = ?',
    [row.user_id]
  ) ?? null;
}

/**
 * Create a new session for a user. Returns the opaque session token that should
 * be set as the spm_session cookie value.
 *
 * Called by: POST /api/auth/login
 */
export async function createSession(userId: string): Promise<string> {
  await ensureAuthSchema();
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  await run(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, now, now + SESSION_EXPIRY_MS]
  );
  return token;
}

/**
 * Delete a session by token (logout). No-op if the token doesn't exist.
 *
 * Called by: POST /api/auth/logout
 */
export async function deleteSession(token: string): Promise<void> {
  await run('DELETE FROM sessions WHERE token = ?', [token]);
}

// ── Password-reset helpers ────────────────────────────────────────────────────

/**
 * Generate a new password-reset token for a user and persist it with a 6-hour expiry.
 * Returns the raw token — caller is responsible for emailing it to the user.
 *
 * Called by: POST /api/auth/forgot-password
 */
export async function createResetToken(userId: string): Promise<string> {
  await ensureAuthSchema();
  const token = randomBytes(24).toString('hex');
  await run(
    'UPDATE team_users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
    [token, Date.now() + RESET_EXPIRY_MS, userId]
  );
  return token;
}

/**
 * Validate a password-reset token and return the owning user, or null if the
 * token is unrecognised or expired.
 *
 * Called by: GET /api/auth/reset-password (to verify before showing the form)
 *            POST /api/auth/reset-password (before accepting the new password)
 */
export async function validateResetToken(token: string): Promise<SessionUser | null> {
  await ensureAuthSchema();
  const user = await queryOne<SessionUser & { password_reset_expires: number }>(
    `SELECT id, name, email, role, password_reset_expires
     FROM team_users WHERE password_reset_token = ?`,
    [token]
  );
  if (!user || user.password_reset_expires < Date.now()) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Clear password-reset token after a successful password change to prevent reuse.
 *
 * Called by: POST /api/auth/reset-password (after password is updated)
 */
export async function clearResetToken(userId: string): Promise<void> {
  await run(
    'UPDATE team_users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
    [userId]
  );
}

// ── Invite-token helpers ──────────────────────────────────────────────────────

/**
 * Generate a 72-hour invite token for a new team member.
 * Returns the raw token — caller emails the /setup-account?token=<token> link.
 *
 * Called by: POST /api/admin/invite
 */
export async function createInviteToken(userId: string): Promise<string> {
  await ensureAuthSchema();
  const token = randomBytes(24).toString('hex');
  await run(
    'UPDATE team_users SET invite_token = ?, invite_expires = ? WHERE id = ?',
    [token, Date.now() + INVITE_EXPIRY_MS, userId]
  );
  return token;
}

/**
 * Validate an invite token and return the invited user, or null if expired/invalid.
 *
 * Called by: GET /api/auth/invite (to verify before showing the setup form)
 *            POST /api/auth/setup-account
 */
export async function validateInviteToken(token: string): Promise<SessionUser | null> {
  await ensureAuthSchema();
  const user = await queryOne<SessionUser & { invite_expires: number }>(
    'SELECT id, name, email, role, invite_expires FROM team_users WHERE invite_token = ?',
    [token]
  );
  if (!user || user.invite_expires < Date.now()) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * Clear invite token after the user successfully sets their password.
 * Prevents the one-time token from being reused.
 *
 * Called by: POST /api/auth/setup-account (after password is saved)
 */
export async function clearInviteToken(userId: string): Promise<void> {
  await run(
    'UPDATE team_users SET invite_token = NULL, invite_expires = NULL WHERE id = ?',
    [userId]
  );
}
