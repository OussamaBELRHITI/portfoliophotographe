import type { MetadataRoute } from "next";
import { publicApi } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Generated from the live category list, so publishing a gallery adds it to the sitemap
 * automatically — no file to remember to update.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/videos`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    // Fresh, not cached: a sitemap listing galleries that no longer exist sends crawlers to
    // 404s and costs crawl budget.
    const categories = await publicApi.categoriesFresh();
    return [
      ...staticRoutes,
      ...categories.map((c) => ({
        url: `${SITE_URL}/work/${c.slug}`,
        lastModified: new Date(c.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // A sitemap of the static routes beats no sitemap at all if the API is briefly down.
    return staticRoutes;
  }
}
