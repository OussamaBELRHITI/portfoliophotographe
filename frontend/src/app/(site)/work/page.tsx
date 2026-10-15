import type { Metadata } from "next";
import { CategoryCard } from "@/components/site/CategoryCard";
import { PageBanner } from "@/components/site/PageBanner";
import { Reveal } from "@/components/site/Reveal";
import { publicApi } from "@/lib/api";
import type { Category, SiteSettings } from "@/lib/types";

export const metadata: Metadata = {
  title: "Photos",
  description: "Photography galleries by category.",
};

export default async function WorkPage() {
  let categories: Category[] = [];
  let settings: SiteSettings = {};

  // allSettled so a failure fetching the banner setting doesn't also blank the category grid.
  const [categoriesRes, settingsRes] = await Promise.allSettled([
    publicApi.categories(),
    publicApi.settings(),
  ]);
  if (categoriesRes.status === "fulfilled") categories = categoriesRes.value;
  if (settingsRes.status === "fulfilled") settings = settingsRes.value;

  const bannerUrl = settings.workBannerUrl;

  return (
    <div>
      {bannerUrl && <PageBanner eyebrow="Portfolio" heading="Photos" imageUrl={bannerUrl} />}

      <div
        className={`mx-auto max-w-350 px-6 pb-24 lg:px-12 ${
          bannerUrl ? "pt-14 lg:pt-16" : "pt-32 lg:pt-40"
        }`}
      >
        {/* Text header only when there's no banner — the banner already carries the eyebrow
            and heading overlaid on the photo, so repeating them here would be redundant. */}
        {!bannerUrl && (
          <Reveal className="mb-16">
            <p className="text-[10px] tracking-[0.32em] text-accent uppercase">Portfolio</p>
            <h1 className="mt-3 font-display text-5xl tracking-[0.06em] uppercase sm:text-6xl">
              Photos
            </h1>
          </Reveal>
        )}

        {/* Generous gutters: gallery plates need air around them to read as individual works
            rather than as one continuous contact sheet. */}
        {categories.length > 0 ? (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, i) => (
              <Reveal key={category.id} delay={(i % 3) * 90}>
                <CategoryCard category={category} index={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="border border-dashed border-line py-24 text-center">
              <p className="font-display text-2xl tracking-wide text-fg-muted">
                No galleries yet
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-fg-subtle">
                Galleries appear here once they are published.
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
