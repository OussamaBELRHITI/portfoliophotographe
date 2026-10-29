import Image from "next/image";
import { posterUrl, thumbUrl } from "@/lib/format";
import type { Media } from "@/lib/types";

/**
 * Fills its (relatively positioned) parent with a preview of one media item.
 *
 * A video shows the still frame captured when it was uploaded. Anything older than that
 * feature — or a clip the browser could not decode at the time — has no frame stored, so it
 * falls back to letting the browser render the clip's own first frame, same as the public
 * VideoGrid does.
 *
 * Everything here renders unoptimized: stored files are already right-sized WebP, and a URL
 * typed into the settings form by hand is outside next/image's host allow-list, which would
 * throw and take the page down.
 */
export function MediaThumb({
  item,
  sizes = "200px",
  className = "",
}: {
  item: Pick<Media, "url" | "type" | "title"> & Partial<Pick<Media, "thumbnailUrl" | "posterUrl">>;
  /** Accepted for call-site compatibility; stored files already come at a fixed size. */
  width?: number;
  sizes?: string;
  className?: string;
}) {
  if (item.type === "VIDEO") {
    const poster = posterUrl({ type: item.type, posterUrl: item.posterUrl });
    if (!poster) {
      return (
        <video
          src={item.url}
          muted
          playsInline
          preload="metadata"
          className={`absolute inset-0 h-full w-full object-cover ${className}`}
        />
      );
    }
    return (
      <Image
        src={poster}
        alt={item.title ?? ""}
        fill
        sizes={sizes}
        unoptimized
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <Image
      src={thumbUrl({ url: item.url, thumbnailUrl: item.thumbnailUrl })}
      alt={item.title ?? ""}
      fill
      sizes={sizes}
      unoptimized
      className={`object-cover ${className}`}
    />
  );
}
