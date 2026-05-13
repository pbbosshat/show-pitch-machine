# Add Sizzle Reel — `/sizzles` page

## What was built

A self-contained "Add Video" flow on the internal Sizzle Asset Catalog
([/sizzles](../app/(internal)/sizzles/page.tsx)) that lets the team upload
a new sizzle reel to Google Drive and have it land in the database +
re-render on the page without a refresh.

Three things ship in this feature:

1. **`+ Add Video` button** in the search bar row of `SizzlesClient.tsx`.
2. **`AddSizzleModal`** — a 3-step modal (project → video & thumbnail →
   metadata) that handles the entire creation flow client-side.
3. **`POST /api/sizzles/create-with-video`** — one-shot endpoint that
   inserts the `sizzle_reels` row, uploads the video to the `Sizzle Reels`
   Drive folder, persists a custom thumbnail (if supplied), and returns
   the full `SizzleCardData` shape so the page can prepend it instantly.

## Why it exists

The catalog used to be read-only — sizzles were imported from the legacy
Google Sheet via the ingest scripts, and the only way to add a new one
was to either edit the sheet (deprecated) or work directly against the
database. Now that all video storage moved to Google Drive
(see [`vimeo-drive-backfill.md`](./vimeo-drive-backfill.md) and the
existing [`/api/videos/upload`](../app/api/videos/upload/route.ts)
endpoint), the team needs a buyer-grade UI for adding new reels with all
the metadata in one shot.

## Key files

| File | Purpose |
| --- | --- |
| [`app/(internal)/sizzles/SizzlesClient.tsx`](../app/(internal)/sizzles/SizzlesClient.tsx) | Page client — renders the new button, manages modal state, prepends newly-created sizzles into local list. |
| [`components/shows/AddSizzleModal.tsx`](../components/shows/AddSizzleModal.tsx) | New 3-step modal. Project search → video + thumbnail scrubber → metadata fields → submit. |
| [`app/api/sizzles/create-with-video/route.ts`](../app/api/sizzles/create-with-video/route.ts) | New endpoint. Multipart upload → insert row → push video to Drive → persist thumbnail → return SizzleCardData. |
| [`lib/google-drive-video.ts`](../lib/google-drive-video.ts) | Existing helper — reused for Drive upload + thumbnail fetch. |

## Data flow

```
 user clicks "+ Add Video"
        │
        ▼
 AddSizzleModal opens at step 1
        │
 step 1 │ GET /api/projects?q={search}&limit=20   (typeahead, debounced 220ms)
        │
 step 2 │ user picks a video file → loaded into <video> via Object URL
        │   → user scrubs and clicks "Capture this frame"  → canvas → image/jpeg Blob
        │   OR
        │   user clicks "Upload image" → File object
        │
 step 3 │ optional fields: password, sheet_source, raw_value, notes
        │
        ▼
 POST /api/sizzles/create-with-video        (multipart, XHR for progress)
        │
        ├─ validate ip_catalog_id, video type/extension
        ├─ INSERT sizzle_reels (id=randomUUID, platform='drive', title=ip.title, …)
        ├─ uploadVideoToDrive(buffer)         → { fileId, shareableUrl }
        ├─ thumbnail supplied?
        │     yes → write public/sizzle-thumbs/<sizzleId>.{jpg|png|webp}
        │     no  → getDriveThumbnail(fileId) (may return null until Drive processes)
        ├─ UPDATE sizzle_reels SET vimeo_url, drive_file_id, thumbnail_url
        └─ return full SizzleCardData
        │
        ▼
 SizzlesClient prepends new card → user sees it at top of "With Video Link"
```

## Request / response shape

`POST /api/sizzles/create-with-video` — `multipart/form-data`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `file` | `File` (video/*) | ✅ | mp4, mov, avi, mkv |
| `ip_catalog_id` | string | ✅ | Must reference `ip_catalog.id` |
| `thumbnail` | `File` (image/*) | optional | jpg / png / webp |
| `vimeo_password` | string | optional | |
| `notes` | string | optional | |
| `sheet_source` | string | optional | One of `priorities`, `full-dev`, `bc-mye`, `backburner`, `brainstorm` |
| `raw_value` | string | optional | Original sheet-cell text if migrating |

**Response 200** — same shape as a row from `GET /api/sizzles`
(`SizzleCardData`), plus an echoed `drive_file_id`:

```jsonc
{
  "id": "uuid",
  "ip_catalog_id": "uuid",
  "project_title": "Project Title",
  "sheet_source": "priorities",
  "vimeo_url": "https://drive.google.com/file/d/.../view",
  "vimeo_password": null,
  "platform": "drive",
  "raw_value": null,
  "notes": null,
  "thumbnail_url": "/sizzle-thumbs/<id>.jpg",
  "last_email_date": null,
  "email_thread_count": 0,
  "drive_file_id": "1AbC..."
}
```

**Error responses**

* `400` — missing/invalid `file`, missing `ip_catalog_id`, invalid
  thumbnail MIME, unsupported video extension.
* `404` — `ip_catalog_id` does not match any row.
* `500` — Drive upload or DB write failure. Body is `{ "error": "<message>" }`.

## Thumbnail handling

Two paths, both client-side until upload:

1. **Frame capture** — the user scrubs the local `<video>` element to a
   moment they like, clicks **📸 Capture this frame**, and the modal
   draws the current frame onto a `<canvas>` at the video's native
   resolution before calling `canvas.toBlob('image/jpeg', 0.85)`. The
   Blob is appended to the FormData as `thumbnail`.

2. **Image upload** — the user clicks **↑ Upload image** and picks a
   `.jpg`, `.png`, or `.webp` file. The `File` object is appended
   directly.

Server-side, both are treated the same way: the file is written to
`public/sizzle-thumbs/<sizzleId>.<ext>` where `<ext>` is derived from
the MIME map (`.jpg`, `.png`, `.webp`) — never from the client-supplied
filename. `sizzle_reels.thumbnail_url` is set to the public path.

If no thumbnail is supplied, the endpoint calls `getDriveThumbnail()`,
which typically returns `null` for 1–5 min while Drive processes the
video. The `SizzleCard` placeholder renders cleanly during that window;
the existing `/api/videos/thumbnail/[fileId]` poller endpoint can be
used to fill it in later.

## Gotchas / decisions

* **One-shot endpoint (vs. two-step).** We deliberately did not reuse
  `POST /api/videos/upload`, because that endpoint requires an existing
  `sizzle_id` and the new flow needs to create the row atomically with
  the upload. Reusing it would have meant a separate `POST /api/sizzles`
  to seed an empty row, with the orphan-row risk if the second call
  failed.
* **`raw_value` defaults to `null`, not `""`.** The unique index on
  `(ip_catalog_id, raw_value)` would otherwise treat all "no raw value"
  reels as duplicates of each other and reject the second one.
* **Filename in `public/sizzle-thumbs/` is stable per sizzle.** Using
  `<sizzleId>.<ext>` (not `<sizzleId>-<timestamp>.<ext>`) means re-uploads
  overwrite, which is what the team expects — no orphan files in the
  static folder.
* **XHR, not fetch.** Real upload progress + clean abort. Fetch's upload
  progress API still isn't broadly supported as of Jan 2026.
* **Optimistic prepend in the client.** The page is `force-dynamic`, but
  we still update local state on success so the user doesn't need a
  refresh to see the new card. A future revalidation pass (e.g. on
  search input clear) will reconcile if the DB ever diverges.
* **Drag-drop / drop-zone styling.** Mirrors the existing
  `VideoUploader` component so the team's muscle memory transfers.
