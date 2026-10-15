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

/** True for URLs next/image is allowed to optimise (see remotePatterns in next.config.ts). */
export function isCloudinary(url: string): boolean {
  return url.startsWith("https://res.cloudinary.com/");
}

/**
 * Cloudinary transformations are injected into the delivery URL after `/upload/`.
 * `f_auto,q_auto` lets Cloudinary pick a modern format and sensible quality per browser,
 * and `w_` caps the pixels actually sent — a 4000px original has no business loading
 * behind a 600px thumbnail.
 */
export function cloudinaryThumb(url: string, width = 800): string {
  return url.includes("/upload/")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`)
    : url;
}

/** Still frame from a video, for use as a poster image. */
export function cloudinaryVideoPoster(url: string, width = 1200): string {
  if (!url.includes("/upload/")) return url;
  return url
    .replace("/upload/", `/upload/so_0,f_auto,q_auto,w_${width}/`)
    .replace(/\.(mp4|mov|webm|avi|mkv)$/i, ".jpg");
}

/**
 * A tiny, heavily blurred version of the image — a "LQIP".
 *
 * <p>Fed to next/image as `blurDataURL`, it renders instantly under the real photo so a gallery
 * fades in from a soft colour impression instead of flashing empty grey boxes. At 24px wide
 * with e_blur the file is a couple of kilobytes.
 *
 * Cloudinary generates it from the same source, so there is nothing to precompute or store.
 */
export function cloudinaryBlurUrl(url: string): string {
  return url.includes("/upload/")
    ? url.replace("/upload/", "/upload/w_24,e_blur:400,q_auto:low,f_auto/")
    : url;
}

/** Blur placeholder for a video's poster frame. */
export function cloudinaryVideoBlurUrl(url: string): string {
  if (!url.includes("/upload/")) return url;
  return url
    .replace("/upload/", "/upload/so_0,w_24,e_blur:400,q_auto:low,f_auto/")
    .replace(/\.(mp4|mov|webm|avi|mkv)$/i, ".jpg");
}

/**
 * next/image needs `placeholder="blur"` AND a `blurDataURL` together, so this bundles them.
 * Spread onto an <Image> to opt a photo into blur-up loading.
 */
export function blurProps(url: string, isVideo = false) {
  return {
    placeholder: "blur" as const,
    blurDataURL: isVideo ? cloudinaryVideoBlurUrl(url) : cloudinaryBlurUrl(url),
  };
}

/** Aspect ratio as a CSS-friendly number, defaulting to 3:2 when dimensions are unknown. */
export function aspectRatio(width?: number | null, height?: number | null): number {
  return width && height ? width / height : 1.5;
}
