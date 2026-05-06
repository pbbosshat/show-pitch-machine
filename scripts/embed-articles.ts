// scripts/embed-articles.ts
//
// Embedding pipeline for trade articles — reads all unembedded trade_articles,
// chunks each body, embeds via fastembed (BGE-small-en-v1.5, 384-dim),
// inserts chunks into LanceDB, then marks embedded = 1.
//
// Run via:
//   npx tsx --env-file=.env scripts/embed-articles.ts
//
// Prerequisites:
//   LanceDB and fastembed already installed — no new packages needed.
//   First run downloads ~130 MB model weights to FASTEMBED_CACHE (./data/fastembed-cache).

// Suppress node:sqlite experimental warning before any imports
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { pathToFileURL } from 'url';
import { embed, chunkText } from '../lib/embed';
import { insertArticleChunks } from '../lib/vectors';
import { initDb, run, query } from '../lib/db';
import type { VectorChunk } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

// Articles to embed per batch — small enough to get incremental embedded=1 updates
// without hammering fastembed with too many texts at once
const BATCH_SIZE = 20;

// Delay between batches in milliseconds — gives GC a moment and avoids memory spikes
const BATCH_DELAY_MS = 100;

// ── Types ─────────────────────────────────────────────────────────────────────

// Minimal shape of trade_articles rows we need for embedding
interface UnembeddedArticle {
  id: string;
  source: string | null;
  headline: string | null;
  body: string | null;
  scraped_at: number | null;
  format_type: string | null;
  item_type: string | null;
  // These columns may be set by process-articles.ts but are not always present;
  // they're joined in query below and will be null if not yet extracted.
  buyer_company: string | null;
  buyer_name: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Build VectorChunk records for one article's chunks.
// Each chunk gets a composite id of articleId:chunkIndex for deterministic LanceDB dedup.
function buildChunks(article: UnembeddedArticle, chunkTexts: string[], embeddings: number[][]): VectorChunk[] {
  return chunkTexts.map((text, i) => ({
    id: `${article.id}:${i}`,
    text,
    embedding: embeddings[i],
    source_type: article.source ?? '',
    source_id: article.id,
    source_name: article.headline ?? '',
    date: article.scraped_at
      ? new Date(article.scraped_at).toISOString().slice(0, 10)
      : '',
    buyer_company: article.buyer_company ?? '',
    buyer_contact: article.buyer_name ?? '',
    show_title: '',
    genre: article.format_type ?? '',
    item_type: article.item_type ?? '',
  }));
}

// Mark a batch of articles as embedded=1 in trade_articles.
// Called after each batch so partial runs don't re-embed articles on restart.
function markEmbedded(ids: string[]): void {
  if (ids.length === 0) return;
  // Use individual updates — node:sqlite binding doesn't support IN (?) with arrays
  for (const id of ids) {
    run('UPDATE trade_articles SET embedded = 1 WHERE id = ?', [id]);
  }
}

// ── Main exported function ────────────────────────────────────────────────────

/**
 * Embed all unembedded trade articles into LanceDB.
 *
 * - Reads all rows WHERE embedded = 0
 * - Chunks each body via chunkText()
 * - Batch-embeds via fastembed BGE-small-en-v1.5
 * - Inserts VectorChunk rows into LanceDB article_chunks table
 * - Marks embedded = 1 after each batch so restarts are idempotent
 * - Skips (but still marks) articles with null/empty body
 *
 * Returns { embedded: number, chunks: number } totals for this run.
 */
export async function embedArticles(): Promise<{ embedded: number; chunks: number }> {
  initDb();

  // Fetch unembedded articles, left-joining entity_article_links to get buyer context
  // that process-articles.ts may have already attached. The columns are aliased so
  // they're nullable (process-articles may not have run yet on brand-new articles).
  const articles = query<UnembeddedArticle>(`
    SELECT
      ta.id,
      ta.source,
      ta.headline,
      ta.body,
      ta.scraped_at,
      ta.format_type,
      ta.item_type,
      NULL AS buyer_company,
      NULL AS buyer_name
    FROM trade_articles ta
    WHERE ta.embedded = 0
    ORDER BY ta.scraped_at DESC
  `);

  const total = articles.length;

  if (total === 0) {
    console.log('\n🔢  Embedding pipeline');
    console.log('  ✓  No unembedded articles — nothing to do');
    return { embedded: 0, chunks: 0 };
  }

  console.log('\n🔢  Embedding pipeline');
  console.log(`  📰  ${total} article${total === 1 ? '' : 's'} to embed`);

  let totalEmbedded = 0;
  let totalChunks = 0;
  const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Progress indicator — shows batch progress in place
    process.stdout.write(`  batch ${batchNum}/${totalBatches}...\r`);

    const toEmbed: string[] = [];
    const chunkMapByArticle: Array<{ article: UnembeddedArticle; chunks: string[] }> = [];

    // Pre-process all articles in the batch to collect their chunks.
    // Articles with no body are tracked separately — they get embedded=1 set
    // but no LanceDB insert, so we don't retry them forever.
    const emptyIds: string[] = [];

    for (const article of batch) {
      if (!article.body || article.body.trim() === '') {
        // Empty body — mark as done but skip LanceDB insert
        emptyIds.push(article.id);
        continue;
      }

      const chunks = chunkText(article.body);
      if (chunks.length === 0) {
        emptyIds.push(article.id);
        continue;
      }

      chunkMapByArticle.push({ article, chunks });
      toEmbed.push(...chunks);
    }

    // Immediately mark empty-body articles so they don't get retried
    markEmbedded(emptyIds);
    totalEmbedded += emptyIds.length;

    if (toEmbed.length > 0) {
      // Embed all chunks in this batch in one fastembed call — the library
      // handles its own internal batching via passGenerator
      const embeddings = await embed(toEmbed);

      // Distribute embeddings back to their articles
      let embeddingOffset = 0;
      const allChunks: VectorChunk[] = [];
      const embeddedIds: string[] = [];

      for (const { article, chunks } of chunkMapByArticle) {
        const articleEmbeddings = embeddings.slice(embeddingOffset, embeddingOffset + chunks.length);
        embeddingOffset += chunks.length;

        const vectorChunks = buildChunks(article, chunks, articleEmbeddings);
        allChunks.push(...vectorChunks);
        embeddedIds.push(article.id);
      }

      // Insert the full batch of chunks into LanceDB
      await insertArticleChunks(allChunks);

      // Mark these articles as embedded AFTER successful LanceDB insert
      markEmbedded(embeddedIds);
      totalEmbedded += embeddedIds.length;
      totalChunks += allChunks.length;
    }

    // Delay between batches (skip after final batch)
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Clear the progress line before printing the summary
  process.stdout.write('  '.padEnd(40) + '\r');

  console.log(`  ✅  ${totalEmbedded} embedded, ${totalChunks} chunks inserted into LanceDB`);

  return { embedded: totalEmbedded, chunks: totalChunks };
}

// ── Standalone entry point ────────────────────────────────────────────────────

// Runs when executed directly: npx tsx --env-file=.env scripts/embed-articles.ts
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  embedArticles()
    .then(({ embedded, chunks }) => {
      console.log(`\nEmbedded ${embedded} articles, ${chunks} chunks`);
      process.exit(0);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
