// Amex statement download -> charge rows (CSV or XLSX). Server-only.
//
// Columns are found BY HEADER NAME, never by position: Date, Description,
// Card Member, Amount (required) plus Account #, Reference and Extended Details
// when present. Real Amex Excel downloads have a few junk rows (title, card
// name, date range) above the header, so we scan the first rows for the header.
// Amex signs amounts the way we store them: charges positive, credits negative.
// Money becomes integer cents here and stays cents everywhere after.

import * as XLSX from 'xlsx';
import { parseDollarsToCents } from '@/lib/fin/money';

export interface ParsedCharge {
  /** 1-based row number in the file (for error messages). */
  rowNumber: number;
  txnDate: string; // YYYY-MM-DD
  description: string;
  cardMember: string;
  amountCents: number;
  cardAccount: string | null;
  reference: string | null;
  extendedDetails: string | null;
}

export interface ParseResult {
  charges: ParsedCharge[];
  /** Rows below the header with neither a date nor a Card Member (e.g. total lines). */
  skipped: number;
}

/** A file we can't import. The message is shown to the admin as-is. */
export class AmexParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AmexParseError';
  }
}

type Cell = string | number | boolean | Date | null | undefined;

// ── CSV reader (RFC 4180) ────────────────────────────────────────────────────
// A quote opens a quoted field only as the field's first character; "" inside
// quotes is a literal quote; commas and newlines inside quotes are data. An
// unterminated quote rejects the whole file rather than silently dropping rows.
export function readCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let atStart = true;
  let inQuotes = false;
  let dirty = false;
  let line = 1;
  let quoteLine = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
      continue;
    }
    if (c === '"' && atStart) { inQuotes = true; quoteLine = line; atStart = false; dirty = true; continue; }
    if (c === ',') { row.push(field); field = ''; atStart = true; dirty = true; continue; }
    if (c === '\r' || c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; atStart = true; dirty = false; line++;
      if (c === '\r' && src[i + 1] === '\n') i++;
      continue;
    }
    field += c; atStart = false; dirty = true;
  }
  if (inQuotes) {
    throw new AmexParseError(`The file can't be read: the quote opened on line ${quoteLine} is never closed.`);
  }
  if (dirty) { row.push(field); rows.push(row); }
  return rows;
}

// ── XLSX reader ──────────────────────────────────────────────────────────────
/** First worksheet as a grid of raw cell values (numbers stay numbers; dates are Excel serials). */
export function readXlsx(buf: Buffer): Cell[][] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: 'buffer', cellDates: false, dense: true });
  } catch {
    throw new AmexParseError("The Excel file can't be opened. Download it again from Amex and retry.");
  }
  const name = wb.SheetNames[0];
  if (!name) throw new AmexParseError('The Excel file has no worksheets.');
  return XLSX.utils.sheet_to_json<Cell[]>(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: false });
}

// ── Header detection ─────────────────────────────────────────────────────────
const norm = (v: Cell) => (v === null || v === undefined ? '' : String(v)).trim().toLowerCase().replace(/\s+/g, ' ');

/** Column index for the first candidate that matches exactly; then for one the header starts with. */
function findCol(header: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = header.indexOf(c);
    if (i >= 0) return i;
  }
  for (const c of candidates) {
    const i = header.findIndex((h) => h.startsWith(c));
    if (i >= 0) return i;
  }
  return -1;
}

const COLS = {
  date: ['date', 'transaction date', 'trans date', 'post date', 'posting date'],
  description: ['description', 'merchant'],
  cardMember: ['card member', 'cardmember', 'card holder', 'cardholder'],
  amount: ['amount'],
  account: ['account #', 'account number', 'account'],
  reference: ['reference', 'reference #', 'reference number'],
  extended: ['extended details', 'extended detail'],
};

interface HeaderMap { row: number; date: number; description: number; cardMember: number; amount: number; account: number; reference: number; extended: number }

function locateHeader(grid: Cell[][]): HeaderMap {
  const scan = Math.min(grid.length, 40);
  let best: { row: number; found: string[] } | null = null;
  for (let r = 0; r < scan; r++) {
    const header = (grid[r] ?? []).map(norm);
    const map = {
      date: findCol(header, COLS.date),
      description: findCol(header, COLS.description),
      cardMember: findCol(header, COLS.cardMember),
      amount: findCol(header, COLS.amount),
    };
    const found = Object.entries(map).filter(([, i]) => i >= 0).map(([k]) => k);
    if (found.length === 4) {
      return {
        row: r,
        ...map,
        account: findCol(header, COLS.account),
        reference: findCol(header, COLS.reference),
        extended: findCol(header, COLS.extended),
      };
    }
    if (found.length >= 2 && (!best || found.length > best.found.length)) best = { row: r, found };
  }
  const labels: Record<string, string> = { date: 'Date', description: 'Description', cardMember: 'Card Member', amount: 'Amount' };
  if (best) {
    const missing = Object.keys(labels).filter((k) => !best.found.includes(k)).map((k) => labels[k]);
    throw new AmexParseError(
      `The header row (row ${best.row + 1}) is missing the ${missing.join(', ')} column${missing.length > 1 ? 's' : ''}. ` +
        'Use the Amex download that includes Date, Description, Card Member and Amount.'
    );
  }
  throw new AmexParseError(
    "Couldn't find the header row. The file needs columns named Date, Description, Card Member and Amount."
  );
}

// ── Cell parsers ─────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

