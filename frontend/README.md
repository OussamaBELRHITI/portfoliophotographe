# Photographer Portfolio — Frontend

Next.js 16 (App Router) + React 19 + Tailwind 4. Public portfolio site and the admin
dashboard, both talking to the Spring backend in [`../backend`](../backend).

## Running locally

The backend must be up first:

```bash
cd ../backend && docker compose up -d && ./mvnw spring-boot:run   # :8080
cd ../frontend && npm run dev                                     # :3000
```

Sign in at [/admin/login](http://localhost:3000/admin/login) with the credentials from
`ADMIN_USERNAME` / `ADMIN_PASSWORD` (default `admin` / `changeme`).

## Environment

Real values live in `.env.local` (gitignored).

| Variable | Used by | Purpose |
| --- | --- | --- |
| `API_URL` | Server Components | Backend URL for server-side fetches |
| `NEXT_PUBLIC_API_URL` | Client Components | Backend URL for browser fetches |
| `NEXT_PUBLIC_SITE_URL` | sitemap, OG tags | Canonical origin, e.g. `https://example.com` |

**Site copy is no longer configured here.** Studio name, tagline, biography, portrait and contact details
all live in the database and are edited at
**Dashboard → Settings**, so the photographer can change them without touching config or
redeploying.

Two API URLs because Server Components fetch from inside the host while Client Components
fetch from the visitor's browser. Identical locally; they diverge once the frontend is on
Vercel and the backend on Render/Railway.

## Deploying

See [`../DEPLOY.md`](../DEPLOY.md): Docker Compose + Caddy (automatic HTTPS) on a VPS.

## Two caching gotchas worth knowing

**Build-time reads must bypass the fetch cache.** `generateStaticParams` and `sitemap.ts` use
`publicApi.categoriesFresh()` (`cache: "no-store"`) rather than the normal cached call. Next's
fetch cache lives in `.next/cache` and survives between builds — and on Vercel between
*deployments* — so with the cached call a gallery deleted months ago still gets prerendered
into a fresh production build. This was observed, not theorised.

**`notFound()` inside a `generateStaticParams` route returns 200, not 404.** Next prerenders
the not-found result as a static page. `dynamicParams = false` would restore the 404 but would
also make galleries published after deploy unreachable until the next build. Since the
photographer publishes his own work, the route keeps returning 200 and `generateMetadata` emits
`robots: noindex, nofollow` for unresolvable slugs instead. Genuinely unknown routes (no
matching segment at all) still return a real 404.

## Structure

```
src/app/(site)/     Public pages — route group, so no /site path segment
  page.tsx            Home: hero + selected work + film + biography
  work/               Gallery index and /work/[slug] detail
  videos/             Film section
  contact/
src/app/admin/      Dashboard — outside (site), so no public chrome
  login/  categories/  media/  settings/
src/components/site/    Header, footer, hero, biography, gallery grid, lightbox, video grid
src/components/admin/   AdminShell (route guard), MediaUploader, ImageField, UI primitives
src/lib/
  api.ts    Typed client: publicApi / authApi / adminApi + Cloudinary upload
  auth.tsx  AuthProvider — token storage and session restore
  types.ts  Mirrors the backend DTO records
  format.ts Dates, byte sizes, Cloudinary transformation URLs
```

## How the pieces fit

**Public pages** are Server Components fetching with `revalidate: 60`, so they're served
static and refresh in the background — a gallery edit shows up within the minute without a
redeploy. If the API is unreachable the pages still render, minus the gallery menu.

**Admin pages** are Client Components. `AdminShell` redirects unauthenticated visitors, but
that is a UI convenience, **not** the security boundary — every admin endpoint is enforced by
Spring Security, so bypassing the guard yields an empty page and a pile of 401s.

**Uploads** never pass through either server:

1. `POST /api/admin/media/upload-signature` → Spring signs with the Cloudinary secret
2. Browser POSTs the file straight to Cloudinary with that signature
3. Cloudinary returns URL, public ID and dimensions
4. `POST /api/admin/media` persists the metadata

Files upload one at a time — dropping 40 exports would otherwise open 40 connections at once.

**Images** go through `next/image` with Cloudinary transformations injected into the URL
(`f_auto,q_auto,w_…`), so a 4000px original is never sent behind a 600px thumbnail. Video
posters use `so_0` to pull a still frame, which keeps the film grid from loading tens of
megabytes before anyone presses play.

## Tailwind 4 notes

Config is CSS-first — design tokens live in the `@theme` block in `src/app/globals.css`,
there is no `tailwind.config.js`. Two renames that bite when following older tutorials:

- `bg-gradient-to-*` → `bg-linear-to-*`
- fractional spacing like `translate-x-4.5` is **not** in the scale and emits nothing silently
