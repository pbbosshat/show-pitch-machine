// MCP tool handlers for show/market data queries.
// Uses FTS5 for full-text search on shows and direct SQL for market order lookups.
// FTS5 is faster and more relevant than LIKE queries for multi-word title searches.

import { query, getDb } from '../../db';
import type { Show, MarketOrder } from '../../../types';

interface ShowSearchFilters {
  genre?: string;
  network?: string;
  status?: string;
  format?: string;
  location_type?: string;
}

// FTS5-powered show search — supports partial title, genre, network, talent queries
export function searchShows(
  searchQuery: string,
  filters?: ShowSearchFilters
): Show[] {
  const db = getDb();

  // FTS5 uses a JOIN pattern: match rowids from virtual table, fetch full rows
  // This avoids duplicating columns between the fts and main table
  let sql = `
    SELECT s.*
    FROM shows s
    JOIN shows_fts sf ON sf.rowid = s.rowid
    WHERE shows_fts MATCH ?
  `;
  const params: unknown[] = [searchQuery];

  // Append column filters as exact-match WHERE clauses on the main table
  if (filters?.genre) { sql += ' AND s.genre = ?'; params.push(filters.genre); }
  if (filters?.network) { sql += ' AND s.network = ?'; params.push(filters.network); }
  if (filters?.status) { sql += ' AND s.status = ?'; params.push(filters.status); }
  if (filters?.format) { sql += ' AND s.format = ?'; params.push(filters.format); }
  if (filters?.location_type) { sql += ' AND s.location_type = ?'; params.push(filters.location_type); }

  // FTS5 ranks by BM25 relevance by default; limit to 25 to keep responses scannable
  sql += ' ORDER BY rank LIMIT 25';

  try {
    return query<Show>(sql, params);
  } catch {
    // FTS5 MATCH throws on invalid syntax (e.g. bare quotes) — fall back to LIKE
    const fallbackSql = `
      SELECT s.*
      FROM shows s
      WHERE s.title LIKE ?
         OR s.genre LIKE ?
         OR s.network LIKE ?
      LIMIT 25
    `;
    const likeParam = `%${searchQuery}%`;
    return query<Show>(fallbackSql, [likeParam, likeParam, likeParam]);
  }
}

interface MarketOrderFilters {
  network?: string;
  genre?: string;
  format?: string;
  since_date?: number;
  buyer_company_id?: string;
}

// Market order query — what's been ordered recently by whom, filtered by buyer/genre/format
export function getMarketOrders(filters?: MarketOrderFilters): Array<MarketOrder & { company_name: string | null }> {
  let sql = `
    SELECT mo.*, bc.name AS company_name
    FROM market_orders mo
    LEFT JOIN buyer_companies bc ON bc.id = mo.buyer_company_id
    WHERE 1 = 1
  `;
  const params: unknown[] = [];

  if (filters?.network) { sql += ' AND mo.network = ?'; params.push(filters.network); }
  if (filters?.genre) { sql += ' AND mo.genre = ?'; params.push(filters.genre); }
  if (filters?.format) { sql += ' AND mo.format = ?'; params.push(filters.format); }
  if (filters?.since_date) { sql += ' AND mo.order_date >= ?'; params.push(filters.since_date); }
  if (filters?.buyer_company_id) { sql += ' AND mo.buyer_company_id = ?'; params.push(filters.buyer_company_id); }

  sql += ' ORDER BY mo.order_date DESC NULLS LAST LIMIT 50';

  return query<MarketOrder & { company_name: string | null }>(sql, params);
}
