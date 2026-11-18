/**
 * /api/fin/charges/[id]/receipt — the optional receipt for a charge (photo or PDF).
 * PUT    raw file bytes as the body; headers: Content-Type = the file's type
 *        (image/* except SVG, or application/pdf), X-File-Name = encodeURIComponent(name)
 *        → { receipt: { file_name, mime_type, size_bytes } }
 *        400 wrong type / empty · 413 over 10 MB · 409 charge already in QuickBooks or month closed
 * GET    → the file (inline for images/PDF, never sniffed)
 * DELETE → { ok }   (409 when in QuickBooks or the month is closed)
 * PUT/DELETE lock the charge row FOR UPDATE and re-check "synced" inside the same
 * transaction, so a receipt can't be swapped while a QuickBooks sync posts the charge.
 * Same access rule as the charge: admin any, cardholder own only (else 404).
 *
 * Why a raw body and not multipart: middleware runs on /api/fin/*, and Next buffers
 * proxied request bodies only up to 10 MB (experimental.proxyClientMaxBodySize).
 * A 10 MB file wrapped in multipart would exceed that and arrive truncated. A raw
 * body is exactly the file size, so every allowed file fits.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { PoolClient } from 'pg';
import { queryOne } from '@/lib/db';
import { requireFinUser } from '@/lib/fin/auth';
import { CHARGE_LOCKED, MONTH_CLOSED, getChargeForUser, parseId, withTransaction } from '@/lib/fin/amex/charges';

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'Charge not found.' }, { status: 404 });

async function access(req: NextRequest, ctx: Ctx) {
  const user = await requireFinUser(req);
  if (user instanceof NextResponse) return user;
  const id = parseId((await ctx.params).id);
  const charge = id ? await getChargeForUser(user, id) : undefined;
  if (!charge) return notFound();
  return { user, charge };
}

/** Lock the charge row and say why it can't change, or null when it can. */
async function lockEditable(client: PoolClient, chargeId: number): Promise<{ error: string; status: number } | null> {
  const r = await client.query<{ status: string; qbo_txn_id: string | null; closed_at: string | null }>(
    `SELECT c.status, c.qbo_txn_id, s.closed_at
       FROM fin_charges c JOIN fin_statements s ON s.id = c.statement_id
      WHERE c.id = $1 FOR UPDATE OF c`,
    [chargeId]
  );
  const row = r.rows[0];
  if (!row) return { error: 'Charge not found.', status: 404 };
  if (row.status === 'synced' || row.qbo_txn_id) return { error: CHARGE_LOCKED, status: 409 };
  if (row.closed_at) return { error: MONTH_CLOSED, status: 409 };
  return null;
}

function allowedType(mime: string): boolean {
  if (mime === 'application/pdf') return true;
  return /^image\/[a-z0-9.+-]+$/.test(mime) && !mime.includes('svg');
}

/** Light magic-byte check so a mislabeled file (e.g. HTML sent as image/png) is refused. */
function contentMatches(mime: string, b: Buffer): boolean {
  const starts = (...bytes: number[]) => bytes.every((x, i) => b[i] === x);
  if (mime === 'application/pdf') return starts(0x25, 0x50, 0x44, 0x46); // %PDF
  if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/pjpeg') return starts(0xff, 0xd8, 0xff);
  if (mime === 'image/png') return starts(0x89, 0x50, 0x4e, 0x47);
  if (mime === 'image/gif') return starts(0x47, 0x49, 0x46, 0x38);
  if (mime === 'image/webp') return starts(0x52, 0x49, 0x46, 0x46) && b.subarray(8, 12).toString('latin1') === 'WEBP';
  // Other image/* (HEIC from iPhones, TIFF, BMP …): refuse anything that looks like markup.
  const head = b.subarray(0, 256).toString('latin1').trimStart().toLowerCase();
  return !(head.startsWith('<') || head.includes('<script') || head.includes('<html') || head.includes('<svg'));
}

