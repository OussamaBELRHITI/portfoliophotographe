# Deploying to a Hostinger VPS (Docker + HTTPS)

The whole site — database, API, website and dashboard — runs in Docker on one server, behind
Caddy, which gets and renews the HTTPS certificate automatically.

```
                 https://yourdomain.com
                          │
                   Caddy (80 / 443)  ← automatic Let's Encrypt certificate
                    │            │
           /api/*   │            │  everything else
                    ▼            ▼
             backend:8080     web:3000
            (Spring Boot)     (Next.js site + /admin)
                    │
                 db:5432  (Postgres — never exposed to the internet)

Photos and videos are stored on Cloudinary, not on the server.
```

---

## 1. What you need

- A **Hostinger VPS** (KVM 1 — 1 vCPU, 4 GB RAM — is enough). Shared "Web Hosting" plans
  cannot run Docker.
- Ubuntu 22.04 or 24.04 on the VPS, with Docker:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- A domain, with these DNS records at your registrar (or in Hostinger's DNS zone):

  | Type | Name  | Value          |
  |------|-------|----------------|
  | A    | `@`   | your VPS IP    |
  | A    | `www` | your VPS IP    |

  HTTPS only works once these point at the server. Check with `ping yourdomain.com`.
- Cloudinary keys (cloudinary.com → Settings → API Keys) for uploads.

## 2. Copy the project to the server

From your computer, in the folder that contains `photographer-portfolio`. This skips
`node_modules` and build output, which are rebuilt on the server:

```bash
tar --exclude=node_modules --exclude=.next --exclude=target --exclude=.git \
    --exclude='*.tgz' --exclude=said-admin-credentials.txt     -czf portfolio.tgz photographer-portfolio
scp portfolio.tgz root@<VPS-IP>:/opt/
ssh root@<VPS-IP>
cd /opt && tar -xzf portfolio.tgz && mv photographer-portfolio portfolio && cd portfolio
```

> Copied from Windows? If `./setup.sh` says `bad interpreter: ...^M`, run
> `apt install -y dos2unix && dos2unix setup.sh scripts/backup.sh`.

## 3. Configure (once)

Said's dashboard login was generated in advance and is in `said-admin-credentials.txt` on
your computer (never uploaded). Pass it to the script, copying the exact line from that file:

```bash
chmod +x setup.sh scripts/backup.sh
ADMIN_USERNAME='said_xxxxxx' ADMIN_PASSWORD='...' ./setup.sh
```

It asks for your domain and Cloudinary keys, then writes `.env` with a freshly generated
database password and JWT secret, and Said's login. (Run plain `./setup.sh` instead and it
generates a strong username and password itself and prints them once — write them down.) It also adds 2 GB of swap if the server has none (the build needs it on 4 GB).

## 4. Start

```bash
docker compose up -d --build
```

The first build takes 5–10 minutes. Then:

```bash
docker compose ps                    # all services "running" / "healthy"
curl -I https://yourdomain.com       # HTTP/2 200
```

Open `https://yourdomain.com/admin` and sign in with Said's login from step 3, check it works,
then give it to Said. He can change it any time under **Account** in the dashboard. Finally
fill in **Settings** (portrait, bio, contact).

## 5. Firewall

Only SSH, 80 and 443 should be open:

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

The database has no published port, and the website/API ports are bound to `127.0.0.1`, so
nothing else is reachable from outside even without the firewall.

---

## Server already runs Caddy (e.g. next to hulmluxury)

If another site on the same VPS already uses ports 80/443, the bundled Caddy can't start.
`setup.sh` detects this automatically and turns it off (`COMPOSE_PROFILES=` empty in `.env`).
Add this to the existing `/etc/caddy/Caddyfile` instead, then `systemctl reload caddy`:

```
yourdomain.com {
    handle /api/* {
        reverse_proxy 127.0.0.1:8180
    }
    handle {
        reverse_proxy 127.0.0.1:3100
    }
}
www.yourdomain.com {
    redir https://yourdomain.com{uri} permanent
}
```

Ports 3100/8180 were chosen so they don't clash with the other site's 3000/8000.

---

## Backups — set up the same day

Photos are safe on Cloudinary; the database (galleries, order, bio, settings) is what needs
backing up.

```bash
crontab -e
# every night at 03:15
15 3 * * * /opt/portfolio/scripts/backup.sh >> /var/log/portfolio-backup.log 2>&1
```

Backups go to `/var/backups/portfolio`, 14 days kept. Restore one with:

```bash
gunzip -c /var/backups/portfolio/db-2026-10-15.sql.gz \
  | docker compose exec -T db psql -U portfolio -d photographer_portfolio
```

## Updating the site

Copy the new code over (same `tar`/`scp` as step 2, **keeping the server's `.env`**), then:

```bash
docker compose up -d --build
docker image prune -f      # now and then, to free disk space
```

## Changing the domain

Edit `DOMAIN` in `.env`, then `docker compose up -d --build`. The `--build` is required: the
address is compiled into the website's JavaScript.

## Forgot the dashboard password

`ADMIN_PASSWORD` only creates the account on the very first start. To reset it, delete the
account and let it be recreated from `.env`:

```bash
nano .env    # set a new ADMIN_PASSWORD
docker compose exec db psql -U portfolio -d photographer_portfolio -c "delete from admin_users;"
docker compose restart backend
```

## Useful commands

```bash
docker compose logs -f backend     # API logs
docker compose logs -f web         # website logs
docker compose logs caddy          # certificate problems show up here
docker compose restart web
```
