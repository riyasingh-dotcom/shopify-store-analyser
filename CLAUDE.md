# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **pnpm** for everything — the project deploys with pnpm and has a `pnpm-lock.yaml`.

```bash
pnpm dev              # Start dev server at http://localhost:3000
pnpm build            # Production build (type-check + lint + Next.js compiler)
pnpm start            # Start the production server (after pnpm build)
pnpm lint             # ESLint only
npx tsc --noEmit      # Type-check without building
pnpm db:push          # Push schema changes — sources .env.local automatically
pnpm db:migrate       # Create and apply a named migration
pnpm db:studio        # Open DB browser UI
pnpm db:generate      # Regenerate Prisma client after schema changes
```

**Docker:**

```bash
# Production (app only, connects to cloud DB from .env.local)
docker compose up --build

# Dev with hot-reload (bind-mounts src/, builds to deps stage only)
docker compose -f docker-compose.dev.yml up --build

# Dev + local Postgres (profile-gated)
docker compose -f docker-compose.dev.yml --profile local-db up --build

# Wipe local Postgres volume
docker compose -f docker-compose.dev.yml down -v
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
| `GROQ_API_KEY` | Yes | Required for store analysis, Product Optimiser, and Orders Analysis |
| `DATABASE_URL` | Yes | Use the pooled connection string (Neon/Supabase) |
| `DIRECT_URL` | Yes | Direct (non-pooled) connection — used by Prisma migrations |
| `AUTH_SECRET` | Yes | Signs/encrypts Auth.js JWT sessions — pass explicitly in `NextAuth({ secret })` |
| `ADMIN_EMAIL` | Yes | Single admin credential checked in `src/auth.ts` |
| `ADMIN_PASSWORD` | Yes | Single admin credential checked in `src/auth.ts` |

† Both must be set together for live mode; omit either to use mock data.
‡ Only needed for the initial access-token exchange.

## Architecture

### Source Layout

All application code lives under `src/`. The TypeScript path alias `@/*` maps to `./src/*` — always use `@/` imports, never relative paths that cross feature boundaries.

### Routes

| Route | Purpose |
|---|---|
| `/login` | Auth.js credentials login — public, redirects to `/` if already signed in |
| `/` | Overview dashboard — KPI cards + `StreamingAnalysis` |
| `/products` | Products table with audit scores + `BulkOptimise` controller |
| `/products/[id]` | Product detail — audit breakdown + `ProductSuggestions` SSE stream |
| `/products/[id]/history` | Per-product suggestion history |
| `/orders` | Orders intelligence — revenue metrics, AI analysis, charts, paginated top products |
| `/history` | Store analysis history (20 most recent) |
| `/history/[id]` | Individual analysis detail |

The app uses two route groups:
- `(auth)` — unauthenticated routes (`/login`)
- `(dashboard)` — all main routes; `(dashboard)/layout.tsx` renders `TopNav` and passes the user session

### Next.js Version

This project runs **Next.js 16.2.7** with React 19. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

### Authentication

`next-auth@5.0.0-beta.31` (Auth.js v5) with credentials strategy. All routes except `/login` and `/api/auth/*` are protected by `src/middleware.ts`.

- **`src/auth.ts`** — `NextAuth` config: credentials provider checks `ADMIN_EMAIL` / `ADMIN_PASSWORD`, JWT strategy, `secret` passed explicitly to avoid env-detection issues on Vercel.
- **`src/middleware.ts`** — Auth guard: unauthenticated requests are redirected to `/login?callbackUrl=...`; authenticated users visiting `/login` are sent to `/`.
- **`src/app/actions/auth.ts`** — Server actions: `signInAction` (useActionState-compatible, re-throws NEXT_REDIRECT on success), `signOutAction`.
- **`src/app/layout.tsx`** — Root layout fetches session and passes it to `SessionProviderWrapper` so client components can call `useSession()`.

### Data Flow — Store Data

```
app/layout.tsx  (async RSC)
  └── (dashboard)/layout.tsx
        └── getStoreDataCached()   ← React.cache() wrapper — one Shopify call per navigation
              └── lib/shopify/service.ts
                    └── lib/shopify/api.ts → lib/shopify/client.ts → Shopify Admin GraphQL API (v2025-01)

app/**/page.tsx  (also calls getStoreDataCached — gets the memoised result, no extra fetch)
```

Every page exports `dynamic = 'force-dynamic'` to opt out of static rendering.

**`lib/shopify/client.ts`** — `shopifyFetch<T>()`: raw GraphQL wrapper, returns `{ data, error }`, never throws. `isMockMode()` is true when credentials are absent.

**`lib/shopify/api.ts`** — `getShopInfo`, `getProducts`, `getOrders`: typed callers with cursor-based pagination (up to 250 per batch). Return mock data silently in mock mode; throw with a descriptive message in live mode. `flattenProduct()` converts Shopify's connection shape (edges/node) into the plain `Product` type. **`getOrdersGraphQL` has no mock mode guard** — it always calls the real Shopify API and will throw (and cause the `/orders` page to show an error) if credentials are absent.

**`lib/shopify/cached.ts`** — `getStoreDataCached = cache(getStoreData)`. Always import this instead of `getStoreData` directly in server components.

**`lib/shopify/service.ts`** — Service layer assembler. `getStoreData()` fans out via `Promise.all` to fetch shop, products, and orders, then computes metrics. `getOrdersData()` is used only by the `/orders` page — calls `getOrdersGraphQL()` (one page, 50 orders, no pagination loop) and returns `{ orders: FlatOrder[]; metrics: RevenueMetrics } | { error: string }`.

**`lib/analysis/store/analytics.ts`** — Pure functions that compute `StoreMetrics` from raw products/orders arrays.

**`lib/analysis/orders/orders.ts`** — Pure order-processing utilities. `FlatOrder.createdAt` and `updatedAt` are ISO strings (not `Date` objects) — use `new Date(o.createdAt)` when you need a `Date`. Key exports: `flattenOrders()`, `calculateRevenueMetrics()`, `getRevenueByDay()`, `getOrdersByStatus()`, `getOrdersByFulfilmentStatus()`, `getTopProductsByRevenue()`, `getRepeatCustomerRate()`.

**`lib/analysis/orders/ordersSummary.ts`** — `buildOrdersSummary(orders: FlatOrder[]): string` builds the plain-text LLM prompt for the orders AI route. Sections: time period, revenue, financial status, fulfilment status, top 5 products, customer retention, notable flags (unfulfilled >20%, discount rate >25%, single product >50% of revenue).

### AI Entry Points

All three Groq routes use the OpenAI-compatible SDK pointed at `https://api.groq.com/openai/v1`, model `llama-3.3-70b-versatile`. All retry Groq up to 2 times on 429/5xx with exponential backoff (600 ms, 1 200 ms).

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

