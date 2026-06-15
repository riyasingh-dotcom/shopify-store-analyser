# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **pnpm** for everything — the project deploys with pnpm and has a `pnpm-lock.yaml`.

```bash
pnpm dev              # Start dev server at http://localhost:3000
pnpm build            # Production build (type-check + lint + Next.js compiler)
pnpm lint             # ESLint only
npx tsc --noEmit      # Type-check without building
pnpm db:push          # Push schema changes — sources .env.local automatically
pnpm db:migrate       # Create and apply a named migration
pnpm db:studio        # Open DB browser UI
pnpm db:generate      # Regenerate Prisma client after schema changes
```

**Docker:**

```bash
docker compose up --build                        # App only (uses cloud DB from .env.local)
docker compose --profile local-db up --build     # App + local Postgres
docker compose down -v                           # Stop and delete the postgres_data volume
```

There are no tests in this project.

## Environment Variables

Copy `.env.example` to `.env.local`. The app enters **mock mode** automatically when either `SHOPIFY_STORE_DOMAIN` or `SHOPIFY_ADMIN_ACCESS_TOKEN` is absent.

| Variable | Required | Notes |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | No† | e.g. `my-store.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | No† | From Shopify Admin or the OAuth callback |
| `SHOPIFY_API_KEY` | No‡ | Only for the one-time OAuth flow at `/api/auth/callback` |
| `SHOPIFY_API_SECRET` | No‡ | Only for the OAuth flow |
| `GROQ_API_KEY` | Yes | Required for store analysis and Product Optimiser |
| `DATABASE_URL` | Yes | Use the pooled connection string (Neon/Supabase) |
| `DIRECT_URL` | Yes | Direct (non-pooled) connection — used by Prisma migrations |

† Both must be set together for live mode; omit either to use mock data.
‡ Only needed for the initial access-token exchange.

## Architecture

### Next.js Version

This project runs **Next.js 16.2.7** with React 19. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

### Data Flow — Store Data

```
app/layout.tsx  (async RSC)
  └── getStoreDataCached()   ← React.cache() wrapper — one Shopify call per navigation
        └── services/shopify.ts
              └── lib/shopify/api.ts → lib/shopify/client.ts → Shopify Admin GraphQL API (v2025-01)

app/**/page.tsx  (also calls getStoreDataCached — gets the memoised result, no extra fetch)
```

Every page exports `dynamic = 'force-dynamic'` to opt out of static rendering.

**`lib/shopify/client.ts`** — `shopifyFetch<T>()`: raw GraphQL wrapper, returns `{ data, error }`, never throws. `isMockMode()` is true when credentials are absent.

**`lib/shopify/api.ts`** — `getShopInfo`, `getProducts`, `getOrders`: typed callers with cursor-based pagination (up to 250 per batch). Return mock data silently in mock mode; throw with a descriptive message in live mode. `flattenProduct()` converts Shopify's connection shape (edges/node) into the plain `Product` type.

**`lib/shopify/cached.ts`** — `getStoreDataCached = cache(getStoreData)`. Always import this instead of `getStoreData` directly in server components.

**`lib/analytics.ts`** — Pure functions that compute `StoreMetrics` from raw products/orders arrays. Uses a `safeFloat()` helper to guard all `parseFloat` calls against NaN.

### AI Entry Points

There are two independent Groq routes — both use the OpenAI-compatible SDK pointed at `https://api.groq.com/openai/v1`, model `llama-3.3-70b-versatile`.

#### 1. Store Analysis — `POST /api/analyse`

1. CSRF guard: rejects if `X-Requested-With: XMLHttpRequest` is missing.
2. Fetches store data, builds a plain JSON summary object.
3. Streams an **NDJSON** response (`text/plain`) token-by-token via `ReadableStream`:
   - Line 1: `{ "overallScore": <1-10>, "summary": "..." }`
   - Lines 2–5: `{ "insight": { category, title, finding, recommendation, priority } }`
   - Last line: `{ "quickWins": ["...", "...", "..."] }`
4. Accumulates full text in memory; after `controller.close()` calls `persistAnalysis()` to write `StoreAnalysis` + `ShopifySnapshot` to DB. Failure is non-fatal.

`GET /api/analyse/latest` returns the most-recent `StoreAnalysis` row, used by `StreamingAnalysis` on mount to avoid re-running the AI immediately.

#### 2. Product Optimiser — `POST /api/products/suggest`

