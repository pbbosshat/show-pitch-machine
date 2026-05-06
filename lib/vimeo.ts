// lib/vimeo.ts
// Converts any Vimeo URL format to the player embed src format.
// Used by both the API and the UI to normalise URLs before storage / display.

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
