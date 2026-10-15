/**
 * Placeholder shown while a gallery route streams in.
 *
 * Mirrors the real masonry layout — varied heights, same column rules — so the page doesn't
 * visibly reflow when the actual photos arrive.
 */
export function GallerySkeleton({ count = 9 }: { count?: number }) {
  const heights = ["h-72", "h-96", "h-80", "h-[26rem]", "h-72", "h-88"];

  return (
    <div className="columns-1 gap-1.5 sm:columns-2 lg:columns-3 *:mb-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-full animate-pulse break-inside-avoid bg-surface-raised ${
            heights[i % heights.length]
          }`}
          // Offsetting each tile's pulse stops the grid throbbing as one block.
          style={{ animationDelay: `${(i % 5) * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="mb-14">
      <div className="h-3 w-24 animate-pulse bg-surface-raised" />
      <div className="mt-5 h-12 w-72 animate-pulse bg-surface-raised" />
      <div className="mt-5 h-3 w-96 max-w-full animate-pulse bg-surface-raised" />
    </div>
  );
}
