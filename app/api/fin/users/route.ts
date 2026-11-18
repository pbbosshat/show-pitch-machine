/**
 * /api/fin/users — MYE Admin user management (admins only).
 * GET  → { users: [{ id, email, name, role, active, created_at }] }
 * POST { name, email, role: 'admin'|'cardholder', password } → 201 { user }
 *      400 invalid input · 409 email already exists
 */

import { NextResponse, type NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashFinPassword, normalizeEmail, requireFinAdmin, validateFinPassword } from '@/lib/fin/auth';

const USER_COLS = 'id, email, name, role, active, created_at';

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const users = await query(`SELECT ${USER_COLS} FROM fin_users ORDER BY active DESC, name`);
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const role = body.role;

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'cardholder') {
    return NextResponse.json({ error: 'Role must be admin or cardholder.' }, { status: 400 });
  }
  const pwError = validateFinPassword(body.password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

  const existing = await queryOne('SELECT id FROM fin_users WHERE lower(email) = ?', [email]);
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 });
  }

  try {
    const user = await queryOne(
      `INSERT INTO fin_users (email, name, role, password_hash) VALUES (?, ?, ?, ?)
       RETURNING ${USER_COLS}`,
      [email, name, role, hashFinPassword(body.password as string)]
    );
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    // Unique violation from a concurrent insert.
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A user with that email already exists.' }, { status: 409 });
    }
    throw err;
  }
}
