/**
 * Getty Images API v3 client — license-safe, on-demand only.
 *
 * LEGAL DESIGN NOTE (READ BEFORE MODIFYING):
 * ─────────────────────────────────────────────────────────────────────────────
 * Getty's EULA explicitly prohibits:
 *   1. Ingesting Getty images OR their metadata/captions/keywords into any
 *      database, RAG, vector store, or AI/ML system.
 *   2. Re-hosting or redistributing Getty images.
 *   3. Using Getty content for ML/AI model training or fine-tuning.
 *
 * This is the EXACT conduct behind Getty's $1.7B lawsuit against Stability AI
 * (Getty Images v. Stability AI, D. Del. 2023).
 *
 * Therefore, this client:
 *   - Fetches imagery ON DEMAND at pitch-deck build time only.
 *   - Returns ephemeral, time-limited asset references.
 *   - NEVER writes images, metadata, captions, or keyword tags to our DB
 *     or LanceDB vector store.
 *   - NEVER persists anything to disk beyond an in-memory token cache.
 *
 * See docs/getty-integration.md for the full license-safe design rationale.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SCAFFOLDING STATUS:
 * This client is complete and will compile, but CANNOT be live-tested until
 * Getty API credentials (OAuth client_id / client_secret) are provisioned by
 * a Getty account manager and added to .env as GETTY_API_KEY / GETTY_API_SECRET.
 * The GETTY_EMAIL / GETTY_PASSWORD in .env are website-login credentials and
 * do NOT grant API access.
 */

// ── Env credential reads ─────────────────────────────────────────────────────
// These must be OAuth API credentials issued by a Getty account manager.
// Website login credentials (GETTY_EMAIL / GETTY_PASSWORD) are NOT valid here.
const GETTY_API_KEY    = process.env.GETTY_API_KEY    ?? '';
const GETTY_API_SECRET = process.env.GETTY_API_SECRET ?? '';

// ── Getty API base URLs ───────────────────────────────────────────────────────
const GETTY_AUTH_URL = 'https://authentication.gettyimages.com/oauth2/token';
const GETTY_API_BASE = 'https://api.gettyimages.com/v3';

// ── Response type definitions ─────────────────────────────────────────────────

/**
 * A single display size variant returned by the Getty Images API.
 * Getty provides multiple renditions (thumb, comp, preview, etc.).
 */
export interface GettyDisplaySize {
  name: string;          // e.g. "thumb", "comp", "preview", "high_res_comp"
  is_watermarked: boolean;
  uri: string;           // time-limited CDN URL for this rendition
  width?: number;        // pixel width, if provided
  height?: number;       // pixel height, if provided
}

/**
 * Full metadata shape for a single Getty image asset.
 * Subset of the v3 /images/{id} response — only the fields relevant to
 * the pitch-deck builder. Do NOT persist this shape to DB or vector store.
 */
export interface GettyImageAsset {
  id: string;
  title: string;
  caption: string;           // editorial caption or description
  artist: string;            // photographer / illustrator credit
  collection_name: string;   // e.g. "Getty Images Entertainment", "iStock"
  date_created: string;      // ISO 8601 date string
  asset_family: 'editorial' | 'creative'; // license class
  max_dimensions: {
    height: number;
    width: number;
  };
  display_sizes: GettyDisplaySize[];
}

/**
 * A single result item as returned by the /v3/search/images endpoint.
 * The search endpoint returns a lighter payload than the single-image endpoint.
 */
export interface GettySearchResult {
  id: string;
  title: string;
  caption: string;
  asset_family: 'editorial' | 'creative';
  display_sizes: GettyDisplaySize[];
}

/**
 * Full response envelope for GET /v3/search/images.
 */
export interface GettySearchResponse {
  result_count: number;
  images: GettySearchResult[];
}

/**
 * Response from POST /v3/downloads/images/{id}.
 * The `uri` is a time-limited, one-use download link — do NOT persist it.
 */
export interface GettyDownloadResponse {
  uri: string;  // ephemeral, time-limited download URL
}

// ── OAuth token cache ─────────────────────────────────────────────────────────
// Pattern mirrors lib/vitrina/auth.ts: cache the access token in memory for
// its lifetime; refetch when it's within 5 minutes of expiry.
// Nothing is written to disk — intentional per the license-safe design.

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix ms timestamp when this token expires
}

let _tokenCache: TokenCache | null = null;

/**
 * Returns a valid Getty API access token, fetching a fresh one if the cache
 * is empty or the token is about to expire (within 5 minutes).
 *
 * Throws early with a clear message if GETTY_API_KEY / GETTY_API_SECRET
 * are not provisioned — this prevents silent failures from returning
 * partial or unauthenticated responses.
 */
async function getAccessToken(): Promise<string> {
  // Guard: credentials must be provisioned before this client can do anything.
  if (!GETTY_API_KEY || !GETTY_API_SECRET) {
    throw new Error(
      '[getty] Getty API credentials not provisioned — see docs/getty-integration.md. ' +
      'GETTY_EMAIL/GETTY_PASSWORD (website login) are NOT API access credentials. ' +
      'You need GETTY_API_KEY (client_id) and GETTY_API_SECRET (client_secret) ' +
      'issued by a Getty account manager for the Kmiles@myentprod.com account.'
    );
  }

  // Return cached token if still valid with >5 min headroom
  if (_tokenCache && _tokenCache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return _tokenCache.accessToken;
  }

  // Fetch a fresh token via OAuth2 client_credentials grant
  return fetchFreshToken();
}

