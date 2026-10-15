import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/site/Reveal";
import { VideoGrid } from "@/components/site/VideoGrid";
import { ApiError, publicApi } from "@/lib/api";
import type { Category, Media } from "@/lib/types";

/**
 * Pre-renders a page per visible category at build time, same as /work/[slug] — see that route
 * for why `categoriesFresh` (uncached) is used here instead of the normal cached fetch.
 */
export async function generateStaticParams() {
  try {
    const categories = await publicApi.categoriesFresh();
    return categories.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/videos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await publicApi.category(slug);
    return {
      title: `${category.name} — Film`,
      description: category.description ?? `${category.name} films.`,
    };
  } catch {
    // Same reasoning as /work/[slug]: generateStaticParams routes 200 rather than 404 on a
    // miss, so this noindex directive is what keeps an unresolvable slug out of search results.
    return {
      title: "Not found",
      robots: { index: false, follow: false },
    };
  }
}

export default async function FilmCategoryPage({ params }: PageProps<"/videos/[slug]">) {
  const { slug } = await params;

  let category: Category;
  let videos: Media[] = [];

  try {
    [category, videos] = await Promise.all([
      publicApi.category(slug),
      publicApi.categoryVideos(slug),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-400 px-6 pt-32 pb-24 lg:px-12 lg:pt-40">
      <Reveal as="section" className="mb-14">
        <Link
          href="/videos"
          className="text-[10px] uppercase tracking-[0.28em] text-fg-subtle transition-colors hover:text-accent"
        >
          ← All film
        </Link>
        <h1 className="mt-5 font-display text-5xl tracking-[0.06em] uppercase sm:text-6xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-fg-muted">
            {category.description}
          </p>
        )}
        <p className="mt-4 text-[10px] tracking-[0.24em] text-fg-subtle uppercase">
          {videos.length} {videos.length === 1 ? "film" : "films"}
        </p>
      </Reveal>

      {videos.length > 0 ? (
        <VideoGrid videos={videos} />
      ) : (
        <div className="border border-dashed border-line py-24 text-center">
          <p className="font-display text-2xl tracking-wide text-fg-muted">
            No films in this category yet
          </p>
        </div>
      )}
    </div>
  );
}
