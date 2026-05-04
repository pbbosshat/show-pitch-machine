// Auth utilities — password hashing, session management, password reset tokens.
// All crypto uses Node's built-in node:crypto (no native addons needed).
// Stored password format: "<salt_hex>:<hash_hex>" (PBKDF2/SHA-512, 100k iterations).

import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { queryOne, run, getDb } from '@/lib/db';

export const SESSION_COOKIE = 'spm_session';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
const RESET_EXPIRY_MS   = 6 * 60 * 60 * 1000;         // 6 hours
const INVITE_EXPIRY_MS  = 72 * 60 * 60 * 1000;        // 72 hours

// ── Schema bootstrap ──────────────────────────────────────────────────────────
// Creates auth-specific tables/columns on first call; safe to call repeatedly.
let _schemaReady = false;
export function ensureAuthSchema(): void {
  if (_schemaReady) return;
  _schemaReady = true;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES team_users(id) ON DELETE CASCADE
    )
  `);
  // Add auth columns to team_users — silently skip if they already exist
  for (const col of [
    'password_hash TEXT',
    'updated_at INTEGER',
    'password_reset_token TEXT',
    'password_reset_expires INTEGER',
    'invite_token TEXT',
    'invite_expires INTEGER',
  ]) {
    try { db.exec(`ALTER TABLE team_users ADD COLUMN ${col}`); } catch { /* exists */ }
  }
}

// ── Password helpers ──────────────────────────────────────────────────────────
export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(32).toString('hex');
  return `${salt}:${hashPassword(password, salt)}`;
}

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

export function getSessionUser(token: string): SessionUser | null {
  if (!token) return null;
  ensureAuthSchema();
  const now = Date.now();
  const row = queryOne<{ user_id: string; expires_at: number }>(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?',
    [token]
  );
  if (!row || row.expires_at < now) return null;
  return queryOne<SessionUser>(
    'SELECT id, name, email, role FROM team_users WHERE id = ?',
    [row.user_id]
  ) ?? null;
}

export function createSession(userId: string): string {
  ensureAuthSchema();
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  run(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, now, now + SESSION_EXPIRY_MS]
  );
  return token;
}

export function deleteSession(token: string): void {
  run('DELETE FROM sessions WHERE token = ?', [token]);
}

// ── Password-reset helpers ────────────────────────────────────────────────────
export function createResetToken(userId: string): string {
  ensureAuthSchema();
  const token = randomBytes(24).toString('hex');
  run(
    'UPDATE team_users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
    [token, Date.now() + RESET_EXPIRY_MS, userId]
  );
  return token;
}

export function validateResetToken(token: string): SessionUser | null {
  ensureAuthSchema();
  const user = queryOne<SessionUser & { password_reset_expires: number }>(
    `SELECT id, name, email, role, password_reset_expires
     FROM team_users WHERE password_reset_token = ?`,
    [token]
  );
  if (!user || user.password_reset_expires < Date.now()) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function clearResetToken(userId: string): void {
  run(
    'UPDATE team_users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
    [userId]
  );
}

// ── Invite-token helpers ──────────────────────────────────────────────────────
export function createInviteToken(userId: string): string {
  ensureAuthSchema();
  const token = randomBytes(24).toString('hex');
  run(
    'UPDATE team_users SET invite_token = ?, invite_expires = ? WHERE id = ?',
    [token, Date.now() + INVITE_EXPIRY_MS, userId]
  );
  return token;
}

export function validateInviteToken(token: string): SessionUser | null {
  ensureAuthSchema();
  const user = queryOne<SessionUser & { invite_expires: number }>(
    'SELECT id, name, email, role, invite_expires FROM team_users WHERE invite_token = ?',
    [token]
  );
  if (!user || user.invite_expires < Date.now()) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function clearInviteToken(userId: string): void {
  run(
    'UPDATE team_users SET invite_token = NULL, invite_expires = NULL WHERE id = ?',
    [userId]
  );
}
