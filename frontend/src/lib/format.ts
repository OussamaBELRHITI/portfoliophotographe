import type { Media } from "./types";

/** Shared formatting helpers. */

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * The URL to show for a media item, at the size the context actually needs.
 *
 * Storage returns files exactly as uploaded — there is no resize-on-request — so these pick
 * between copies the browser made at upload time rather than building a transformation URL.
 * Every accessor falls back to the full-size file, which keeps items uploaded before a given
 * copy existed working instead of rendering a broken image.
 */

/** Grid tiles and other small placements. */
export function thumbUrl(media: Pick<Media, "url" | "thumbnailUrl">): string {
  return media.thumbnailUrl ?? media.url;
}

/** Full-screen placements: the hero and the lightbox. */
export function displayUrl(media: Pick<Media, "url">): string {
  return media.url;
}

/** A video's still frame. Null when the browser could not capture one at upload. */
export function posterUrl(media: Pick<Media, "type" | "posterUrl">): string | null {
  return media.type === "VIDEO" ? (media.posterUrl ?? null) : null;
}

/**
 * next/image needs `placeholder="blur"` AND a `blurDataURL` together, so this bundles them.
 * Spread onto an <Image> to opt a photo into blur-up loading.
 *
 * The placeholder is a data URI stored on the row, so it costs no request. Items without one
 * get no blur rather than a broken attribute — next/image rejects an empty blurDataURL.
 */
export function blurProps(media: Pick<Media, "blurDataUrl">) {
  return media.blurDataUrl
    ? { placeholder: "blur" as const, blurDataURL: media.blurDataUrl }
    : {};
}

/** Aspect ratio as a CSS-friendly number, defaulting to 3:2 when dimensions are unknown. */
export function aspectRatio(width?: number | null, height?: number | null): number {
  return width && height ? width / height : 1.5;
}
