/**
 * The site's public address, for absolute URLs in the sitemap, robots.txt, share cards and
 * structured data. Server-side only.
 *
 * `SITE_URL` is read when the server starts, not compiled in, so moving the site to a new
 * address (a new server IP, a domain) needs a restart rather than a rebuild.
 * `NEXT_PUBLIC_SITE_URL` is the older build-time setting, still honoured as a fallback.
 */
export const SITE_URL =
  process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
