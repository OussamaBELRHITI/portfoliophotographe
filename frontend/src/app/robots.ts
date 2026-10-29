import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE_URL } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Per request rather than at build time, so the sitemap address follows SITE_URL.
  await connection();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The dashboard has no business in an index. Its pages also carry
      // `robots: { index: false }` in their metadata — belt and braces, since a
      // disallow rule only asks crawlers not to fetch, not to omit from results.
      disallow: ["/admin", "/admin/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
