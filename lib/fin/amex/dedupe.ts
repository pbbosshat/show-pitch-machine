// In-file duplicate detection for one Amex statement upload.
//
// Two rows are "possible duplicates" when date, Card Member, description and
// amount all match and their Amex Reference doesn't tell them apart (both blank
// or equal). Every row in such a group is flagged, so the admin sees all copies
// side by side and keeps or deletes each. This only compares rows INSIDE one
// file; it never looks at earlier months (no charge memory).

import type { ParsedCharge } from './parse';
import { normalizeAmexName } from '@/lib/fin/aliases';

export function duplicateKey(c: ParsedCharge): string {
  return [
    c.txnDate,
    normalizeAmexName(c.cardMember),
    c.description.trim().replace(/\s+/g, ' ').toUpperCase(),
    c.amountCents,
    (c.reference ?? '').trim().toUpperCase(),
  ].join('|');
}

/** Index set (positions in `charges`) of rows that belong to a duplicate group. */
export function findInFileDuplicates(charges: ParsedCharge[]): Set<number> {
  const groups = new Map<string, number[]>();
  charges.forEach((c, i) => {
    const k = duplicateKey(c);
    const g = groups.get(k);
    if (g) g.push(i);
    else groups.set(k, [i]);
  });
  const flagged = new Set<number>();
  for (const g of groups.values()) if (g.length > 1) g.forEach((i) => flagged.add(i));
  return flagged;
}
