#!/usr/bin/env bash
# Nightly database backup. Photos and videos live on Cloudinary, so the database (galleries,
# order, settings, bio) is the only thing on this server worth saving.
#
#   crontab -e
#   15 3 * * * /opt/portfolio/scripts/backup.sh >> /var/log/portfolio-backup.log 2>&1
#
# Restore:
#   gunzip -c db-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U portfolio -d photographer_portfolio

set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${BACKUP_DIR:-/var/backups/portfolio}"
KEEP_DAYS=14
mkdir -p "$DEST"

FILE="$DEST/db-$(date +%F).sql.gz"
docker compose exec -T db pg_dump -U portfolio -d photographer_portfolio --clean --if-exists \
  | gzip > "$FILE.tmp"

# A dump that stopped half-way is worse than none: it looks like a backup. Only keep it if the
# archive is valid and actually has content.
gzip -t "$FILE.tmp" && [ "$(gunzip -c "$FILE.tmp" | head -c 1000 | wc -c)" -gt 100 ]
mv "$FILE.tmp" "$FILE"

find "$DEST" -name 'db-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date '+%F %T') backup ok: $FILE ($(du -h "$FILE" | cut -f1))"

# These backups die with the server. Copy them elsewhere too, e.g. with rclone:
#   rclone copy "$DEST" remote:portfolio-backups
