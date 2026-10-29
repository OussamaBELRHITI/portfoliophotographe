#!/usr/bin/env bash
# Points the site at this server's current public IP. For an AWS instance without an Elastic
# IP, whose address changes every time it is stopped and started.
#
#     sudo ./scripts/update-ip.sh
#
# The site itself keeps working at any address without this (the browser calls /api on
# whatever address it loaded the page from); this only refreshes DOMAIN in .env, which feeds
# the absolute links in the sitemap, robots.txt and share cards. No rebuild — the containers
# are recreated with the new value in a few seconds.
#
# Does nothing when DOMAIN in .env is a real domain name rather than an IP.

set -euo pipefail
cd "$(dirname "$0")/.."

current="$(grep -E '^DOMAIN=' .env | cut -d= -f2-)"
if ! [[ "$current" =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then
  echo "DOMAIN=$current is a domain name, not an IP — leaving it alone."
  exit 0
fi

# EC2 instance metadata (IMDSv2) first; a public echo service as a fallback elsewhere.
token="$(curl -fsS -m 2 -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null || true)"
ip="$(curl -fsS -m 2 -H "X-aws-ec2-metadata-token: $token" \
  http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
[ -n "$ip" ] || ip="$(curl -fsS -m 5 https://checkip.amazonaws.com | tr -d '[:space:]')"

if ! [[ "$ip" =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then
  echo "Could not determine the public IP (got '$ip')." >&2
  exit 1
fi

if [ "$ip" = "$current" ]; then
  echo "IP unchanged: $ip"
  exit 0
fi

sed -i "s/^DOMAIN=.*/DOMAIN=$ip/" .env
docker compose up -d
echo "Site now at http://$ip (was $current)"
