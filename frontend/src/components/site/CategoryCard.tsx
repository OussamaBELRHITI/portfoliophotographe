import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/lib/types";

/**
 * A gallery plate: image, then a typeset label beneath it.
 *
 * Two deliberate choices, both about respecting the photograph:
 *
 * - **3:2 landscape, not 4:5 portrait.** Most cameras shoot 3:2 or 4:3, so a portrait frame
 *   forces `object-cover` to discard a third of every image and centre-crop whatever is left.
 *   Matching the native ratio means the crop is nearly free.
 * - **Caption below, not overlaid.** A scrim burned across the bottom of a photo to make text
 *   legible is a compromise the photograph pays for. Setting the label underneath keeps the
 *   frame clean, and reads like a print label in a gallery.
 */
export function CategoryCard({ category, index = 0 }: { category: Category; index?: number }) {
  return (
    <Link href={`/work/${category.slug}`} className="group block">
      <div className="relative aspect-3/2 overflow-hidden rounded-lg bg-surface-raised">
        {category.coverImageUrl ? (
          <Image
            src={category.coverImageUrl}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            // Already a right-sized WebP made at upload; Next's optimizer would re-encode it
            // for no gain, and this way no host allow-list is needed either.
            unoptimized
            priority={index < 3}
            className="object-cover transition-transform duration-900 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] tracking-[0.28em] text-fg-subtle uppercase">
              No images yet
            </span>
          </div>
        )}

        {/* A whisper of darkening on hover, rather than a permanent scrim. */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/15" />
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-lg tracking-[0.14em] uppercase transition-colors duration-300 group-hover:text-accent">
          {category.name}
        </h3>
        <span className="shrink-0 text-[10px] tracking-[0.2em] text-fg-subtle tabular-nums">
          {String(category.mediaCount).padStart(2, "0")}
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
