// Money helpers for MYE Admin. All money is stored and computed as INTEGER CENTS.
// Never do arithmetic on dollar floats — convert at the edges with these helpers.
// Pure functions; safe to import from server or client components.

/**
 * Parse a dollar amount string into integer cents, or null if it isn't a number.
 * Accepts "$1,234.56", "1234.5", "-12.00", "(12.00)" (accounting negative),
 * "12.00 CR" / "12.00-" (credit suffix). Rounds half away from zero to the cent.
 */
export function parseDollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    // Route numbers through the same string path as text, so 1.005 -> 101 cents
    // exactly like "1.005" (Math.round(1.005 * 100) gives 100: 1.005 is stored as
    // 1.00499999…). String(n) is the shortest decimal that round-trips, i.e. what
    // the spreadsheet showed. Tiny values print in exponent form; toFixed(12)
    // writes them out (they round to 0 cents anyway). Absurd sizes aren't money.
    if (!Number.isFinite(input) || Math.abs(input) >= 1e15) return null;
    const str = String(input);
    return parseDollarsToCents(/e/i.test(str) ? input.toFixed(12) : str);
  }
  let s = input.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (/\s*CR$/i.test(s)) {
    negative = true;
    s = s.replace(/\s*CR$/i, '');
  }
  if (/-$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  s = s.replace(/[$,\s]/g, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  // Round on the third decimal digit using string math (no float error).
  const padded = (frac + '000').slice(0, 3);
  let cents = Number(whole || '0') * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) cents += 1;
  return negative ? -cents : cents;
}

/** Cents -> plain decimal string for APIs/QBO, e.g. 123456 -> "1234.56", -500 -> "-5.00". */
export function centsToDecimalString(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const s = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

/** Cents -> number of dollars (for QBO JSON Amount fields). Exact to the cent. */
export function centsToDollarsNumber(cents: number): number {
  return Number(centsToDecimalString(cents));
}

/**
 * Cents -> display string "$1,234.56". Negatives (credits) display as "-$12.00".
 * Use formatCentsWithCredit when the UI should label credits explicitly.
 */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  const neg = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const s = `$${dollars}.${String(abs % 100).padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

/** Like formatCents but credits read "$12.00 CR" — the invoice-style convention. */
export function formatCentsWithCredit(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  if (cents < 0) return `${formatCents(-cents)} CR`;
  return formatCents(cents);
}

/** Sum a list of cent amounts (ignores null/undefined). */
export function sumCents(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) if (typeof v === 'number') total += v;
  return total;
}
