import Image from "next/image";
import { cloudinaryThumb, cloudinaryVideoPoster } from "@/lib/format";
import type { Media } from "@/lib/types";

/**
 * Fills its (relatively positioned) parent with a preview of one media item.
 *
 * Videos hosted outside Cloudinary have no server-generated poster frame to request, and
 * next/image refuses hosts that aren't allow-listed — so those fall back to the browser's own
 * first frame, same as the public VideoGrid.
 */
export function MediaThumb({
  item,
  width = 400,
  sizes = "200px",
  className = "",
}: {
  item: Pick<Media, "url" | "type" | "title">;
  width?: number;
  sizes?: string;
  className?: string;
}) {
  const isCloudinary = item.url.includes("res.cloudinary.com");

  if (item.type === "VIDEO" && !isCloudinary) {
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

  if (!isCloudinary) {
    // Unoptimized: an arbitrary pasted URL is outside next/image's host allow-list, and asking
    // the optimizer for it would throw and take the page down.
    return (
      <Image
        src={item.url}
        alt={item.title ?? ""}
        fill
        unoptimized
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <Image
      src={item.type === "VIDEO" ? cloudinaryVideoPoster(item.url, width) : cloudinaryThumb(item.url, width)}
      alt={item.title ?? ""}
      fill
      sizes={sizes}
      className={`object-cover ${className}`}
    />
  );
}
