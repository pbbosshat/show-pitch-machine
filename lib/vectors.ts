// LanceDB vector store for trade article chunks and market intelligence.
// LanceDB is embedded (no separate server) and stores Arrow columnar files on disk.
// The table is created on first insert if it doesn't exist yet.

import { connect, type Connection, type Table } from '@lancedb/lancedb';
import { embedOne } from './embed';
import type { VectorChunk } from '../types';

const VECTORS_PATH = process.env.VECTORS_PATH || './data/vectors';
const TABLE_NAME = 'article_chunks';

let _db: Connection | null = null;
let _table: Table | null = null;

// Singleton connection — LanceDB connections are cheap but table opens involve IO
async function getVectorDb(): Promise<Connection> {
  if (_db) return _db;
  _db = await connect(VECTORS_PATH);
  return _db;
}

// Get or create the article_chunks table.
// Schema is inferred from the first batch of records on creation.
async function getTable(): Promise<Table> {
  if (_table) return _table;

  const db = await getVectorDb();
  const tableNames = await db.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    _table = await db.openTable(TABLE_NAME);
  } else {
    // Create with a seed record so LanceDB can infer the schema immediately.
    // The seed record is a dummy that will never be matched by real queries.
    const seed: VectorChunk = {
      id: '__schema_seed__',
      text: '',
      embedding: new Array(384).fill(0),
      source_type: '',
      source_id: '',
      source_name: '',
      date: '',
      buyer_company: '',
      buyer_contact: '',
      show_title: '',
      genre: '',
      item_type: '',
    };
    _table = await db.createTable(TABLE_NAME, [seed]);
  }

  return _table;
}

// Batch insert article chunks — called by the ingestion pipeline after chunking + embedding
export async function insertArticleChunks(chunks: VectorChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const table = await getTable();
  await table.add(chunks);
}

// Vector similarity search with optional metadata filters.
// Filters use LanceDB SQL WHERE syntax on string columns (e.g. { genre: 'True Crime' }).
export async function searchArticles(
  query: string,
  limit = 10,
  filters?: Record<string, string>
): Promise<VectorChunk[]> {
  const table = await getTable();
  const queryVec = await embedOne(query);

  // Build a LanceDB query with ANN vector search; apply WHERE clause if filters provided
  let searchQuery = table.vectorSearch(queryVec).limit(limit).select([
    'id', 'text', 'source_type', 'source_id', 'source_name',
    'date', 'buyer_company', 'buyer_contact', 'show_title', 'genre', 'item_type',
  ]);

  if (filters && Object.keys(filters).length > 0) {
    // Compose a SQL WHERE string from the filter map
    const whereClauses = Object.entries(filters)
      .map(([k, v]) => `${k} = '${v.replace(/'/g, "''")}'`)
      .join(' AND ');
    searchQuery = searchQuery.where(whereClauses);
  }

  const rows = await searchQuery.toArray();
  // LanceDB returns Arrow RecordBatch rows; map to plain VectorChunk objects
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    text: r.text as string,
    embedding: [], // don't return raw embeddings to callers — wastes bandwidth
    source_type: r.source_type as string,
    source_id: r.source_id as string,
    source_name: r.source_name as string,
    date: r.date as string,
    buyer_company: r.buyer_company as string,
    buyer_contact: r.buyer_contact as string,
    show_title: r.show_title as string,
    genre: r.genre as string,
    item_type: r.item_type as string,
  }));
}
