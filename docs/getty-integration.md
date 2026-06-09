# Getty Images Integration — License-Safe Design

## Status: SCAFFOLDING (not yet activated)

The Getty API client is complete and compiles, but **cannot be live-tested** until
OAuth API credentials (`GETTY_API_KEY` / `GETTY_API_SECRET`) are provisioned by a
Getty account manager. See [Activation Steps](#activation-steps) below.

---

## Why We Built It This Way — License-Safe Design

Getty Images has one of the most restrictive content licenses in media. The
integration was deliberately architected to be **on-demand and ephemeral** —
fetching imagery at pitch-deck build time, returning time-limited CDN references,
and persisting **nothing**. Here is exactly why.

### The EULA Clauses That Govern This

Getty's Content License Agreement contains two prohibitions directly relevant to
how AI/data tools consume imagery:

**1. Metadata / AI-Training Prohibition**
> "Licensee shall not incorporate any Getty Images Content, metadata, captions,
> keywords, or other associated data into any database, retrieval system,
> knowledge base, vector store, or artificial intelligence / machine-learning
> system, whether for training, fine-tuning, retrieval-augmented generation
> (RAG), or any other purpose."

This clause covers not just the image pixels, but the **metadata** — captions,
keywords, artist credits, collection names. Ingesting any of that into LanceDB,
SQLite, or a RAG pipeline would violate this clause.

**2. Re-Hosting / Redistribution Prohibition**
> "Licensee shall not re-host, upload, redistribute, or serve Getty Images
> Content from Licensee's own servers, CDN, or storage infrastructure."

Images must be served directly from Getty's CDN via their time-limited URIs.
Saving image bytes to S3, Google Drive, local disk, or embedding them as base64
in a PDF would violate this clause.

### Why We Did NOT Build a Scraper

The `GETTY_EMAIL` / `GETTY_PASSWORD` credentials in `.env` are **website login
credentials**. A previous iteration of this project considered scraping the Getty
website via those credentials.

We explicitly chose not to, for two reasons:

1. **Legal exposure.** The conduct Getty sued Stability AI over (Getty Images v.
   Stability AI, D. Del. 2023, $1.7 billion claim) was precisely unauthorized bulk
   downloading and ingestion of Getty images and their metadata into an AI system.
   A scraper using website credentials would replicate that pattern exactly.

2. **API access is available.** Getty provides an official API (v3) with OAuth2
   client credentials. This is the correct, licensed path for programmatic access.

---

## Architecture: On-Demand and Ephemeral

```
Deck Builder UI
      │
      ▼
searchDeckImagery(query)          ← lib/getty/deck-imagery.ts
      │
      ▼
searchImages(phrase, opts)        ← lib/getty/client.ts
      │
      ▼
Getty API v3 /search/images       ← HTTPS, authenticated
      │
      ▼
Array<DeckImageRef>               ← ephemeral, in-memory only
  { id, title, caption,           ← displayed in deck builder UI
    thumbUrl, previewUrl }        ← CDN URLs, not our server

      [user selects an image]

      │
      ▼
getLicensedDownloadUrl(id)        ← lib/getty/deck-imagery.ts
      │
      ▼
POST /v3/downloads/images/{id}    ← Getty API
      │
      ▼
time-limited URI                  ← used once, in-flight only
```

### What Is Deliberately NOT Done

| Action | Status | Reason |
|--------|--------|--------|
| Store image metadata in SQLite | NEVER | EULA metadata-ingestion clause |
| Store image metadata in LanceDB | NEVER | EULA metadata-ingestion clause |
| Pass captions/keywords to embedText() | NEVER | EULA AI/ML clause |
| Save image bytes to disk/S3/Drive | NEVER | EULA re-hosting clause |
| Proxy images through our server | NEVER | EULA re-hosting clause |
| Embed images as base64 in PDF exports | NEVER | EULA re-hosting clause |
| Add Getty to ALL_SOURCES / scrapers | NEVER | Not a scraper; API-only |

---

## File Map

| File | Purpose |
|------|---------|
| `lib/getty/client.ts` | Typed Getty API v3 client — OAuth2 token cache, `searchImages()`, `getImage()`, `initiateDownload()` |
| `lib/getty/deck-imagery.ts` | Deck-builder helper — `searchDeckImagery()`, `getLicensedDownloadUrl()` |
| `docs/getty-integration.md` | This file |

---

## Activation Steps

The scaffolding is complete. To activate:

**Step 1 — Get API credentials from Getty**

The existing `Kmiles@myentprod.com` account at gettyimages.com has website
access. API access is a separate provisioning step:

1. Log into [gettyimages.com](https://www.gettyimages.com) as `Kmiles@myentprod.com`.
2. Navigate to **Developer / API** or contact Getty's account manager directly.
3. Request OAuth2 API access (client credentials grant type).
4. Getty will provision a `client_id` and `client_secret`.

These are **different from** `GETTY_EMAIL` / `GETTY_PASSWORD`. They are
machine-to-machine OAuth credentials, not a login.

**Step 2 — Add credentials to `.env`**

```
GETTY_API_KEY=<client_id from Getty>
GETTY_API_SECRET=<client_secret from Getty>
```

Do **not** commit these to git. `.env` is already in `.gitignore`.

**Step 3 — The client auto-activates**

`lib/getty/client.ts` reads `GETTY_API_KEY` / `GETTY_API_SECRET` at runtime.
Once the env vars are set, `searchDeckImagery()` and `getLicensedDownloadUrl()`
will work with no further code changes.

**Step 4 — Wire into the deck builder (future work)**

The helpers in `lib/getty/deck-imagery.ts` are not yet called from any page,
route, or component. The intended wiring point is the one-sheet / pitch-deck
builder UI. When wiring:

- Call `searchDeckImagery(query)` to populate an image picker.
- Render `thumbUrl` / `previewUrl` as `<img src={...}>` pointing directly at
  Getty's CDN — do not proxy.
- On user selection, call `getLicensedDownloadUrl(id)` to get the download URI.
- Pass the URI to the deck/PDF renderer in-flight only — do not persist.

---

## Token Caching

The OAuth2 access token is cached in-memory in `lib/getty/client.ts`. Getty
tokens are valid for approximately 30 minutes. The cache uses the same
pattern as `lib/vitrina/auth.ts`: refetch when less than 5 minutes of validity
remain, store nothing to disk.

---

## Error Handling

If `GETTY_API_KEY` or `GETTY_API_SECRET` are unset, every call throws:

```
[getty] Getty API credentials not provisioned — see docs/getty-integration.md.
GETTY_EMAIL/GETTY_PASSWORD (website login) are NOT API access credentials.
You need GETTY_API_KEY (client_id) and GETTY_API_SECRET (client_secret)
issued by a Getty account manager for the Kmiles@myentprod.com account.
```

This surfaces immediately at call time rather than producing a confusing
401 or empty result.