#### 3. Orders Analysis — `POST /api/orders/analyse`

1. CSRF guard: checks both `X-Requested-With` and `Origin` vs `Host`.
2. **Zod validation** via `OrdersBodySchema` — mirrors the full `FlatOrder` shape including nested `FlatLineItem[]` and nullable `FlatCustomer`. Returns `400` on failure.
3. Calls `buildOrdersSummary(orders)` to build the LLM prompt, then streams a **Server-Sent Events** response with raw tokens and a `[DONE]` sentinel.
4. Response JSON schema: `{ overallHealthScore (1-10), categories [4 items], topPriority, positives (2-3) }`. Categories: `Revenue Health | Fulfilment Performance | Product Mix | Customer Quality`.
5. `max_tokens: 2048` — required because 4 verbose categories easily exceed 1024.
6. After `[DONE]`, persists to `OrdersAnalysis` via `persistOrdersAnalysis()` (non-fatal). Also stores a `metricsSnapshot` (built by `buildOrdersAnalysisSnapshot()` in `lib/analysis/orders/ordersSummary.ts`) capturing the exact metrics sent to the LLM.

**`lib/analysis/orders/ordersAnalysisDb.ts`** — DB helpers: `persistOrdersAnalysis()`, `getLatestOrdersAnalysis()`, `getOrdersAnalysisHistory(limit)`. All three apply `normaliseStatus()` on read because Groq occasionally returns synonyms (`"adequate"`, `"strong"`, `"needs work"`) that aren't in the `CategoryStatus` union — normalization happens at the DB layer, not the client.

The client component `components/orders/OrdersAnalysis.tsx` accumulates SSE tokens until `[DONE]`, then parses with `parseOrdersAnalysis()`. That parser normalises LLM status deviations and coerces numeric `metric` values to strings. The component uses a module-level `analysisCache` so results survive client-side navigation; analysis is **not** triggered on mount — users click "Generate Analysis" manually. A **History dropdown** in the result header lets users switch between the 10 most recent analyses (eagerly loaded at page render via `getOrdersAnalysisHistory(10)`) without extra API calls.

### Product Audit System

**`lib/analysis/products/productAudit.ts`** — pure, synchronous function `auditProduct(product)`. Runs 17 checks across 5 categories:

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

Five Prisma models in `prisma/schema.prisma`:

- **`StoreAnalysis`** + **`ShopifySnapshot`** (1:1) — store health analysis with a point-in-time snapshot of metrics.
- **`ProductAuditLog`** — audit results per product, with a `checksHash` for deduplication.
- **`ProductSuggestion`** — Groq-generated rewrites with original/improved values side by side and an `expectedScore` from re-auditing.
- **`OrdersAnalysis`** — persisted orders AI results (`analysisJson Json`, `metricsSnapshot Json?`). Indexed by `generatedAt desc`. `metricsSnapshot` is nullable because older records predate the field.