function cleanFileName(raw: string | null, mime: string): string {
  let name = '';
  try { name = decodeURIComponent(raw ?? ''); } catch { name = raw ?? ''; }
  name = name.replace(/[\u0000-\u001f\u007f"\\/]/g, '').trim().slice(0, 200);
  if (name) return name;
  return mime === 'application/pdf' ? 'receipt.pdf' : `receipt.${mime.split('/')[1] ?? 'img'}`;
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const a = await access(req, ctx);
  if (a instanceof NextResponse) return a;
  const { user, charge } = a;
  // Early answer before reading the body; re-checked under the row lock below.
  if (charge.status === 'synced' || charge.qbo_txn_id) return NextResponse.json({ error: CHARGE_LOCKED }, { status: 409 });
  if (charge.statement_closed) return NextResponse.json({ error: MONTH_CLOSED }, { status: 409 });

  const mime = (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!allowedType(mime)) {
    return NextResponse.json({ error: 'Receipts must be a photo (JPG, PNG, HEIC …) or a PDF.' }, { status: 400 });
  }
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_RECEIPT_BYTES) return NextResponse.json({ error: 'That file is over 10 MB.' }, { status: 413 });

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: 'The file is empty.' }, { status: 400 });
  if (buf.length > MAX_RECEIPT_BYTES) return NextResponse.json({ error: 'That file is over 10 MB.' }, { status: 413 });
  if (declared && buf.length !== declared) {
    return NextResponse.json({ error: 'The upload did not arrive complete. Try again.' }, { status: 400 });
  }
  if (!contentMatches(mime, buf)) {
    return NextResponse.json({ error: "That file's contents don't match its type. Upload the original photo or PDF." }, { status: 400 });
  }

  const fileName = cleanFileName(req.headers.get('x-file-name'), mime);
  const blocked = await withTransaction(async (client) => {
    const why = await lockEditable(client, charge.id);
    if (why) return why;
    await client.query(
      `INSERT INTO fin_receipts (charge_id, file_name, mime_type, data, size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (charge_id) DO UPDATE SET file_name = EXCLUDED.file_name, mime_type = EXCLUDED.mime_type,
         data = EXCLUDED.data, size_bytes = EXCLUDED.size_bytes, uploaded_by = EXCLUDED.uploaded_by,
         uploaded_at = now(), qbo_attachable_id = NULL`,
      [charge.id, fileName, mime, buf, buf.length, user.id]
    );
    return null;
  });
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });
  return NextResponse.json({ receipt: { file_name: fileName, mime_type: mime, size_bytes: buf.length } });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const a = await access(req, ctx);
  if (a instanceof NextResponse) return a;
  const r = await queryOne<{ file_name: string | null; mime_type: string | null; data: Buffer }>(
    'SELECT file_name, mime_type, data FROM fin_receipts WHERE charge_id = ?',
    [a.charge.id]
  );
  if (!r) return NextResponse.json({ error: 'No receipt for this charge.' }, { status: 404 });
  const mime = r.mime_type && allowedType(r.mime_type) ? r.mime_type : 'application/octet-stream';
  const name = r.file_name || 'receipt';
  const disposition = req.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline';
  return new NextResponse(new Uint8Array(r.data), {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(r.data.length),
      'Content-Disposition': `${disposition}; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'X-Content-Type-Options': 'nosniff',
      // Chrome's PDF viewer won't render in a sandboxed document, so sandbox images only.
      'Content-Security-Policy':
        mime === 'application/pdf' ? "default-src 'none'; object-src 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const a = await access(req, ctx);
  if (a instanceof NextResponse) return a;
  const outcome = await withTransaction(async (client) => {
    const why = await lockEditable(client, a.charge.id);
    if (why) return why;
    const del = await client.query('DELETE FROM fin_receipts WHERE charge_id = $1', [a.charge.id]);
    if (!del.rowCount) return { error: 'No receipt for this charge.', status: 404 };
    return null;
  });
  if (outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  return NextResponse.json({ ok: true });
}
