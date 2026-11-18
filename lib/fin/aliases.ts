// Amex "Card Member" name -> fin_users mapping (fin_cardholder_aliases).
// Name matching only — this never remembers anything about charges.

import { query, queryOne } from '@/lib/db';

export interface FinAlias {
  id: number;
  amex_name: string;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
}

/** Normalized form stored in fin_cardholder_aliases.amex_name: trimmed, single-spaced, upper-case. */
export function normalizeAmexName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

export async function listAliases(): Promise<FinAlias[]> {
  return query<FinAlias>(
    `SELECT a.id, a.amex_name, a.user_id, u.name AS user_name, u.email AS user_email
       FROM fin_cardholder_aliases a
       LEFT JOIN fin_users u ON u.id = a.user_id
      ORDER BY a.amex_name`
  );
}

/** Insert or re-point an alias. Returns the saved row id. */
export async function upsertAlias(amexName: string, userId: number): Promise<number> {
  const row = await queryOne<{ id: number }>(
    `INSERT INTO fin_cardholder_aliases (amex_name, user_id) VALUES (?, ?)
     ON CONFLICT (amex_name) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id`,
    [normalizeAmexName(amexName), userId]
  );
  return row!.id;
}

/** fin_users.id for an Amex card member name, or null if no alias exists. */
export async function findUserIdForAmexName(amexName: string): Promise<number | null> {
  const row = await queryOne<{ user_id: number | null }>(
    'SELECT user_id FROM fin_cardholder_aliases WHERE amex_name = ?',
    [normalizeAmexName(amexName)]
  );
  return row?.user_id ?? null;
}
