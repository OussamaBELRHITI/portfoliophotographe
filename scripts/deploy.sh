#!/usr/bin/env bash
# Pulls the latest main and redeploys this server, then runs the regression suite.
#
#     ./scripts/deploy.sh            # pull + build + restart + TNR
#     ./scripts/deploy.sh --no-pull  # redeploy the working tree as it is
#
# Written for this box's constraints:
#   - the root disk is ~6.7 GB, so the backend and web images are built one at a time with the
#     build cache pruned in between (building both at once fills the disk mid-build);
#   - the server-only config (docker-compose.override.yml, Caddyfile.http, local edits to tracked
#     files) is uncommitted, so it is stashed around the pull and reapplied;
#   - the database is dumped before anything restarts, since Hibernate runs `ddl-auto: update`
#     and a renamed column needs a manual migration (see .claude/skills/deploy/SKILL.md).

set -euo pipefail
cd "$(dirname "$0")/.."

pull=1
[ "${1:-}" = "--no-pull" ] && pull=0

say() { printf '\n==> %s\n' "$*"; }
prune() { docker builder prune -af >/dev/null; docker image prune -f >/dev/null; }

if [ "$pull" = 1 ]; then
  say "Pull origin/main"
  git fetch origin
  if [ -z "$(git log --oneline HEAD..@{u})" ]; then
    echo "Already up to date."
  else
    git log --oneline HEAD..@{u}
    stashed=0
    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
      git stash push -m "deploy.sh $(date +%F-%H%M)" >/dev/null && stashed=1
    fi
    git pull --ff-only
    if [ "$stashed" = 1 ] && ! git stash pop; then
      echo "!! Conflict reapplying local server changes. Resolve, 'git stash drop', then rerun with --no-pull." >&2
      exit 1
    fi
  fi
fi

say "Validate compose config"
docker compose config >/dev/null

say "Back up the database"
mkdir -p backups
dump="backups/db-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$dump"
ls -lh "$dump"
# Keep the ten most recent dumps.
ls -1t backups/db-*.sql 2>/dev/null | tail -n +11 | xargs -r rm --

say "Build images one at a time (disk: $(df -h / | awk 'NR==2{print $4}') free)"
prune
docker compose build backend
prune
docker compose build web
prune

say "Restart"
docker compose up -d
prune

# A media volume created before the Dockerfile owned /data/media is root-owned, and uploads fail.
docker compose exec -T -u root backend chown spring:spring /data/media

say "Wait for health"
for _ in $(seq 1 30); do
  unhealthy="$(docker compose ps -a --format '{{.Service}} {{.Status}}' | grep -E 'starting|unhealthy|Exited|Restarting' || true)"
  [ -z "$unhealthy" ] && break
  sleep 3
done
docker compose ps --format 'table {{.Service}}\t{{.Status}}'

if docker compose logs backend --since 2m 2>&1 | grep -q "Error executing DDL"; then
  echo "!! Hibernate could not migrate the schema — see the 'Schema changes' section of the deploy skill." >&2
  docker compose logs backend --since 2m 2>&1 | grep -A1 "Error executing DDL" | head -8 >&2
fi

say "Regression tests"
python3 scripts/tnr.py

say "Done — disk: $(df -h / | awk 'NR==2{print $4}') free"
