// fastembed wrapper — keeps the heavy EmbeddingPipeline model loaded in memory across calls.
// BGE-small-en-v1.5 is 384-dim and fast enough for real-time article ingestion on CPU.
// The singleton prevents re-downloading/re-loading the model on every embed call.

import { FlagEmbedding, EmbeddingModel } from 'fastembed';

let _pipeline: FlagEmbedding | null = null;

// Lazy-load the model on first use — model download is ~130 MB and only happens once
async function getPipeline(): Promise<FlagEmbedding> {
  if (_pipeline) return _pipeline;

  _pipeline = await FlagEmbedding.init({
    model: EmbeddingModel.BGESmallENV15,
    // Cache model weights locally so restarts don't re-download
    cacheDir: process.env.FASTEMBED_CACHE || './data/fastembed-cache',
  });

  return _pipeline;
}

// Batch embedding — more efficient than one-at-a-time for article ingestion runs
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const pipeline = await getPipeline();
  const results: number[][] = [];
  // passGenerator yields Float32Array chunks; collect all into a flat array-of-arrays
  for await (const batch of pipeline.embed(texts)) {
    for (const vec of batch) {
      results.push(Array.from(vec));
    }
  }
  return results;
}

// Single-text shorthand used by search and real-time classification paths
export async function embedOne(text: string): Promise<number[]> {
  const vecs = await embed([text]);
  if (vecs.length === 0) throw new Error('fastembed returned no vector for input text');
  return vecs[0];
}

// Split long article text into overlapping chunks so no single chunk loses context.
// Token estimate is rough (4 chars ≈ 1 token) — acceptable for retrieval chunking.
export function chunkText(text: string, maxTokens = 500, overlap = 75): string[] {
  const words = text.split(/\s+/);
  // Convert token budget to word budget at roughly 1.3 words per token
  const maxWords = Math.floor(maxTokens * 1.3);
  const overlapWords = Math.floor(overlap * 1.3);
  const chunks: string[] = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const chunk = words.slice(start, end).join(' ').trim();
    if (chunk.length > 0) chunks.push(chunk);
    // Advance by (maxWords - overlapWords) so consecutive chunks share context
    start += maxWords - overlapWords;
    if (start >= words.length) break;
  }

  return chunks;
}
