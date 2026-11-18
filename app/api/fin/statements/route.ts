/**
 * /api/fin/statements — monthly Amex statements (admins only).
 * GET  → { statements: StatementSummary[] }
 * POST multipart { month: "YYYY-MM", file: <Amex CSV or XLSX> }
 *      → 201 { statement, imported, duplicates, unmatched: string[], skipped }
 *      400 bad month / unreadable file / charge dates don't fit the month (most outside it ±45 days)
 *      409 month already imported · 413 file too big
 * Columns are found by header name (lib/fin/amex/parse.ts). Card Member names are
 * matched to users through the alias table; rows repeated inside the file are
 * flagged possible_duplicate for an admin to keep or delete.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireFinAdmin } from '@/lib/fin/auth';
import { normalizeAmexName } from '@/lib/fin/aliases';
import { AmexParseError, checkStatementMonth, parseAmexFile } from '@/lib/fin/amex/parse';
import { findInFileDuplicates } from '@/lib/fin/amex/dedupe';
import { getStatement, listStatements, monthLabel, withTransaction } from '@/lib/fin/amex/charges';

const MAX_STATEMENT_BYTES = 5 * 1024 * 1024;
const INSERT_CHUNK = 500;

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ statements: await listStatements() });
}

async function alreadyImported(month: string) {
  const row = await queryOne<{ uploaded_at: string; name: string | null; file_name: string | null }>(
    `SELECT s.uploaded_at, u.name, s.file_name FROM fin_statements s LEFT JOIN fin_users u ON u.id = s.uploaded_by
      WHERE s.statement_month = ?::date`,
    [`${month}-01`]
  );
  if (!row) return null;
  const when = new Date(row.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return NextResponse.json(
    {
      error: `${monthLabel(month)} has already been imported (${row.file_name ?? 'file'}, uploaded ${when}${row.name ? ` by ${row.name}` : ''}). A month can only be imported once.`,
    },
    { status: 409 }
  );
}

export async function POST(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_STATEMENT_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'That file is too large (max 5 MB).' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Send the month and the file as a form upload.' }, { status: 400 });
  }
  const month = String(form.get('month') ?? '').trim();
  const file = form.get('file');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'Choose the statement month.' }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose the Amex file to upload (CSV or Excel).' }, { status: 400 });
  }
  if (file.size > MAX_STATEMENT_BYTES) {
    return NextResponse.json({ error: 'That file is too large (max 5 MB).' }, { status: 413 });
  }

  // Check first so the admin gets the clear message without waiting on parsing.
  const dup = await alreadyImported(month);
  if (dup) return dup;

  let parsed;
  try {
    parsed = parseAmexFile(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof AmexParseError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const { charges, skipped } = parsed;
  const wrongMonth = checkStatementMonth(charges, month);
  if (wrongMonth) return NextResponse.json({ error: wrongMonth }, { status: 400 });
  const dupIdx = findInFileDuplicates(charges);

  // Card Member -> user, via the alias table (name matching only).
  const aliasRows = await query<{ amex_name: string; user_id: number | null }>(
    'SELECT a.amex_name, a.user_id FROM fin_cardholder_aliases a JOIN fin_users u ON u.id = a.user_id'
  );
  const aliasMap = new Map(aliasRows.map((a) => [a.amex_name, a.user_id]));
  const unmatched = new Set<string>();
  const cardholderIds = charges.map((c) => {
    const id = aliasMap.get(normalizeAmexName(c.cardMember)) ?? null;
    if (id === null) unmatched.add(c.cardMember);
    return id;
  });

  let statementId: number;
  try {
    statementId = await withTransaction(async (client) => {
      const ins = await client.query<{ id: number }>(
        `INSERT INTO fin_statements (statement_month, file_name, uploaded_by) VALUES ($1::date, $2, $3) RETURNING id`,
        [`${month}-01`, file.name.slice(0, 255), admin.id]
      );
      const sid = Number(ins.rows[0].id);
      for (let start = 0; start < charges.length; start += INSERT_CHUNK) {
        const slice = charges.slice(start, start + INSERT_CHUNK);
        const params: unknown[] = [];
        const values = slice.map((c, j) => {
          const i = start + j;
          params.push(sid, c.txnDate, c.description, c.cardMember, c.reference, c.extendedDetails, c.cardAccount,
            c.amountCents, cardholderIds[i], dupIdx.has(i));
          const b = params.length - 10;
          return `($${b + 1}, $${b + 2}::date, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10})`;
        });
        await client.query(
          `INSERT INTO fin_charges (statement_id, txn_date, amex_description, card_member, amex_reference,
             extended_details, card_account, amount_cents, cardholder_id, possible_duplicate)
           VALUES ${values.join(', ')}`,
          params
        );
      }
      return sid;
    });
  } catch (e) {
    // Two admins uploading the same month at once: the UNIQUE index decides.
    if ((e as { code?: string }).code === '23505') {
      return (await alreadyImported(month)) ?? NextResponse.json({ error: 'That month has already been imported.' }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json(
    {
      statement: await getStatement(statementId),
      imported: charges.length,
      duplicates: dupIdx.size,
      unmatched: [...unmatched].sort(),
      skipped,
    },
    { status: 201 }
  );
}
