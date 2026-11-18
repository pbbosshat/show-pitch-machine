// Pure tagging rules shared by the server (lib/fin/amex/tagging.ts) and the
// browser (the tagging table shows the same message before saving). No DB, no
// Node APIs — safe to import from client components. The server is the authority.

/** "D2914 Accommodations - Crew" — number then name, without repeating a number already in the name. */
export function accountDisplayName(a: { acct_num: string | null; name: string; fully_qualified_name?: string | null }): string {
  const name = (a.fully_qualified_name || a.name).trim();
  const num = (a.acct_num ?? '').trim();
  if (!num || name.toUpperCase().startsWith(num.toUpperCase())) return name;
  return `${num} ${name}`;
}

/** The account's number: acct_num, else a leading "D1234"/"6100"-style token in its name. */
export function accountNumber(a: { acct_num: string | null; name: string }): string {
  const num = (a.acct_num ?? '').trim();
  if (num) return num;
  const m = a.name.trim().match(/^([A-Za-z]?\d[\w.-]*)\b/);
  return m ? m[1] : '';
}

export function isShowAccount(a: { acct_num: string | null; name: string }): boolean {
  return /^d/i.test(accountNumber(a));
}

export function isAdminClass(c: { name: string; fully_qualified_name?: string | null }): boolean {
  return c.name.trim().toUpperCase() === 'ADMIN' || (c.fully_qualified_name ?? '').trim().toUpperCase() === 'ADMIN';
}

export const ADMIN_D_ERROR =
  'Class ADMIN is overhead: choose an account whose number does not start with "D". D accounts are for show Classes.';

/** QuickBooks account types a card charge may be tagged to. Everything else (the card itself, banks, income …) is refused. */
export const TAGGABLE_ACCOUNT_TYPES = ['Expense', 'Other Expense', 'Cost of Goods Sold'] as const;

export function isTaggableAccount(
  a: { qbo_id: string; account_type?: string | null },
  cardAccountQboId?: string | null
): boolean {
  if (cardAccountQboId && a.qbo_id === cardAccountQboId) return false;
  return (TAGGABLE_ACCOUNT_TYPES as readonly string[]).includes((a.account_type ?? '').trim());
}

export const NOT_EXPENSE_ERROR =
  'Charges can only be tagged to an expense account (Expense, Other Expense or Cost of Goods Sold).';
export const CARD_ACCOUNT_ERROR =
  'That is the Amex card account itself. Choose the expense account the money was spent on.';
