// MCP tool handler for trade article vector search.
// Returns LanceDB results with source citations so Claude can reference its sources.
// Intentionally thin — all the search logic lives in lib/vectors.ts.

import { searchArticles } from '../../vectors';
import type { VectorChunk } from '../../../types';

interface ArticleSearchFilters {
  genre?: string;
  network?: string;
  item_type?: string;
  buyer_company?: string;
}

// Vector similarity search over ingested trade articles + market intel chunks
export async function searchArticlesTool(
  queryText: string,
  limit = 10,
  filters?: ArticleSearchFilters
): Promise<Array<VectorChunk & { citation: string }>> {
  // Strip undefined keys so LanceDB doesn't get empty string WHERE clauses
  const cleanFilters: Record<string, string> = {};
  if (filters?.genre) cleanFilters.genre = filters.genre;
  if (filters?.item_type) cleanFilters.item_type = filters.item_type;
  if (filters?.buyer_company) cleanFilters.buyer_company = filters.buyer_company;

  const chunks = await searchArticles(queryText, limit, cleanFilters);

  // Attach a human-readable citation string so Claude can inline-cite sources
  return chunks.map((c) => ({
    ...c,
    citation: [
      c.source_name,
      c.date ? `(${c.date})` : null,
      c.source_id ? `— ${c.source_type}:${c.source_id}` : null,
    ].filter(Boolean).join(' '),
  }));
}
