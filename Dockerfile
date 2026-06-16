# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:20-alpine AS base
# openssl: Prisma engine TLS; ca-certificates: Node fetch to Shopify/Groq APIs
RUN apk add --no-cache openssl ca-certificates
RUN npm install -g pnpm
WORKDIR /app

# ---- Deps ----
# Full install (dev deps included — postinstall runs prisma generate)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Runner ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl ca-certificates
RUN npm install -g pnpm
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install prod deps with a flat layout so the prisma CLI is available for the
# entrypoint migration, and so the flat structure is compatible with the
# standalone node_modules overlay that follows.
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

# Overlay the standalone output. COPY merges directories, so prisma CLI (above)
# survives; standalone wins on any package present in both.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY docker-entrypoint.sh ./

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs && \
    chown -R nextjs:nodejs /app && \
    chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
