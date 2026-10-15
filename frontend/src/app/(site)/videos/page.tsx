import type { Metadata } from "next";
import { FilmCategoryCard } from "@/components/site/FilmCategoryCard";
import { PageBanner } from "@/components/site/PageBanner";
import { Reveal } from "@/components/site/Reveal";
import { publicApi } from "@/lib/api";
import type { Category, Media, SiteSettings } from "@/lib/types";

export const metadata: Metadata = {
  title: "Film",
  description: "Motion work by category — weddings, portraits and commissioned shorts.",
};

export default async function VideosPage() {
  let categories: Category[] = [];
  let settings: SiteSettings = {};

  const [categoriesRes, settingsRes] = await Promise.allSettled([
    publicApi.categories(),
    publicApi.settings(),
  ]);
  if (categoriesRes.status === "fulfilled") categories = categoriesRes.value;
  if (settingsRes.status === "fulfilled") settings = settingsRes.value;

  // Categories are shared with Work, but its bundled mediaCount mixes photos and videos — Film
  // needs a video-only count and cover, so each category's films are fetched separately.
  const videosByCategory = await Promise.all(
    categories.map((c) => publicApi.categoryVideos(c.slug).catch(() => [] as Media[])),
  );

  const bannerUrl = settings.videosBannerUrl;

  return (
    <div>
      {bannerUrl && <PageBanner eyebrow="Motion" heading="Film" imageUrl={bannerUrl} />}

      <div
        className={`mx-auto max-w-350 px-6 pb-24 lg:px-12 ${
          bannerUrl ? "pt-14 lg:pt-16" : "pt-32 lg:pt-40"
        }`}
      >
        {!bannerUrl && (
          <Reveal className="mb-16">
            <p className="text-[10px] tracking-[0.32em] text-accent uppercase">Motion</p>
            <h1 className="mt-3 font-display text-5xl tracking-[0.06em] uppercase sm:text-6xl">
              Film
            </h1>
          </Reveal>
        )}

        {categories.length > 0 ? (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, i) => (
              <Reveal key={category.id} delay={(i % 3) * 90}>
                <FilmCategoryCard category={category} videos={videosByCategory[i]} index={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="border border-dashed border-line py-24 text-center">
              <p className="font-display text-2xl tracking-wide text-fg-muted">
                No categories yet
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-fg-subtle">
                Film appears here once a category is published.
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
