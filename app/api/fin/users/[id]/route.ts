/**
 * PATCH /api/fin/users/[id] — edit a MYE Admin user (admins only).
 * Body (all optional): { name, role: 'admin'|'cardholder', active: boolean, password }
 *   - active:false deactivates (signs them out everywhere; they can't sign in).
 *   - password resets their password (signs them out everywhere).
 *   - An admin cannot deactivate themselves or remove their own admin role.
 * 200 { user } · 400 invalid · 404 unknown id
 * There is no DELETE: users are deactivated so charge history keeps its names.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import {
  destroyAllFinSessionsForUser,
  hashFinPassword,
  requireFinAdmin,
  validateFinPassword,
} from '@/lib/fin/auth';

const USER_COLS = 'id, email, name, role, active, created_at';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { id: idParam } = await ctx.params;
  if (!/^\d+$/.test(idParam)) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const id = Number(idParam);

  const target = await queryOne<{ id: number }>('SELECT id FROM fin_users WHERE id = ?', [id]);
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sets: string[] = [];
  const params: unknown[] = [];
  let signOutTarget = false;
  const isSelf = id === admin.id;

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Name cannot be blank.' }, { status: 400 });
    sets.push('name = ?');
    params.push(name);
  }
  if (body.role !== undefined) {
    if (body.role !== 'admin' && body.role !== 'cardholder') {
      return NextResponse.json({ error: 'Role must be admin or cardholder.' }, { status: 400 });
    }
    if (isSelf && body.role !== 'admin') {
      return NextResponse.json({ error: "You can't remove your own admin role." }, { status: 400 });
    }
    sets.push('role = ?');
    params.push(body.role);
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'active must be true or false.' }, { status: 400 });
    }
    if (isSelf && !body.active) {
      return NextResponse.json({ error: "You can't deactivate yourself." }, { status: 400 });
    }
    sets.push('active = ?');
    params.push(body.active);
    if (!body.active) signOutTarget = true;
  }
  if (body.password !== undefined) {
    const pwError = validateFinPassword(body.password);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    sets.push('password_hash = ?');
    params.push(hashFinPassword(body.password as string));
    // Signing yourself out on your own reset would be surprising; others are signed out.
    if (!isSelf) signOutTarget = true;
  }

  if (sets.length === 0) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  params.push(id);
  const user = await queryOne(
    `UPDATE fin_users SET ${sets.join(', ')} WHERE id = ? RETURNING ${USER_COLS}`,
    params
  );
  if (signOutTarget) await destroyAllFinSessionsForUser(id);
  return NextResponse.json({ user });
}
