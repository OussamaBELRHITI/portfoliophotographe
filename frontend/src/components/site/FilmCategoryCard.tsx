import Image from "next/image";
import Link from "next/link";
import { blurProps, cloudinaryVideoPoster } from "@/lib/format";
import type { Category, Media } from "@/lib/types";

/**
 * The Film index equivalent of CategoryCard — same plate-and-label layout, but the cover is a
 * video's poster frame (with a play glyph) and the count is video-only, since a category's
 * `mediaCount` from the API mixes photos and videos together.
 */
export function FilmCategoryCard({
  category,
  videos,
  index = 0,
}: {
  category: Category;
  videos: Media[];
  index?: number;
}) {
  const cover = videos[0];
  // Same fallback as VideoGrid: a poster frame only exists for Cloudinary-hosted videos, so a
  // video from elsewhere renders its own first frame via <video> instead of next/image.
  const hasCloudinaryPoster = cover?.url.includes("/upload/") ?? false;

  return (
    <Link href={`/videos/${category.slug}`} className="group block">
      <div className="relative aspect-3/2 overflow-hidden rounded-lg bg-surface-raised">
        {cover ? (
          hasCloudinaryPoster ? (
            <Image
              src={cloudinaryVideoPoster(cover.url, 1000)}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index < 3}
              {...blurProps(cover.url, true)}
              className="object-cover transition-transform duration-900 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <video
              src={cover.url}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-900 ease-out group-hover:scale-[1.03]"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] tracking-[0.28em] text-fg-subtle uppercase">
              No films yet
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />

        {cover && (
          <span className="absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-fg/50 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-accent group-hover:bg-accent/20">
            <span className="ml-1 block h-0 w-0 border-y-7 border-l-11 border-y-transparent border-l-fg" />
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-lg tracking-[0.14em] uppercase transition-colors duration-300 group-hover:text-accent">
          {category.name}
        </h3>
        <span className="shrink-0 text-[10px] tracking-[0.2em] text-fg-subtle tabular-nums">
          {String(videos.length).padStart(2, "0")}
        </span>
      </div>

      {category.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-fg-muted">
          {category.description}
        </p>
      )}
    </Link>
  );
}
