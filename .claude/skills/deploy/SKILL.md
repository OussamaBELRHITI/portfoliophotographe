---
name: deploy
description: Pull the latest version and redeploy the portfolio on this server (Docker Compose, plain HTTP on the bare IP), then run the regression tests. Use when asked to "deploy", "déployer", "puller la dernière version", "mettre en prod", "redéployer", or after merging changes that must go live.
---

# Deploy

Run `./scripts/deploy.sh` from the repo root (or `./scripts/deploy.sh --no-pull` to redeploy the
working tree as is). It pulls, backs up the DB, builds, restarts, fixes the media volume
ownership and finishes with the TNR (`scripts/tnr.py`, see the `tnr` skill). Read its output; do
not report success unless the TNR line says `0 KO`.

Before running it, run `git fetch && git diff --stat HEAD @{u}` and look at what is coming. The
sections below cover the changes the script cannot handle by itself.

## This server's setup (uncommitted on purpose — never commit or discard it)

- `docker-compose.override.yml` + `Caddyfile.http`: serve plain HTTP on the bare IP (no domain
  yet). The override mounts `Caddyfile.http` instead of `Caddyfile`, sets
  `STORAGE_PUBLIC_URL: /media` (relative, so media links survive an IP change) and
  `SITE_URL: http://${DOMAIN}`.
- Local edits to tracked files (`docker-compose.yml`, frontend `site.ts`/`SITE_URL` logic…).
- `scripts/update-ip.sh` refreshes `DOMAIN` in `.env` when the EC2 public IP changes.

The script stashes the tracked edits around `git pull` and pops them back. On a conflict it stops:
resolve it by keeping **both** the upstream feature and the local server behaviour, `git add` the
file, `git restore --staged .`, `git stash drop`, then `./scripts/deploy.sh --no-pull`.

**When upstream changes `Caddyfile`, mirror the change in `Caddyfile.http`**: the server does not
read `Caddyfile`. Same for new env vars in `docker-compose.yml` that embed `https://${DOMAIN}`:
override them in `docker-compose.override.yml` (http, or relative).

## Disk (6.7 GB root — the main failure cause)

- Never `docker compose up -d --build` both images at once: it fills the disk mid-build
  (`no space left on device`, or Maven `dependency:go-offline` exit 1). The script builds one
  image at a time and prunes the build cache (`docker builder prune -af`) in between.
- Need ~2 GB free before a build. If short: `docker builder prune -af && docker image prune -f`.
  Never prune volumes (`pgdata`, `media` hold the real data).

## Schema changes (Hibernate `ddl-auto: update`)

Hibernate adds columns but never renames them, and cannot add a `NOT NULL` column to a table that
has rows. Symptom: API returns 500, backend log shows `Error executing DDL ... contains null
values` or `column ... does not exist`. The script warns when it sees this.

Fix by hand, after the script's DB dump (`backups/db-*.sql`):
```bash
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN;
ALTER TABLE media RENAME COLUMN old_name TO new_name;   -- prefer renames: no data loss
COMMIT;
SQL
docker compose restart backend
```
Compare the entity diff (`git diff <old>..<new> -- backend/src/main/java/**/entity/`) with
`\d <table>` to find what to rename. Precedent: the Cloudinary → local storage switch renamed
`media.cloudinary_url` → `url`, `cloudinary_public_id` → `storage_key` and the unique constraint
`uk_media_cloudinary_public_id` → `uk_media_storage_key`. Legacy rows keep their Cloudinary URLs
and still display. Ask the user before any destructive migration (DROP, UPDATE of existing data).

## Media storage

Uploads are written by the backend to the `media` volume (`/data/media`, user `spring`) and
served by Caddy at `/media/*` (read-only mount). If uploads fail with a permission error:
`docker compose exec -T -u root backend chown spring:spring /data/media` (the script does it).

## After deploying

- Report the TNR result faithfully (counts and every KO).
- The TNR do not drive the admin UI in a browser (in-browser WebP conversion, video poster
  capture, drag and drop). Remind the user to try one photo + one video upload at
  `http://<IP>/admin/media` after a release that touches upload code.
- Rollback: `git checkout <previous-commit>` then `./scripts/deploy.sh --no-pull`; restore the DB
  if needed with `docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/<dump>.sql`
  (into an emptied schema — confirm with the user first).
