import Link from "next/link";
import { Biography } from "@/components/site/Biography";
import { CategoryCard } from "@/components/site/CategoryCard";
import { FilmCategoryCard } from "@/components/site/FilmCategoryCard";
import { Hero } from "@/components/site/Hero";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { Reveal } from "@/components/site/Reveal";
import { publicApi } from "@/lib/api";
import type { Category, Media, SiteSettings } from "@/lib/types";

export default async function HomePage() {
  // allSettled so one failing endpoint doesn't blank the whole page.
  const [categoriesRes, videosRes, heroRes, settingsRes] = await Promise.allSettled([
    publicApi.categories(),
    publicApi.videos(),
    publicApi.hero(),
    publicApi.settings(),
  ]);

  const categories: Category[] = categoriesRes.status === "fulfilled" ? categoriesRes.value : [];
  const videos: Media[] = videosRes.status === "fulfilled" ? videosRes.value : [];
  const hero: Media | null = heroRes.status === "fulfilled" ? heroRes.value : null;
  const settings: SiteSettings = settingsRes.status === "fulfilled" ? settingsRes.value : {};

  const featured = categories.slice(0, 3);

  // The carousel needs photographs to cross-fade between. With one gallery there is nothing to
  // page through, and with none there is nothing to show at all — both fall back to the static
  // hero, which already handles an empty portfolio gracefully.
  const carouselCategories = categories.filter((c) => c.coverImageUrl);
  const useCarousel = carouselCategories.length > 1;

  // Same first-three categories as the Work strip above — Film reuses the same taxonomy, so
  // this stays in lockstep with it rather than picking a different subset.
  const filmCategories = categories.slice(0, 3);
  const filmVideosByCategory =
    videos.length > 0
      ? await Promise.all(
          filmCategories.map((c) => publicApi.categoryVideos(c.slug).catch(() => [] as Media[])),
        )
      : [];

  return (
    <>
      {useCarousel ? (
        <HeroCarousel categories={carouselCategories} settings={settings} />
      ) : (
        <Hero media={hero} settings={settings} />
      )}

      <section id="work" className="mx-auto max-w-350 px-6 py-24 lg:px-12 lg:py-32">
        <Reveal className="mb-16">
          <p className="text-[10px] tracking-[0.32em] text-accent uppercase">Selected</p>
          <h2 className="mt-3 font-display text-4xl tracking-[0.06em] uppercase sm:text-5xl">
            Photos
          </h2>
        </Reveal>

        {featured.length > 0 ? (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((category, i) => (
              // Stagger by column so a row appears to sweep in rather than pop at once.
              <Reveal key={category.id} delay={(i % 3) * 90}>
                <CategoryCard category={category} index={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <EmptyState
              title="Galleries coming soon"
              body="Work is being added. Check back shortly, or get in touch about a commission."
            />
          </Reveal>
        )}

        {featured.length > 0 && (
          <Reveal className="mt-16 text-center">
            <Link
              href="/work"
              className="inline-block border border-fg/30 px-9 py-3.5 text-[11px] tracking-[0.24em] uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-ink"
            >
              View All Photos
            </Link>
          </Reveal>
        )}
      </section>

      {videos.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-350 px-6 py-24 lg:px-12 lg:py-32">
            <Reveal className="mb-16">
              <p className="text-[10px] tracking-[0.32em] text-accent uppercase">Motion</p>
              <h2 className="mt-3 font-display text-4xl tracking-[0.06em] uppercase sm:text-5xl">
                Film
              </h2>
            </Reveal>

            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {filmCategories.map((category, i) => (
                <Reveal key={category.id} delay={(i % 3) * 90}>
                  <FilmCategoryCard
                    category={category}
                    videos={filmVideosByCategory[i] ?? []}
                    index={i}
                  />
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-16 text-center">
              <Link
                href="/videos"
                className="inline-block border border-fg/30 px-9 py-3.5 text-[11px] tracking-[0.24em] uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-ink"
              >
                View All Film
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      <Biography settings={settings} />
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-line py-24 text-center">
      <p className="font-display text-2xl tracking-wide text-fg-muted">{title}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-fg-subtle">{body}</p>
    </div>
  );
}
