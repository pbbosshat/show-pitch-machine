// lib/vimeo.ts
// Video URL helpers. Despite the filename, this module covers both Vimeo and
// Google Drive — Drive is the preferred source for deck/one-sheet embeds and
// Vimeo is the legacy fallback. `pickDeckVideoEmbed()` is the single entry
// point one-sheets should call.

/**
 * Converts any Vimeo URL variant to the canonical player.vimeo.com embed URL.
 *
 * Handles:
 *   vimeo.com/ID/HASH        → https://player.vimeo.com/video/ID?h=HASH
 *   player.vimeo.com/video/… → returned as-is (already normalised)
 *   vimeo.com/showcase/ID    → https://vimeo.com/showcase/ID/embed
 *   vimeo.com/ID             → https://player.vimeo.com/video/ID  (no hash)
 *
 * @param url - Any Vimeo URL string (or empty string / undefined)
 * @returns The normalised embed URL, or the original string if no pattern matched.
 */
export function toVimeoEmbedUrl(url: string): string {
  if (!url) return '';

  // Already a player embed URL — return unchanged to avoid double-transforming
  if (url.includes('player.vimeo.com')) return url;

  // Showcase URLs use a different embed path format
  const showcase = url.match(/vimeo\.com\/showcase\/(\d+)/);
  if (showcase) return `https://vimeo.com/showcase/${showcase[1]}/embed`;

  // Standard private/unlisted URL: vimeo.com/VIDEO_ID/HASH
  const standard = url.match(/vimeo\.com\/(\d+)\/([a-f0-9]+)/);
  if (standard) return `https://player.vimeo.com/video/${standard[1]}?h=${standard[2]}`;

  // Public video URL with ID only: vimeo.com/VIDEO_ID
  const idOnly = url.match(/vimeo\.com\/(\d+)$/);
  if (idOnly) return `https://player.vimeo.com/video/${idOnly[1]}`;

  // No pattern matched — return unchanged (may be a custom domain or future format)
  return url;
}

/**
 * Google Drive file ID → embeddable preview URL.
 *
 * Drive serves `https://drive.google.com/file/d/{id}/preview` as a framed
 * player (controls, fullscreen, the works) for any file whose sharing is set
 * to "anyone with the link". Sizzle uploads through `lib/google-drive-video.ts`
 * set that permission at upload time, so this URL works for every backfilled
 * file in the myentprod.com "Sizzle Reels" folder.
 */
export function toDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Decide which video to embed on a deck / one-sheet, preferring Drive over Vimeo.
 *
 * Order of preference:
 *   1. `drive_file_id` if set — Drive is the canonical store going forward
 *   2. `vimeo_url` if set — passed through `toVimeoEmbedUrl` to handle page URLs
 *   3. Caller's hardcoded fallback (legacy player.vimeo.com URLs in some
 *      one-sheets — these are being phased out as Drive backfills land).
 *
 * Returns null when nothing is available so callers can render a placeholder.
 */
export function pickDeckVideoEmbed(
  driveFileId: string | null | undefined,
  vimeoUrl: string | null | undefined,
  hardcodedFallback?: string | null,
): string | null {
  if (driveFileId) return toDriveEmbedUrl(driveFileId);
  if (vimeoUrl)    return toVimeoEmbedUrl(vimeoUrl);
  if (hardcodedFallback) return toVimeoEmbedUrl(hardcodedFallback);
  return null;
}
