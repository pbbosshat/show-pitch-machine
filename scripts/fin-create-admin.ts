// Create the first MYE Admin user (role = admin).
//
//   DATABASE_URL=postgres://... npx tsx scripts/fin-create-admin.ts <email> "<name>" <password>
//
// Does NOT read .env files — DATABASE_URL must be passed explicitly so you always
// know which database you are writing to (it prints the host before writing).
// Refuses if the email already exists. Requires migration 048 to have been applied
// (the app applies migrations on boot).

import { createPasswordHash } from '@/lib/auth';
import { getDb, queryOne } from '@/lib/db';

async function main() {
  const [emailArg, nameArg, password] = process.argv.slice(2);
  if (!emailArg || !nameArg || !password) {
    console.error('Usage: npx tsx scripts/fin-create-admin.ts <email> "<name>" <password>');
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();
  const name = nameArg.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Refusing: "${emailArg}" is not a valid email.`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Refusing: password must be at least 8 characters.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Refusing: DATABASE_URL is not set. Pass it explicitly on the command line.');
    process.exit(1);
  }
  let host = '(unparseable)';
  try {
    const u = new URL(process.env.DATABASE_URL);
    host = `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch { /* keep placeholder */ }
  console.log(`Database: ${host}`);

  const table = await queryOne<{ t: string | null }>("SELECT to_regclass('public.fin_users')::text AS t");
  if (!table?.t) {
    console.error('Refusing: fin_users does not exist. Apply migrations first (migration 048_fin_admin.sql).');
    process.exit(1);
  }

  const existing = await queryOne<{ id: number; role: string }>(
    'SELECT id, role FROM fin_users WHERE lower(email) = ?',
    [email]
  );
  if (existing) {
    console.error(`Refusing: a MYE Admin user with email ${email} already exists (id ${existing.id}, role ${existing.role}). Nothing changed.`);
    process.exit(1);
  }

  const row = await queryOne<{ id: number }>(
    `INSERT INTO fin_users (email, name, role, password_hash) VALUES (?, ?, 'admin', ?) RETURNING id`,
    [email, name, createPasswordHash(password)]
  );
  console.log(`Created MYE Admin user id ${row!.id}: ${name} <${email}>, role admin. They can sign in at /admin/login.`);
}

main()
  .then(() => getDb().end())
  .catch(async (err) => {
    console.error('Failed:', (err as Error).message);
    try { await getDb().end(); } catch { /* ignore */ }
    process.exit(1);
  });
