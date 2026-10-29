---
name: tnr
description: Run the non-regression tests (TNR) on every feature of the deployed portfolio — public site, public API, security, admin galleries, media upload/storage, settings, account — and report the results. Use when asked for "TNR", "tests de non-régression", "tester toutes les fonctionnalités", "vérifier que tout marche", or after any deploy or change.
---

# TNR — tests de non-régression

```bash
python3 scripts/tnr.py                 # against http://localhost (Caddy)
python3 scripts/tnr.py http://<IP>     # against another address
```

Admin credentials come from `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`), or `TNR_USER` /
`TNR_PASSWORD` if the admin changed them in the dashboard. Exit code 0 means everything passed.

## What it does

Runs against the live stack, no mocks. It creates only data prefixed `tnr-` / `TNR`, deletes it
at the end (even on failure), and restores the site settings and gallery order exactly. Covered:

| Section | Checks |
|---|---|
| Pages publiques | every page and gallery (`/work/<slug>`, `/videos/<slug>`), sitemap, robots, OG image, 404s, home sections |
| API publique | every `/api/public/*` route, unknown slug 404, legacy Cloudinary images still reachable |
| Sécurité | 401 on every admin route without/with a bad token, login errors, CORS, `/media` path traversal |
| Admin : catégories | create, duplicate/invalid slug, auto slug, edit, hide/show (API **and** page 404), reorder |
| Admin : médias | upload photo + thumbnail + video + poster, Caddy serving + immutable cache, register, double register 409, public visibility, hide, featured, reorder, detach/refile, delete removes files from disk, delete a legacy Cloudinary row |
| Réglages / Compte | settings round-trip shown publicly then restored; account validation and no-op update |

## Reporting

- Give the exact count (`N/M OK, K KO`) and explain every KO: cause, impact, whether it is a
  regression from the last change or a pre-existing defect. Never round "165/167" up to "all OK".
- Always state what the TNR do **not** cover: the admin UI in a real browser (client-side WebP
  conversion, video poster capture, drag and drop, the upload progress). Suggest a manual photo +
  video upload at `/admin/media`, or drive it with the browser tools if available.
- After a run, confirm nothing was left behind if anything crashed:
  ```bash
  docker compose exec -T db sh -c 'psql -tA -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) from categories where slug like '\''tnr-%'\''" -c "select count(*) from media where title like '\''TNR%'\'' or storage_key like '\''%tnr%'\''"'
  ```

## Extending

When a feature is added or a bug is fixed, add a check to `scripts/tnr.py` in the matching
section (`expect(name, method, path, status, ...)` for an HTTP status, `check(name, cond, detail)`
for anything else) and register cleanup for anything it creates (`cleanup.append(...)`).

## Known pitfalls (already fixed — keep the tests that guard them)

- A `loading.tsx` wraps its segment **and all children**: one at `app/(site)/work/` made
  `/work/<slug>` stream and answer 200 instead of 404. The index skeleton now lives in
  `work/(index)/`. Never add a `loading.tsx` above a route that calls `notFound()`.
- Next's fetch cache never stores an error response, so a `revalidate`d fetch that starts
  returning 404/204 keeps serving its last 200 forever. That kept deleted/hidden galleries
  online. `publicApi.category()` and `publicApi.hero()` are therefore `no-store`; any new public
  call that can return 404/204 must be too.
- New categories default to hidden: pass `"visible": true` when a test needs them public.
