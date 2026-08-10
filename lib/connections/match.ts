// Fuzzy name/company matching, copied from scripts/process-articles.ts so the
// Daily Connections build uses the exact same similarity logic the entity
// linker uses (keeps "matched to an existing buyer" behavior consistent).

/** Lowercase, strip punctuation, collapse whitespace. "HBO Max" == "hbo max". */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Similarity score 0.0 to 1.0 via bigram Dice coefficient.
 * Exact (normalized) match returns 1.0; substring containment returns 0.85.
 * No external packages, good enough for TV industry names.
 */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const bigrams = (s: string): Set<string> =>
    new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)));

  const ab = bigrams(na);
  const bb = bigrams(nb);
  if (ab.size === 0 || bb.size === 0) return 0;

  const intersection = [...ab].filter((x) => bb.has(x)).length;
  return (2 * intersection) / (ab.size + bb.size);
}

/** Split a full name into first + last for Apollo's people match. */
export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}