function validYmd(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > days) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Date cell -> YYYY-MM-DD, or null. Handles MM/DD/YYYY, M/D/YY, YYYY-MM-DD, "Nov 03 2026", Excel serials. */
export function parseAmexDate(v: Cell): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return validYmd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v);
    return p ? validYmd(p.y, p.m, p.d) : null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(\s|$)/);
  if (m) return validYmd(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase());
    return mo >= 0 ? validYmd(+m[3], mo + 1, +m[2]) : null;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return parseAmexDate(Number(s)); // serial stored as text
  return null;
}

const text = (v: Cell): string => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v)).trim();
const optText = (v: Cell): string | null => text(v) || null;

/** Stored when Amex leaves the Description blank, so the charge still imports. */
export const NO_DESCRIPTION = '(no description)';

// ── Public entry points ──────────────────────────────────────────────────────
/** Turn a grid (from CSV or XLSX) into charges. Throws AmexParseError with a readable message. */
export function parseAmexGrid(grid: Cell[][]): ParseResult {
  const h = locateHeader(grid);
  const charges: ParsedCharge[] = [];
  const badDates: number[] = [];
  const noMember: number[] = [];
  let skipped = 0;

  const badAmounts: number[] = [];
  for (let r = h.row + 1; r < grid.length; r++) {
    const cells = grid[r] ?? [];
    if (!cells.some((c) => text(c) !== '')) continue; // blank row
    const txnDate = parseAmexDate(cells[h.date]);
    const cardMember = text(cells[h.cardMember]).replace(/\s+/g, ' ');
    // Only a row with neither a date nor a Card Member is a non-charge line
    // (title, "Total", footnote). Anything else is a charge and must import, or
    // the whole file is refused: money rows are never dropped silently.
    if (!txnDate && !cardMember) { skipped++; continue; }
    if (!txnDate) { badDates.push(r + 1); continue; }
    if (!cardMember) { noMember.push(r + 1); continue; }
    const rawAmount = cells[h.amount];
    const amountCents =
      typeof rawAmount === 'number' ? parseDollarsToCents(rawAmount) : parseDollarsToCents(text(rawAmount));
    if (amountCents === null) { badAmounts.push(r + 1); continue; }
    const description = text(cells[h.description]).replace(/\s+/g, ' ') || NO_DESCRIPTION;
    const reference = h.reference >= 0 ? text(cells[h.reference]).replace(/^['"]+|['"]+$/g, '').trim() || null : null;
    charges.push({
      rowNumber: r + 1,
      txnDate,
      description,
      cardMember,
      amountCents,
      cardAccount: h.account >= 0 ? optText(cells[h.account]) : null,
      reference,
      extendedDetails: h.extended >= 0 ? optText(cells[h.extended]) : null,
    });
  }

  const list = (rows: number[]) => rows.slice(0, 8).join(', ') + (rows.length > 8 ? ` and ${rows.length - 8} more` : '');
  if (badDates.length) throw new AmexParseError(`Row ${list(badDates)}: the Date can't be read. Nothing was imported.`);
  if (noMember.length) throw new AmexParseError(`Row ${list(noMember)}: the Card Member is blank. Nothing was imported.`);
  if (badAmounts.length) throw new AmexParseError(`Row ${list(badAmounts)}: the Amount can't be read. Nothing was imported.`);
  if (charges.length === 0) throw new AmexParseError('The file has a header row but no charges under it.');
  return { charges, skipped };
}

/** True for Excel files (xlsx = zip "PK", legacy xls = OLE "D0 CF 11 E0"). */
export function looksLikeExcel(buf: Buffer): boolean {
  return (buf[0] === 0x50 && buf[1] === 0x4b) || (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0);
}

/** Parse an uploaded Amex download (CSV or Excel), deciding by content, not file name. */
export function parseAmexFile(buf: Buffer): ParseResult {
  if (looksLikeExcel(buf)) return parseAmexGrid(readXlsx(buf));
  const textContent = buf.toString('utf8');
  if (textContent.includes('\u0000')) throw new AmexParseError('That file is not a CSV or Excel download.');
  return parseAmexGrid(readCsv(textContent));
}

// ── Month sanity check ───────────────────────────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ymLabel = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const dayMs = 86_400_000;
const ymdMs = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const usDate = (ymd: string) => `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}/${ymd.slice(0, 4)}`;

/** Charges may fall up to this many days before the 1st / after the last day of the chosen month (billing cycles straddle months). */
export const MONTH_SLACK_DAYS = 45;

/**
 * Refuse a file whose charges mostly don't belong to the chosen statement month
 * (e.g. the October file uploaded as November). Returns the message to show, or
 * null when the dates fit. "Fit" = within the month ± MONTH_SLACK_DAYS; the
 * upload is refused when MORE than half of the charges fall outside that window.
 */
export function checkStatementMonth(charges: Array<{ txnDate: string }>, month: string): string | null {
  if (charges.length === 0) return null;
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const from = Date.UTC(y, m - 1, 1) - MONTH_SLACK_DAYS * dayMs;
  const to = Date.UTC(y, m, 0) + MONTH_SLACK_DAYS * dayMs; // Date.UTC(y, m, 0) = last day of the month
  const outside = charges.filter((c) => { const t = ymdMs(c.txnDate); return t < from || t > to; }).length;
  if (outside * 2 <= charges.length) return null;

  const dates = charges.map((c) => c.txnDate).sort();
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(d.slice(0, 7), (counts.get(d.slice(0, 7)) ?? 0) + 1);
  // Most common month; ties go to the later month (statements are named for the month they close).
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0][0];
  return (
    `The charges in this file are dated ${usDate(dates[0])} to ${usDate(dates[dates.length - 1])}, ` +
    `but you chose ${ymLabel(month)} (${outside} of ${charges.length} charges fall outside it). ` +
    `This looks like the ${ymLabel(best)} statement. Choose ${ymLabel(best)} as the month and upload again. Nothing was imported.`
  );
}
