# Vimeo Library → Google Drive Backfill

## What this is

Two related pieces:

1. **Production sync of `vimeo_library` + `show_videos`** so the live `/vimeo-library` page on `myentertainment.tv` shows the videos that were scraped locally with [scripts/scrape-vimeo-library.js](../scripts/scrape-vimeo-library.js). Before this change, the production DB had the empty schema (migration 026 ran on Railway) but no rows — the local scrape never made it to production.
2. **A Drive backfill script** that mirrors every active Vimeo video into the `myentprod.com` "Sizzle Reels" Drive folder. Vimeo stays the source of record; Drive becomes a redundant store so that long-term we can move buyer pages off Vimeo embeds without re-uploading 425 videos by hand.

## Why

- The user expected the Vimeo Library page to be populated on live and to be backed by Drive. Neither was true: production had zero `vimeo_library` rows, and the Drive plumbing existed (migration 029 added `sizzle_reels.drive_file_id`, [lib/google-drive-video.ts](../lib/google-drive-video.ts) exists) but no rows had ever been written.
- 940 rows total in `vimeo_library`; 515 are privacy `disable` (Vimeo-side deleted), 425 are still downloadable. The 425 active videos account for ~41 hours of content (~20–40 GB of source files).

## Files touched

| File | Purpose |
|---|---|
| [migrations/033_vimeo_drive_backfill.sql](../migrations/033_vimeo_drive_backfill.sql) | Adds `drive_file_id`, `drive_url`, `backfill_status`, `backfilled_at`, `backfill_error`, `size_bytes` to `vimeo_library`. `backfill_status` doubles as a per-row lock so the backfill is resumable. |
| [app/api/ingest/vimeo/route.ts](../app/api/ingest/vimeo/route.ts) | `POST /api/ingest/vimeo` — accepts `{ videos, show_videos }` and upserts both tables. Auth via `INGEST_API_KEY` bearer header. Idempotent via `ON CONFLICT(clip_id)` and `ON CONFLICT(ip_catalog_id, vimeo_library_id)`. |
| [scripts/sync-to-railway.ts](../scripts/sync-to-railway.ts) | Extended with a Vimeo block. Pulls every `vimeo_library` row plus the `show_videos` join (with clip_id, not the local UUID) and POSTs to `/api/ingest/vimeo` on the Next.js Railway service. |
| [scripts/backfill-vimeo-to-drive.js](../scripts/backfill-vimeo-to-drive.js) | Standalone backfill — see "Running the backfill" below. |

## Data flow

```
Vimeo (scrape locally) → data/db.sqlite           ┌──▶ Vimeo Library page reads vimeo_library
                                                   │
                                                   ├──▶ sync-to-railway.ts ──▶ POST /api/ingest/vimeo
                                                   │                              (Railway DB)
                                                   │
                                                   └──▶ backfill-vimeo-to-drive.js ──▶ Drive
                                                                                       (drive_file_id
                                                                                        written back
                                                                                        to vimeo_library)
```

## Running the sync to production

From a machine that has the local DB:

```bash
RAILWAY_APP_URL=https://app-production-1ac7.up.railway.app \
RAILWAY_APP_KEY=ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796 \
RAILWAY_INGEST_KEY=ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796 \
npx tsx --env-file=.env scripts/sync-to-railway.ts
```

The Bang daily run ([scripts/bang-scrape-and-sync.bat](../scripts/bang-scrape-and-sync.bat)) already calls this script with all four env vars set, so once Bang's local DB has the Vimeo rows the daily run keeps production in sync automatically.

## Running the backfill

```bash
# Capture a fresh JWT first (expires ~30 min after capture)
JWT="jwt eyJ..." \
node scripts/backfill-vimeo-to-drive.js \
  --scope=all          # all | linked | unlisted — defaults to all
  --limit=10           # optional — useful for smoke tests
  --dry-run            # optional — prints candidates without touching Drive
```

### Scope flags

| Flag | Rows | Roughly |
|---|---|---|
| `--scope=all` (default) | 425 active videos | 41 hours, ~30 GB |
| `--scope=unlisted` | 395 unlisted | 36 hours, ~26 GB |
| `--scope=linked` | 103 linked to a show | 8 hours, ~6 GB |

### Required env

| Var | Default | Notes |
|---|---|---|
| `JWT` | (required) | Vimeo OAuth/JWT, expires ~30 min. Capture from a Chrome DevTools network request on `vimeo.com/manage/videos`. |
| `MYE_TOKEN_PATH` | `C:/Users/pb/.claude/google/mye_token.json` | OAuth token for `admin@myentprod.com` (has `refresh_token`, auto-refreshes). |
| `MYE_CREDENTIALS_PATH` | `C:/Users/pb/.claude/google/credentials.json` | OAuth client credentials (installed app). |
| `DRIVE_SIZZLE_FOLDER_ID` | (looked up) | Skip folder lookup by setting this once. |
| `DATABASE_PATH` | `./data/db.sqlite` | |

### Why OAuth and not the service account

The `andrew-email-reader` service account only has `gmail.readonly` DWD scope on
`myentprod.com`. Adding Drive scope would require an admin-console change in
the Workspace, so the backfill uses the same OAuth path as the rest of the MYE
Google tooling (`mye_token.json` from the `mye-google` skill).

### Drive capacity

`admin@myentprod.com` is on a 20 TB plan. As of 2026-05-13 it had ~427 GB used,
~20 TB free. The full 425-video backfill is estimated at ~140 GB at 8 Mbps,
worst-case ~215 GB at 12 Mbps — comfortably under 2% of available space.

### Resumability

Each row goes through `NULL → pending → done` (or `→ failed`). Re-running the script picks up `NULL` and `failed` rows; `pending` rows stay locked but a future improvement could expire them after a TTL. After backfill, `vimeo_library.backfill_status='done'` rows have `drive_file_id` + `drive_url` + `size_bytes` populated.

## Gotchas and decisions

- **Copy, not move.** The script does not delete the Vimeo originals. `sizzle_reels.vimeo_url` keeps pointing at Vimeo so live buyer pages don't break. Once Drive parity is verified, deletion can be a separate one-off.
- **Source rendition first.** `pickBestRendition` prefers the `source` quality (the original upload) over Vimeo's re-encoded HLS variants. Some clips don't expose `source` — the script falls back to the highest-area MP4.
- **Vimeo download permission.** Not every clip is downloadable via the API even with a valid JWT. Those rows end up with `backfill_status='failed'` and `backfill_error='No download URL available from Vimeo API'`. They need to be downloaded manually from Vimeo's web UI.
- **Filename layout.** Files in Drive are named `<title> [<clip_id>].mp4` so the clip_id is always recoverable from the filename. Title is sanitised to remove Windows-illegal characters and clipped to 180 chars (Drive's hard limit is 255).
- **Where to run.** Bang per the global rule that Show Pitch Machine scrapers run there. Local machine works fine for ad-hoc runs but ties up the laptop and consumes disk for hours.
- **Drive quota.** `myentprod.com` Workspace storage. Check via `lib/google-drive-video.ts` `checkDriveStorageQuota()` before kicking off a full run.
