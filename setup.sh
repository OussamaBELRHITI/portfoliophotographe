#!/usr/bin/env bash
# Prepares the server so that `docker compose up -d --build` brings up the whole site.
#
# Run once, on the server, from inside the project folder:
#
#     chmod +x setup.sh && ./setup.sh
#
# To create the dashboard account with a login chosen in advance (said-admin-credentials.txt):
#
#     ADMIN_USERNAME='said_xxxxxx' ADMIN_PASSWORD='...' ./setup.sh
#
# Without them, a strong random username and password are generated and printed once.
# Safe to run again: an existing .env is never overwritten.

set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

command -v docker >/dev/null || {
  echo "Docker is not installed. On Ubuntu:  curl -fsSL https://get.docker.com | sh" >&2
  exit 1
}

if [ -f .env ]; then
  say ".env already exists — keeping it (delete it first if you really want new secrets)."
  exit 0
fi

# ─── domain ──────────────────────────────────────────────────────────────────
read -rp "Domain for the portfolio (e.g. saidphotographer.com): " DOMAIN
# Accept what people actually paste: strip a scheme, a path, a leading www.
DOMAIN="$(printf '%s' "$DOMAIN" | tr -d '[:space:]' | sed -E 's#^[a-zA-Z]+://##; s#/.*$##; s#^www\.##')"
case "$DOMAIN" in
  *.*) : ;;
  *) echo "'$DOMAIN' does not look like a domain." >&2; exit 1 ;;
esac

# ─── proxy mode ──────────────────────────────────────────────────────────────
# If something already listens on 443 (another site's Caddy or nginx), the bundled Caddy
# could not bind it — so leave it off and print the block to add to the existing proxy.
PROFILES="caddy"
if command -v ss >/dev/null && ss -ltn 2>/dev/null | grep -qE '[:.]443\s'; then
  PROFILES=""
  HOST_PROXY=true
fi

# ─── secrets ─────────────────────────────────────────────────────────────────
# Never "admin": a guessable username is half of a guessed login.
if [ -z "${ADMIN_USERNAME:-}" ]; then
  ADMIN_USERNAME="said_$(openssl rand -hex 3)"
fi
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)"
fi
case "$ADMIN_USERNAME" in
  *[!A-Za-z0-9._-]*) echo "ADMIN_USERNAME may only use letters, numbers, dots, dashes, underscores." >&2; exit 1 ;;
esac
if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "ADMIN_PASSWORD must be at least 12 characters." >&2; exit 1
fi

umask 077
cat > .env <<EOF
DOMAIN=$DOMAIN
COMPOSE_PROFILES=$PROFILES
WEB_PORT=3100
API_PORT=8180

POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -base64 32)

ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD='$ADMIN_PASSWORD'
ADMIN_EMAIL=

MAX_UPLOAD_SIZE=512MB
EOF
chmod 600 .env

# ─── swap ────────────────────────────────────────────────────────────────────
# Building Next.js and Maven on a small VPS can run out of memory without swap.
if [ "$(id -u)" = 0 ] && ! swapon --show | grep -q .; then
  say "Adding 2 GB of swap..."
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

chmod +x scripts/backup.sh 2>/dev/null || true

say "Done. .env written."
echo
echo "  Dashboard login (give this to Said):"
echo "    Username: $ADMIN_USERNAME"
echo "    Password: $ADMIN_PASSWORD"
echo "  (write this down now — it is only used to create the account on first start)"
echo
echo "Before starting, make sure DNS points here:"
echo "  A   $DOMAIN       -> this server's IP"
echo "  A   www.$DOMAIN   -> this server's IP"
echo
if [ "${HOST_PROXY:-false}" = true ]; then
  echo "Port 443 is already used by another proxy on this server, so the bundled Caddy"
  echo "is OFF. Add this to /etc/caddy/Caddyfile, then: systemctl reload caddy"
  echo
  echo "  $DOMAIN {"
  echo "      handle /api/* {"
  echo "          reverse_proxy 127.0.0.1:8180"
  echo "      }"
  echo "      handle {"
  echo "          reverse_proxy 127.0.0.1:3100"
  echo "      }"
  echo "  }"
  echo "  www.$DOMAIN {"
  echo "      redir https://$DOMAIN{uri} permanent"
  echo "  }"
  echo
fi
echo "Then start everything:"
echo "  docker compose up -d --build"
