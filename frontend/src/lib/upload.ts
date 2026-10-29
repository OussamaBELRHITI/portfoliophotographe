"use client";

/**
 * Everything a media CDN used to do on request, done once in the browser before upload.
 *
 * Storage serves files back exactly as they were sent — there is no resize-on-demand — so the
 * sizes a page needs have to exist as real files. That is cheaper than it sounds: the work
 * happens on the photographer's own machine at upload time rather than on every visitor's
 * request, and it means the server never has to decode an image at all.
 */

/** Full-size copy: big enough for a full-screen hero on a high-density display. */
const DISPLAY_MAX = 2560;
/** Grid copy. A masonry tile is rarely wider than ~700 CSS px, so this covers it at 2x. */
const THUMB_MAX = 1200;
/** Tiny blurred placeholder, inlined into the database row rather than fetched. */
const BLUR_MAX = 24;

const DISPLAY_QUALITY = 0.9;
const THUMB_QUALITY = 0.82;

export interface Rendition {
  blob: Blob;
  width: number;
  height: number;
}

/** What a browser can decode into a canvas. SVG has no raster size; GIF would lose animation. */
function isResizable(file: File): boolean {
  return (
    file.type.startsWith("image/") &&
    file.type !== "image/svg+xml" &&
    file.type !== "image/gif"
  );
}

/**
 * Draws a bitmap at a bounded size and encodes it.
 *
 * Scale is capped at 1: a 900px photo asked for a 2560px "display" copy is left at 900 rather
 * than upscaled, which would cost bytes to add nothing but interpolation.
 */
async function render(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
  type = "image/webp",
): Promise<Rendition> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not prepare the image for upload.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
  if (!blob) throw new Error("This browser could not convert the image.");

  return { blob, width, height };
}

export interface PreparedImage {
  display: Rendition;
  thumbnail: Rendition | null;
  blurDataUrl: string | null;
  /** True when the file was passed through untouched (SVG, GIF, or a decode failure). */
  original: boolean;
}

/**
 * Produces the copies an image needs: one for full-screen viewing, one for grids, and a blur
 * placeholder.
 *
 * Anything that cannot be decoded is uploaded as-is rather than rejected — an unusual file
 * format is not a good reason to refuse a photographer's work.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isResizable(file)) {
    return {
      display: { blob: file, width: 0, height: 0 },
      thumbnail: null,
      blurDataUrl: null,
      original: true,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return {
      display: { blob: file, width: 0, height: 0 },
      thumbnail: null,
      blurDataUrl: null,
      original: true,
    };
  }

  try {
    const display = await render(bitmap, DISPLAY_MAX, DISPLAY_QUALITY);
    // Only worth a second file when the grid copy is meaningfully smaller than the display one.
    const thumbnail =
      display.width > THUMB_MAX * 1.2
        ? await render(bitmap, THUMB_MAX, THUMB_QUALITY)
        : null;
    const blur = await render(bitmap, BLUR_MAX, 0.5, "image/webp");
    return {
      display,
      thumbnail,
      blurDataUrl: await blobToDataUrl(blur.blob),
      original: false,
    };
  } finally {
    // Frees the decoded pixels immediately instead of waiting for collection — a 50 MP raw
    // export is ~200 MB decoded, and a batch of them would otherwise pile up.
    bitmap.close();
  }
}

export interface PreparedVideo {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  poster: Rendition | null;
  blurDataUrl: string | null;
}

/**
 * Reads a video's dimensions and grabs a still frame for its thumbnail.
 *
 * This is the job a media CDN did with a URL parameter. Done here with a hidden <video>: seek a
 * little way in, draw the current frame to a canvas, and keep that as a normal image. Seeking
 * past zero on purpose — the first frame of a clip is very often black.
 */
export async function prepareVideo(file: File): Promise<PreparedVideo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    const meta = await new Promise<{ w: number; h: number; d: number } | null>((resolve) => {
      // A codec the browser cannot decode never fires loadedmetadata; without a timeout the
      // upload would hang forever on a file that is otherwise perfectly storable.
      const timer = setTimeout(() => resolve(null), 10_000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve({ w: video.videoWidth, h: video.videoHeight, d: video.duration });
      };
      video.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
    });

    if (!meta || !meta.w || !meta.h) {
      return { width: null, height: null, durationSeconds: null, poster: null, blurDataUrl: null };
    }

    const duration = Number.isFinite(meta.d) ? meta.d : null;
    const poster = await captureFrame(video, Math.min(1, (duration ?? 1) / 4));

    return {
      width: meta.w,
      height: meta.h,
      durationSeconds: duration,
      poster,
      blurDataUrl: poster ? await blobToDataUrl((await shrink(poster.blob, BLUR_MAX)).blob) : null,
    };
  } finally {
    video.src = "";
    URL.revokeObjectURL(url);
  }
}

/** Seeks to a timestamp and returns that frame as an image. */
async function captureFrame(video: HTMLVideoElement, atSeconds: number): Promise<Rendition | null> {
  const seeked = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 10_000);
    video.onseeked = () => {
      clearTimeout(timer);
      resolve(true);
    };
    video.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    try {
      video.currentTime = atSeconds;
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
  if (!seeked) return null;

  const scale = Math.min(1, THUMB_MAX / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch {
    // Tainted canvas, in practice only for cross-origin sources. A video without a poster is
    // a cosmetic loss, not a failed upload.
    return null;
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", THUMB_QUALITY),
  );
  return blob ? { blob, width: canvas.width, height: canvas.height } : null;
}

/** Re-encodes an existing blob at a smaller size — used to derive the blur from a poster. */
async function shrink(blob: Blob, maxEdge: number): Promise<Rendition> {
  const bitmap = await createImageBitmap(blob);
  try {
    return await render(bitmap, maxEdge, 0.5);
  } finally {
    bitmap.close();
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the generated placeholder."));
    reader.readAsDataURL(blob);
  });
}

/** Swaps a filename's extension, so a converted file is not stored as "photo.jpg" holding WebP. */
export function renameExtension(filename: string, ext: string): string {
  return filename.replace(/\.[^./\\]+$/, "") + "." + ext;
}
