// Transaction helper for the QuickBooks code. lib/db.ts's query/run go through the
// pool (each call may use a different connection), so row locks (SELECT … FOR UPDATE)
// need one dedicated client for BEGIN … COMMIT. Uses `?` placeholders like lib/db.

import type { PoolClient } from 'pg';
import { getDb } from '@/lib/db';

export interface Tx {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
}

/** `?` → `$1…` (no `?` inside quotes is used in this module's SQL). */
function toPg(sql: string): string {
  let n = 0;
  let inQuote = false;
  let out = '';
  for (const ch of sql) {
    if (ch === "'") inQuote = !inQuote;
    if (ch === '?' && !inQuote) out += `$${++n}`;
    else out += ch;
  }
  return out;
}

function wrap(client: PoolClient): Tx {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await client.query(toPg(sql), params)).rows as T[];
    },
    async queryOne<T>(sql: string, params: unknown[] = []) {
      return (await client.query(toPg(sql), params)).rows[0] as T | undefined;
    },
  };
}

/** Run `fn` inside BEGIN/COMMIT on one connection; ROLLBACK on throw. */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(wrap(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
