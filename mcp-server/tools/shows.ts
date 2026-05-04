// tools/shows.ts — MCP tool handlers for show and market order queries.
//
// Ported from lib/mcp/tools/shows.ts (SQLite FTS5) to Postgres full-text search.
// SQLite's "shows_fts MATCH ?" → Postgres "search_vector @@ plainto_tsquery('english', $1)".
// plainto_tsquery handles multi-word phrases naturally (AND by default, no special syntax).

import { query } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Show {
  id: string;
  title: string;
  title_normalized: string | null;
  network: string | null;
  production_company: string | null;
  showrunner: string | null;
  host: string | null;
  format: string | null;
  genre: string | null;
  subgenre: string | null;
  is_unscripted: number;
  episode_count: number | null;
  season_number: number | null;
  status: string | null;
  greenlit_date: number | null;
  premiere_date: number | null;
  air_status: string | null;
  is_our_show: number;
  data_source: string;
  [key: string]: unknown;
}

interface MarketOrder {
  id: string;
  show_id: string | null;
  show_title: string | null;
  network: string | null;
  buyer_company_id: string | null;
  buyer_contact_id: string | null;
  format: string | null;
  genre: string | null;
  episode_count: number | null;
  order_type: string | null;
  order_date: number | null;
  source: string | null;
  source_url: string | null;
  created_at: number | null;
  company_name?: string | null;
}

interface ShowSearchFilters {
  genre?: string;
  network?: string;
  status?: string;
  format?: string;
  location_type?: string;
}

interface MarketOrderFilters {
  network?: string;
  genre?: string;
  format?: string;
  since_date?: number;
  buyer_company_id?: string;
}

// ── Tool functions ────────────────────────────────────────────────────────────

/**
 * Full-text search over shows using Postgres tsvector.
 *
 * Primary path: plainto_tsquery over the search_vector generated column.
 * Fallback: ILIKE on title/genre/network for very short queries (1-2 chars)
 * where the tsquery parser may not produce useful tokens.
 *
 * Optional filters narrow by genre, network, status, or format as exact-match
 * WHERE clauses on the main table — same logic as the SQLite version.
 */
export async function searchShows(
  searchQuery: string,
  filters?: ShowSearchFilters
): Promise<Show[]> {
  // Short queries (bare single letters or symbols) break plainto_tsquery —
  // fall back to ILIKE which handles partial matches better in that edge case
  const useFullText = searchQuery.trim().length >= 3;

  const params: unknown[] = [searchQuery];
  let paramIdx = 2; // next $N after $1 = searchQuery

  // Build optional filter clauses using parameterized values
  const filterClauses: string[] = [];
  if (filters?.genre) { filterClauses.push(`s.genre ILIKE $${paramIdx++}`); params.push(`%${filters.genre}%`); }
  if (filters?.network) { filterClauses.push(`s.network ILIKE $${paramIdx++}`); params.push(`%${filters.network}%`); }
  if (filters?.status) { filterClauses.push(`s.status = $${paramIdx++}`); params.push(filters.status); }
  if (filters?.format) { filterClauses.push(`s.format = $${paramIdx++}`); params.push(filters.format); }
  if (filters?.location_type) { filterClauses.push(`s.location_type = $${paramIdx++}`); params.push(filters.location_type); }

  const filterSql = filterClauses.length > 0
    ? 'AND ' + filterClauses.join(' AND ')
    : '';

  if (useFullText) {
    // Primary: GIN-indexed tsvector search — fast on large datasets
    // ts_rank orders by relevance (BM25-like scoring built into Postgres)
    return query<Show>(
      `SELECT s.*,
              ts_rank(s.search_vector, plainto_tsquery('english', $1)) AS _rank
       FROM shows s
       WHERE s.search_vector @@ plainto_tsquery('english', $1)
         ${filterSql}
       ORDER BY _rank DESC
       LIMIT 50`,
      params
    );
  } else {
    // Fallback for very short queries: ILIKE across key text columns
    const likeParam = `%${searchQuery}%`;
    // Replace $1 placeholder with three separate ILIKE params
    const fallbackParams: unknown[] = [likeParam, likeParam, likeParam, ...params.slice(1)];
    return query<Show>(
      `SELECT s.*
       FROM shows s
       WHERE (s.title ILIKE $1 OR s.genre ILIKE $2 OR s.network ILIKE $3)
         ${filterSql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + 2}`)}
       LIMIT 50`,
      fallbackParams
    );
  }
}

/**
 * Market order query — what's been ordered recently by whom.
 * LEFT JOINs buyer_companies so we get company_name in a single query.
 * All filters are optional; with no filters returns the 50 most recent orders.
 */
export async function getMarketOrders(
  filters?: MarketOrderFilters
): Promise<Array<MarketOrder & { company_name: string | null }>> {
  const params: unknown[] = [];
  let paramIdx = 1;

  const whereClauses: string[] = ['1 = 1'];

  if (filters?.network) { whereClauses.push(`mo.network = $${paramIdx++}`); params.push(filters.network); }
  if (filters?.genre) { whereClauses.push(`mo.genre = $${paramIdx++}`); params.push(filters.genre); }
  if (filters?.format) { whereClauses.push(`mo.format = $${paramIdx++}`); params.push(filters.format); }
  if (filters?.since_date) { whereClauses.push(`mo.order_date >= $${paramIdx++}`); params.push(filters.since_date); }
  if (filters?.buyer_company_id) { whereClauses.push(`mo.buyer_company_id = $${paramIdx++}`); params.push(filters.buyer_company_id); }

  const sql = `
    SELECT mo.*, bc.name AS company_name
    FROM market_orders mo
    LEFT JOIN buyer_companies bc ON bc.id = mo.buyer_company_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY mo.order_date DESC NULLS LAST
    LIMIT 50
  `;

  return query<MarketOrder & { company_name: string | null }>(sql, params);
}