/**
 * Hits the Getty OAuth2 token endpoint with client_credentials grant type.
 * Updates _tokenCache on success.
 * Getty access tokens are valid for approximately 30 minutes.
 */
async function fetchFreshToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     GETTY_API_KEY,
    client_secret: GETTY_API_SECRET,
  });

  const res = await fetch(GETTY_AUTH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(
      `[getty] OAuth token fetch failed: HTTP ${res.status} — ${text}`
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number; // seconds
    token_type: string;
  };

  if (!data.access_token) {
    throw new Error('[getty] OAuth response did not contain access_token');
  }

  // Cache the token; expires_in is in seconds, store as ms timestamp
  _tokenCache = {
    accessToken: data.access_token,
    expiresAt:   Date.now() + data.expires_in * 1000,
  };

  return _tokenCache.accessToken;
}

// ── Shared request helper ─────────────────────────────────────────────────────

/**
 * Builds headers required by every Getty API v3 request:
 *   - Authorization: Bearer <token>   (OAuth2 access token)
 *   - Api-Key: <client_id>            (required alongside the token)
 *   - Accept: application/json
 */
async function gettyHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Api-Key':       GETTY_API_KEY,
    'Accept':        'application/json',
  };
}

/**
 * Generic GET helper against the Getty API base URL.
 * Handles error-response surfacing so callers don't have to.
 */
async function gettyGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${GETTY_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method:  'GET',
    headers: await gettyHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(
      `[getty] GET ${path} failed: HTTP ${res.status} — ${text}`
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Generic POST helper against the Getty API base URL.
 */
async function gettyPost<T>(path: string, body?: object): Promise<T> {
  const url = `${GETTY_API_BASE}${path}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      ...(await gettyHeaders()),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(
      `[getty] POST ${path} failed: HTTP ${res.status} — ${text}`
    );
  }

  return res.json() as Promise<T>;
}

// ── Public API methods ────────────────────────────────────────────────────────

/**
 * Search Getty Images for imagery matching the given phrase.
 *
 * @param phrase    - Natural-language search query (e.g. "TV news anchor studio")
 * @param opts.page       - 1-based page number (default: 1)
 * @param opts.page_size  - Results per page (default: 12, max: 100)
 * @param opts.sort_order - "best_match" | "most_popular" | "newest" | "oldest"
 *                          (default: "best_match")
 *
 * Results include both editorial and creative assets by default (omitting the
 * asset_family filter returns both families from the API).
 *
 * IMPORTANT: Do NOT persist the returned metadata to DB or LanceDB.
 * Return it to the caller for ephemeral display only — see file header.
 */
export async function searchImages(
  phrase: string,
  opts: {
    page?:       number;
    page_size?:  number;
    sort_order?: 'best_match' | 'most_popular' | 'newest' | 'oldest';
  } = {}
): Promise<GettySearchResponse> {
  const params: Record<string, string> = {
    phrase,
    page:       String(opts.page      ?? 1),
    page_size:  String(opts.page_size ?? 12),
    sort_order: opts.sort_order        ?? 'best_match',
  };

  return gettyGet<GettySearchResponse>('/search/images', params);
}

/**
 * Fetch full metadata for a single Getty image by its asset ID.
 *
 * Returns more detail than the search endpoint (full caption, artist credit,
 * collection name, max dimensions, all display size variants).
 *
 * IMPORTANT: Do NOT persist the returned metadata to DB or LanceDB.
 */
export async function getImage(id: string): Promise<GettyImageAsset> {
  // The v3 /images endpoint accepts a comma-separated list; we request one.
  const response = await gettyGet<{ images: GettyImageAsset[] }>(
    `/images/${encodeURIComponent(id)}`
  );

  const asset = response.images?.[0];
  if (!asset) {
    throw new Error(`[getty] No image found for id: ${id}`);
  }

  return asset;
}

/**
 * Initiate a licensed download for a Getty image asset.
 *
 * Returns a time-limited URI that the caller can use to download the image
 * file once. The URI expires quickly — typically within minutes.
 *
 * @param id    - Getty asset ID
 * @param size  - Requested download size (optional; Getty uses "original" if omitted)
 *
 * CRITICAL — DO NOT PERSIST THE RETURNED URI or the image file to our DB,
 * filesystem, LanceDB, or any storage. This method exists to obtain a
 * single-use ephemeral download link for deck-builder use. Re-hosting or
 * storing the downloaded file violates Getty's EULA.
 */
export async function initiateDownload(
  id: string,
  size?: string
): Promise<GettyDownloadResponse> {
  const body = size ? { size } : undefined;

  return gettyPost<GettyDownloadResponse>(
    `/downloads/images/${encodeURIComponent(id)}`,
    body
  );
}
