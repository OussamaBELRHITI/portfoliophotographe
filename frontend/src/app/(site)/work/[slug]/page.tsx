import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { Reveal } from "@/components/site/Reveal";
import { GalleryStructuredData } from "@/components/site/StructuredData";
import { ApiError, publicApi } from "@/lib/api";
import type { Category, Media } from "@/lib/types";

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await publicApi.category(slug);
    return {
      title: category.name,
      description: category.description ?? `${category.name} photography gallery.`,
      openGraph: category.coverImageUrl
        ? { images: [{ url: category.coverImageUrl }] }
        : undefined,
    };
  } catch {
    // The slug doesn't resolve — either it never existed or the gallery is unpublished. The
    // page itself answers 404; noindex is belt and braces for the metadata.
    return {
      title: "Gallery not found",
      robots: { index: false, follow: false },
    };
  }
}

export default async function GalleryPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;

  let category: Category;
  let media: Media[] = [];

  try {
    [category, media] = await Promise.all([
      publicApi.category(slug),
      publicApi.categoryMedia(slug),
    ]);
  } catch (err) {
    // The backend returns 404 for hidden categories too, so this covers both "doesn't exist"
    // and "not published yet" without leaking which it was.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-400 px-6 pt-32 pb-24 lg:px-12 lg:pt-40">
      <GalleryStructuredData category={category} media={media} />
      <Reveal as="section" className="mb-14">
        <Link
          href="/work"
          className="text-[10px] uppercase tracking-[0.28em] text-fg-subtle transition-colors hover:text-accent"
        >
          ← All work
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
          {media.length} {media.length === 1 ? "image" : "images"}
        </p>
      </Reveal>

      {media.length > 0 ? (
        <GalleryGrid media={media} />
      ) : (
        <div className="border border-dashed border-line py-24 text-center">
          <p className="font-display text-2xl tracking-wide text-fg-muted">
            This gallery is being prepared
          </p>
        </div>
      )}
    </div>
  );
}
