// tools/articles.ts — MCP tool handler for trade article search.
//
// Replaces LanceDB vector search with Postgres full-text search over trade_articles.
// The search_vector tsvector column (generated, GIN-indexed) covers headline + body.
//
// ts_rank() gives BM25-like relevance scoring so results are ordered by match quality.
// For most MYE queries (mandate quotes, buyer intel, market context) Postgres FTS
// is sufficient — we lose pure semantic similarity but gain speed and no GPU dependency.

import { query } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArticleResult {
  id: string;
  source: string | null;
  url: string | null;
  headline: string | null;
  body: string | null;
  item_type: string | null;
  scraped_at: number | null;
  rank: number;
  // Formatted citation string for inline referencing in Claude's response
  citation: string;
}

interface ArticleSearchFilters {
  genre?: string;
  network?: string;
  item_type?: string;
  buyer_company?: string;
}

// ── Tool function ─────────────────────────────────────────────────────────────

/**
 * Full-text search over ingested trade articles.
 *
 * Uses Postgres ts_rank() for relevance ordering — returns the top `limit` articles
 * sorted by match quality, not chronology. Caller can request up to 25 results.
 *
 * Optional filters (genre, item_type, buyer_company) are applied as ILIKE clauses
 * against the body text since trade_articles doesn't have dedicated filter columns.
 * This is a deliberate simplification — the search_vector already covers the full body.
 *
 * Citation string format: "Source Name (scraped_at date) — article:id"
 * Matches the pattern from the old LanceDB implementation so Claude's referencing
 * behavior doesn't change after the migration.
 */
export async function searchArticlesTool(
  queryText: string,
  limit = 10,
  filters?: ArticleSearchFilters
): Promise<ArticleResult[]> {
  // Cap limit to 25 — larger result sets bloat the context window with marginal value
  const safeLimit = Math.min(limit, 25);

  const params: unknown[] = [queryText];
  let paramIdx = 2;

  const whereClauses: string[] = [
    `search_vector @@ plainto_tsquery('english', $1)`,
  ];

  // Filter clauses applied as ILIKE on body text — sparse but sufficient for trade intel
  if (filters?.item_type) {
    whereClauses.push(`item_type = $${paramIdx++}`);
    params.push(filters.item_type);
  }
  if (filters?.genre) {
    whereClauses.push(`body ILIKE $${paramIdx++}`);
    params.push(`%${filters.genre}%`);
  }
  if (filters?.buyer_company) {
    whereClauses.push(`body ILIKE $${paramIdx++}`);
    params.push(`%${filters.buyer_company}%`);
  }
  if (filters?.network) {
    // Network mentions appear in both headline and body — search both
    whereClauses.push(`(headline ILIKE $${paramIdx} OR body ILIKE $${paramIdx})`);
    params.push(`%${filters.network}%`);
    paramIdx++;
  }

  // Append limit as a safe parameterized value
  params.push(safeLimit);
  const limitParam = `$${paramIdx}`;

  const rows = await query<{
    id: string;
    source: string | null;
    url: string | null;
    headline: string | null;
    body: string | null;
    item_type: string | null;
    scraped_at: number | null;
    rank: number;
  }>(
    `SELECT
       id, source, url, headline, body, item_type, scraped_at,
       ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
     FROM trade_articles
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY rank DESC
     LIMIT ${limitParam}`,
    params
  );

  // Attach a human-readable citation so Claude can inline-cite sources in its response
  return rows.map((row) => ({
    ...row,
    citation: buildCitation(row),
  }));
}

/**
 * Build a citation string for a trade article row.
 * Format: "Deadline (2025-09-12) — article:abc123"
 */
function buildCitation(row: {
  source: string | null;
  scraped_at: number | null;
  id: string;
}): string {
  const parts: string[] = [];

  if (row.source) parts.push(row.source);

  if (row.scraped_at) {
    // scraped_at is stored as unix milliseconds (INTEGER) in the SQLite schema
    // Postgres receives it as-is; convert to a readable date for citation
    const d = new Date(
      row.scraped_at > 1e12 ? row.scraped_at : row.scraped_at * 1000
    );
    if (!isNaN(d.getTime())) {
      parts.push(`(${d.toISOString().slice(0, 10)})`);
    }
  }

  parts.push(`— article:${row.id}`);

  return parts.join(' ');
}
