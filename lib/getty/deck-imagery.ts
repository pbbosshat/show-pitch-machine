/**
 * Thin helper that wraps the Getty Images API client for the pitch-deck
 * build flow.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LEGAL / EULA ENFORCEMENT — READ BEFORE MODIFYING THIS FILE
 * ─────────────────────────────────────────────────────────────────────────────
 * Getty's EULA prohibits two things this module deliberately avoids:
 *
 *  1. METADATA / RAG INGESTION — "Licensee shall not incorporate any Getty
 *     Images Content, metadata, captions, or keywords into any database,
 *     retrieval system, or AI / machine-learning system."
 *     → searchDeckImagery() returns a plain array to the caller for ephemeral
 *       UI display only. It MUST NOT be passed to embedText(), stored in
 *       LanceDB, or written to the `trade_articles` / `pitches` SQLite tables.
 *
 *  2. RE-HOSTING / REDISTRIBUTION — Getty assets may not be uploaded to third-
 *     party storage, served from our own CDN, or included in PDF exports as
 *     embedded bytes.
 *     → getLicensedDownloadUrl() returns a time-limited URI issued by Getty's
 *       own CDN. The caller renders it directly in the deck builder (an <img>
 *       tag pointing at Getty's CDN). The downloaded bytes MUST NOT be saved
 *       to disk, S3, Google Drive, or any persistent store.
 *
 * This design is "on-demand and ephemeral": fetch at render time, display,
 * discard. Nothing leaves the browser session or the in-flight deck build.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SCAFFOLDING STATUS:
 * Compiles and is ready to call from the deck builder, but live execution
 * requires GETTY_API_KEY + GETTY_API_SECRET in .env (see docs/getty-integration.md).
 * It is NOT yet wired into any page, route, or component.
 */

import { searchImages, initiateDownload, type GettySearchResult } from './client';

// ── Public shape returned to deck-builder callers ────────────────────────────

/**
 * A lightweight image reference suitable for displaying thumbnails in the
 * pitch-deck builder UI.
 *
 * All fields are ephemeral — they originate from Getty's CDN and must not
 * be persisted to any database, vector store, or file.
 */
export interface DeckImageRef {
  /** Getty asset ID — use this to call getLicensedDownloadUrl() later. */
  id: string;

  /** Short title / filename from Getty (good for alt text). */
  title: string;

  /**
   * Editorial caption from Getty — display in the deck builder UI only.
   * DO NOT store in DB, LanceDB, or any search index (EULA § metadata ingestion).
   */
  caption: string;

  /**
   * URL of the watermarked thumbnail (~170px) — safe for browser-side preview.
   * Points directly at Getty's CDN; do not proxy or cache on our servers.
   */
  thumbUrl: string;

  /**
   * URL of the watermarked comp/preview (~600px) — used for deck layout preview.
   * Points directly at Getty's CDN; do not proxy or cache on our servers.
   */
  previewUrl: string;
}

// ── Helper: extract a display-size URL by name ────────────────────────────────

/**
 * Finds the best-matching display_size URI from a Getty search result.
 * Getty returns named sizes like "thumb", "comp", "preview", "high_res_comp".
 * Falls back gracefully if the preferred size is absent.
 */
function pickSizeUri(
  result: GettySearchResult,
  preferred: string,
  fallback: string
): string {
  const sizes = result.display_sizes ?? [];

  // Prefer the exact named size
  const exact = sizes.find(s => s.name === preferred);
  if (exact?.uri) return exact.uri;

  // Fall back to the named fallback
  const fb = sizes.find(s => s.name === fallback);
  if (fb?.uri) return fb.uri;

  // Last resort: return the first available URI
  return sizes[0]?.uri ?? '';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search Getty Images and return a slim array of image references for display
 * in the pitch-deck builder.
 *
 * @param query  - Natural-language search string (e.g. "broadcast news anchor",
 *                 "entertainment industry red carpet")
 * @param limit  - Maximum number of results to return (default: 12, max: 100).
 *                 Kept low by default — the deck builder only needs a small
 *                 image picker, not a full gallery.
 *
 * @returns      Array of DeckImageRef — ephemeral references only.
 *
 * !! DO NOT pass the returned array (or any field within it) to:
 *    - embedText() / lib/vectors.ts
 *    - LanceDB / lib/db.ts insert paths
 *    - The trade_articles, pitches, or any other SQLite table
 *    This would violate Getty's EULA metadata-ingestion prohibition.
 */
export async function searchDeckImagery(
  query: string,
  limit = 12
): Promise<DeckImageRef[]> {
  const response = await searchImages(query, { page_size: limit });

  // Map to the slim DeckImageRef shape — strip everything we don't need for
  // the deck builder UI so callers are never tempted to persist the full asset.
  return response.images.map((img): DeckImageRef => ({
    id:         img.id,
    title:      img.title   ?? '',
    caption:    img.caption ?? '',
    thumbUrl:   pickSizeUri(img, 'thumb',   'comp'),
    previewUrl: pickSizeUri(img, 'comp',    'preview'),
  }));
}

/**
 * Obtain a time-limited, one-use download URI for a specific Getty asset.
 *
 * Call this only when the user has actively selected an image for inclusion
 * in their pitch deck (not speculatively for all search results).
 *
 * @param id  - Getty asset ID (the `id` field from DeckImageRef)
 * @returns   A time-limited URI pointing at Getty's CDN for the full image.
 *
 * !! CRITICAL — the returned URI and the image bytes it serves MUST NOT be:
 *    - Saved to disk, S3, Google Drive, or any persistent storage
 *    - Embedded as base64 in a PDF or serialized deck file
 *    - Proxied through our own server
 *    - Stored in SQLite or LanceDB
 *    Re-hosting Getty images violates their EULA and is the conduct at the
 *    center of Getty Images v. Stability AI ($1.7B claim).
 *    The caller should render this URI directly as an <img src> or pass it
 *    to a PDF renderer that fetches from the CDN in-flight only.
 */
export async function getLicensedDownloadUrl(id: string): Promise<string> {
  const result = await initiateDownload(id);

  if (!result.uri) {
    throw new Error(
      `[getty/deck-imagery] initiateDownload returned no URI for asset ${id}`
    );
  }

  // Return the URI as-is — caller is responsible for ephemeral use only.
  return result.uri;
}
