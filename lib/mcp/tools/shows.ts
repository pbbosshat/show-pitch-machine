// MCP tool handlers for show/market data queries.
//
// Full-text search uses Postgres tsvector/tsquery on the pre-built search_vector
// GIN-indexed column (shows.search_vector). This replaces the SQLite FTS5 virtual
// table + rowid JOIN pattern that no longer exists in the Postgres schema.
//
// Phase 1B: rewrote FTS5 → tsvector, dropped SQLite fallback shim, made async.

import { query } from '../../db';
import type { Show, MarketOrder } from '../../../types';

interface ShowSearchFilters {
  genre?: string;
  network?: string;
  status?: string;
  format?: string;
  location_type?: string;
}

/**
 * Full-text search over the shows table using the pre-built search_vector column.
 *
 * search_vector is a GIN-indexed tsvector built from title + genre + network + talent.
 * plainto_tsquery parses the caller's free-form query into a tsquery — it's lenient
 * with punctuation and quote characters, so callers don't need to escape input.
 *
 * Caller: MCP tool 'search_shows' via lib/mcp/server.ts
 * Auth: none — trust boundary is the MCP server
 *
 * @param searchQuery  Free-form text (title, genre, network, talent name)
 * @param filters      Optional column-equality filters
 * @returns Matching shows ordered by ts_rank relevance, max 25
 */
export async function searchShows(
  searchQuery: string,
  filters?: ShowSearchFilters
): Promise<Show[]> {
  // Build the WHERE clause — start with the tsvector search condition.
  // The search_vector column lives directly on shows; no join to a virtual table.
  let sql = `
    SELECT s.*,
           ts_rank(s.search_vector, plainto_tsquery('english', ?)) AS rank
    FROM shows s
    WHERE s.search_vector @@ plainto_tsquery('english', ?)
  `;
  // plainto_tsquery is used twice: once for ORDER BY rank, once for WHERE.
  // We pass the same query value twice so the ? translator maps them to $1, $2.
  const params: unknown[] = [searchQuery, searchQuery];

  // Append exact-match column filters (genre, network, etc.)
  if (filters?.genre)         { sql += ' AND s.genre = ?';         params.push(filters.genre); }
  if (filters?.network)       { sql += ' AND s.network = ?';       params.push(filters.network); }
  if (filters?.status)        { sql += ' AND s.status = ?';        params.push(filters.status); }
  if (filters?.format)        { sql += ' AND s.format = ?';        params.push(filters.format); }
  if (filters?.location_type) { sql += ' AND s.location_type = ?'; params.push(filters.location_type); }

  // ts_rank: higher = more relevant. Cap at 25 to keep MCP responses scannable.
  sql += ' ORDER BY rank DESC LIMIT 25';

  // Surface DB errors as-is — the MCP server wraps tool calls in its own handler
  return query<Show>(sql, params);
}

interface MarketOrderFilters {
  network?: string;
  genre?: string;
  format?: string;
  since_date?: number;
  buyer_company_id?: string;
}

/**
 * Return recent market orders, optionally filtered by buyer/genre/format/date.
 *
 * Caller: MCP tool 'get_market_orders'
 * Auth: none
 * Returns: market_orders rows joined to buyer_companies.name for display
 */
export async function getMarketOrders(
  filters?: MarketOrderFilters
): Promise<Array<MarketOrder & { company_name: string | null }>> {
  let sql = `
    SELECT mo.*, bc.name AS company_name
    FROM market_orders mo
    LEFT JOIN buyer_companies bc ON bc.id = mo.buyer_company_id
    WHERE 1 = 1
  `;
  const params: unknown[] = [];

  // Dynamic filter clauses — only the provided keys are appended
  if (filters?.network)          { sql += ' AND mo.network = ?';          params.push(filters.network); }
  if (filters?.genre)            { sql += ' AND mo.genre = ?';            params.push(filters.genre); }
  if (filters?.format)           { sql += ' AND mo.format = ?';           params.push(filters.format); }
  if (filters?.since_date)       { sql += ' AND mo.order_date >= ?';      params.push(filters.since_date); }
  if (filters?.buyer_company_id) { sql += ' AND mo.buyer_company_id = ?'; params.push(filters.buyer_company_id); }

  // Most-recent orders first; NULLS LAST keeps orders without a date at the bottom
  sql += ' ORDER BY mo.order_date DESC NULLS LAST LIMIT 50';

  return query<MarketOrder & { company_name: string | null }>(sql, params);
}