1. CSRF guard: checks both `X-Requested-With` and `Origin` vs `Host`.
2. **Zod validation** via `SuggestBodySchema` — validates the full `Product` + `ProductAuditResult` shape. Returns `400 { error, issues }` on failure.
3. Builds a field-level directive prompt: passing fields get `RETURN UNCHANGED`, failing checks get `FIX THESE FAILURES` with point values.
4. Streams a **Server-Sent Events** response (`text/event-stream`) — raw tokens as `data:` events, a `score` event after persistence, and a `[DONE]` sentinel.
5. After the stream closes: `sanitizeHtml()` on AI-generated HTML, re-runs `auditProduct()` to compute `expectedScore`, persists to `ProductSuggestion`.

Both routes retry Groq up to 2 times on 429/5xx with exponential backoff (600 ms, 1 200 ms).

### Product Audit System

**`lib/audit/productAudit.ts`** — pure, synchronous function `auditProduct(product)`. Runs 17 checks across 5 categories:

| Category | Max | Key checks |
|---|---|---|
| Title | 25 | Length 20–70 chars, no generic prefix, has descriptor, no ALL CAPS |
| Description | 25 | >150 chars, >300 chars, 2+ paragraphs, no placeholder text |
| SEO | 25 | SEO title set + 30–60 chars, SEO description set + 120–160 chars |
| Media | 15 | Has image, featured image has alt text |
| Metadata | 10 | 2+ tags, vendor set, product type set |

Returns `{ totalScore, grade (A–F), checks[], categoryScores }`. Also exports `computeChecksHash()` — a stable string of `id:bool` pairs used to skip re-runs with identical audit state.

`lib/sanitizeHtml.ts` strips unsafe HTML from AI-generated descriptions before storage.

### `StreamingAnalysis` Component

`components/StreamingAnalysis.tsx` manages the store analysis UI:
- Module-level `analysisCache` and `cachedAt` survive client-side navigation; only cleared on explicit Regenerate.
- On mount, fetches `/api/analyse/latest` to hydrate from last saved analysis.
- Parses NDJSON progressively via `isInsight()` / `isValidAnalysis()` type guards; malformed lines are skipped.
- Insight cards: sorted high → medium → low. Orphan layout: 1 orphan spans 3 columns; 2 orphans use a 2-col sub-grid.

### Database Models

Four Prisma models in `prisma/schema.prisma`:

- **`StoreAnalysis`** + **`ShopifySnapshot`** (1:1) — store health analysis with a point-in-time snapshot of metrics.
- **`ProductAuditLog`** — audit results per product, with a `checksHash` for deduplication.
- **`ProductSuggestion`** — Groq-generated rewrites with original/improved values side by side and an `expectedScore` from re-auditing.

**Critical for Vercel deployment:** `schema.prisma` must keep `binaryTargets = ["native", "rhel-openssl-3.0.x"]` and `next.config.ts` must keep `serverExternalPackages: ['@prisma/client']`. Removing either breaks Prisma on Vercel's Lambda.

`prisma.config.ts` must NOT import `dotenv` — it runs during `prisma generate` on Vercel where dotenv is not available.

### Sidebar / Layout

The persistent sidebar lives in `app/layout.tsx` — this keeps it mounted across client-side navigations. `SidebarContext.tsx` provides `{ isOpen, toggle, close }`. `MobileMenuButton.tsx` renders the hamburger/X inside each page's sticky header.

### Styling

Tailwind v4 with PostCSS. No `tailwind.config.js` — all configuration is CSS-first in `globals.css`. A global `@media (prefers-reduced-motion: reduce)` block disables `animate-pulse`, `animate-bounce`, and `animate-spin`.

### Type System

- `types/shopify.ts` — `Product`, `Order`, `StoreData`, `StoreMetrics`, `ProductImage`, `ProductVariant`, `ProductSeo`
- `types/analysis.ts` — `StoreAnalysis`, `Insight`, `InsightCategory`, `InsightPriority`
- `types/suggestions.ts` — `ProductSuggestion` (shared between the API route and `ProductSuggestions` client component — import from here, not either consumer)
- `lib/audit/productAudit.ts` — `ProductAuditResult`, `ProductAuditCheck`, `AuditCategory`, `AuditGrade`

### Docker Notes

- `docker-entrypoint.sh` runs `prisma db push --accept-data-loss` on every startup. Switch to `prisma migrate deploy` for production.
- Inside containers, Postgres is reachable via the service name `db`, not `localhost`.
- `.env.local` is never baked into the image — injected at runtime via `env_file`.
