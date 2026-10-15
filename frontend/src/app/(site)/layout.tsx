import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StructuredData } from "@/components/site/StructuredData";
import { connection } from "next/server";
import { publicApi } from "@/lib/api";
import type { Category, SiteSettings } from "@/lib/types";

/**
 * Route group `(site)` wraps every public page in the header/footer chrome without adding a
 * path segment. The admin dashboard sits outside it and gets its own shell.
 *
 * Categories and settings are fetched once here and passed down, so the nav and footer share a
 * single request each rather than fetching their own.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  // Render public pages per request instead of prerendering them at build time. In Docker the
  // image is built before the backend is reachable, so a build-time render would bake empty
  // pages in — and the first visitor after every deploy would be served that empty copy.
  // Data still comes from the 60s fetch cache, so this costs no extra backend load.
  await connection();

  let categories: Category[] = [];
  let settings: SiteSettings = {};

  // Settled rather than all: a failure fetching categories shouldn't also cost us the site
  // name in the header. Each falls back independently.
  const [categoriesResult, settingsResult] = await Promise.allSettled([
    publicApi.categories(),
    publicApi.settings(),
  ]);

  if (categoriesResult.status === "fulfilled") categories = categoriesResult.value;
  if (settingsResult.status === "fulfilled") settings = settingsResult.value;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-200 focus:border focus:border-accent focus:bg-ink focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <StructuredData settings={settings} categories={categories} />
      <SiteHeader categories={categories} settings={settings} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter categories={categories} settings={settings} />
    </>
  );
}
