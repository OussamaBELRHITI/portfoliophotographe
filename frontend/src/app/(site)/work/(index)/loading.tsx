import { GallerySkeleton, HeaderSkeleton } from "@/components/site/GallerySkeleton";

/**
 * Skeleton for the gallery index.
 *
 * Lives in the (index) route group so it wraps /work only. A loading.tsx applies to its own
 * segment *and every child*, so at /work it also wrapped /work/[slug]. A loading.tsx wraps
 * its segment in a Suspense boundary, which makes Next stream the response — the 200 headers
 * are flushed before the page body runs, so a later notFound() can no longer change the status
 * code. The gallery detail route relies on returning a real 404 for unpublished slugs, so it
 * must render unstreamed. This index route has no notFound() path, so the skeleton is free here.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-400 px-6 pt-32 pb-24 lg:px-12 lg:pt-40">
      <HeaderSkeleton />
      <GallerySkeleton />
    </div>
  );
}
