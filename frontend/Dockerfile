# Production image for the website and dashboard. Three stages so the final image carries
# only what the server runs: no source, no dev dependencies, no build cache.

# ─── 1. dependencies ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# Copied on their own so this layer is rebuilt only when the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# ─── 2. build ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are compiled into the JavaScript the browser downloads, so they are
# build arguments, not runtime variables. Change them and you must rebuild, not just restart.
# Both must be the PUBLIC https address — never a container name, which only resolves
# inside Docker.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── 3. runtime ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root: if the app is ever compromised, the process cannot write to the image.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `standalone` holds the server and its traced dependencies; Next leaves static assets and
# public/ out of it on purpose, so they are copied next to it by hand.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Hits a real page, so it fails if rendering is broken and not only if the process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