**Critical for Vercel deployment:** `schema.prisma` must keep `binaryTargets = ["native", "rhel-openssl-3.0.x"]` and `next.config.ts` must keep `serverExternalPackages: ['@prisma/client']`. Removing either breaks Prisma on Vercel's Lambda.

`prisma.config.ts` must NOT import `dotenv` — it runs during `prisma generate` on Vercel where dotenv is not available.

**Prisma client location:** `pnpm db:generate` outputs the client to `src/generated/prisma/` (non-standard). Import from `@/generated/prisma` not from `@prisma/client`.

### Layout

- **`app/layout.tsx`** — Root layout. Fetches session and wraps children in `SessionProviderWrapper` so client components can call `useSession()`.
- **`app/(dashboard)/layout.tsx`** — Dashboard shell. Fetches store data + session, renders `TopNav` with both. All dashboard pages inherit this layout.
- **`app/(auth)/login/page.tsx`** — Login page. Uses `LoginForm` client component with `useActionState` + `signInAction`.

### Styling

Tailwind v4 with PostCSS. No `tailwind.config.js` — all configuration is CSS-first in `globals.css`. A global `@media (prefers-reduced-motion: reduce)` block disables `animate-pulse`, `animate-bounce`, and `animate-spin`.

### Type System

- `types/shopify.ts` — `Product`, `Order`, `StoreData`, `StoreMetrics`, `ShopInfo`, `ProductImage`, `ProductVariant`, `ProductSeo`, `GraphQLOrder`
- `types/analysis.ts` — `StoreAnalysis`, `Insight`, `InsightCategory`, `InsightPriority`
- `types/suggestions.ts` — `ProductSuggestion` (shared between the API route and `ProductSuggestions` client component — import from here, not either consumer)
- `types/ordersAnalysis.ts` — `OrdersAnalysisResult`, `OrdersAnalysisSnapshot`, `OrdersAnalysisHistoryItem`, `AnalysisCategory`, `CategoryStatus`, `CategoryName`
- `lib/analysis/products/productAudit.ts` — `ProductAuditResult`, `ProductAuditCheck`, `AuditCategory`, `AuditGrade`
- `lib/analysis/orders/orders.ts` — `FlatOrder`, `FlatLineItem`, `FlatCustomer`, `RevenueMetrics`, `ProductRevenueEntry`, `DailyRevenue`, `RepeatCustomerRate`
- `lib/shopify/queries.ts` — GraphQL query strings (`SHOP_QUERY`, `PRODUCTS_QUERY`, `ORDERS_QUERY`, `ORDERS_DETAIL_QUERY`). The detail query fetches line items needed for the orders dashboard; the basic query is used for the overview.
- `lib/shopify/utils.ts` — `extractNumericId(gid: string): string` strips the Shopify GID prefix (e.g. `"gid://shopify/Product/12345"` → `"12345"`).

### Docker Notes

- `docker-entrypoint.sh` runs `prisma db push --accept-data-loss` only when `DATABASE_URL` contains `@db:` or `@localhost:` (local Postgres). Cloud databases (Neon, Supabase) are detected by URL and skipped — apply migrations manually via `pnpm db:push`.
- Inside containers, Postgres is reachable via the service name `db`, not `localhost`.
- `.env.local` is never baked into the image — injected at runtime via `env_file`.

### GitHub Actions Workflows

Two workflows live in `.github/workflows/`:

| File | Trigger | Job | Purpose |
|---|---|---|---|
| `ci.yml` | `push` + `pull_request` → `main` | `quality-check` | Type-check (`pnpm tsc --noEmit`) then full production build (`pnpm build`) |
| `lint.yml` | `pull_request` → `main` | `lint` | ESLint check (`pnpm lint`) — runs independently so lint and build failures are reported separately |

**Both workflows share the same setup sequence:** checkout → Node 22 → corepack pnpm → cache pnpm store (keyed on `pnpm-lock.yaml` hash) → `pnpm install --frozen-lockfile`.

**`ci.yml` also runs `pnpm prisma generate`** before the type-check so the generated Prisma types in `src/generated/prisma/` are available to the TypeScript compiler.

**Secrets required by `ci.yml` build step** (configure in repo Settings → Secrets and variables → Actions):

| Secret | Why needed at build time |
|---|---|
| `AUTH_SECRET` | NextAuth reads during config initialisation |
| `NEXTAUTH_URL` | NextAuth uses to construct redirect URLs |
| `DATABASE_URL` | Prisma client validates the URL on import |
| `GROQ_API_KEY` | Referenced in API route modules |
| `SHOPIFY_STORE_DOMAIN` | Controls mock vs live mode detection |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Paired with domain for live mode |

Runtime-only secrets (`DIRECT_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`) are **not** needed in CI — they are only accessed when real HTTP requests are handled.
