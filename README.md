# Shopify Store Analyser

A full-stack analytics and AI optimisation dashboard for Shopify stores. Built with Next.js 16 App Router, React 19, Prisma, and Tailwind CSS v4. Powered by the Groq API (`llama-3.3-70b-versatile`) for streaming AI analysis, product copy optimisation, and orders intelligence.

---

## Live Demo

> **Demo URL:** _coming soon_ — deploy your own instance by following the [Deployment](#deployment-vercel--database) guide below.

---

## Overview

Shopify Store Analyser connects to a store's Admin GraphQL API to surface key performance metrics — product inventory, order volume, revenue, and fulfilment rates — in a clean, responsive dashboard.

**Store Analysis** — clicking **Regenerate Analysis** streams a structured AI health report directly to the browser as tokens arrive, then persists it to PostgreSQL for trend tracking over time.

**Product Optimiser** — every product is scored across 5 quality dimensions. For any product, Groq streams targeted rewrite suggestions (title, description, SEO fields, tags) that are validated, re-audited for score gain, and saved to the database. A **Bulk Optimise** button processes all low-scoring products sequentially.

**Orders Intelligence** — the `/orders` page surfaces revenue metrics, fulfilment breakdowns, repeat-customer rate, and a daily revenue chart. A Groq-powered analysis streams a structured health report (4 categories, overall score, top priority) and persists to the database with a metrics snapshot. A history dropdown lets users browse the 10 most recent analyses without additional API calls.

The app runs in **mock mode** automatically when no Shopify credentials are configured, making it fully usable for development and portfolio demonstration without a real store.

---

## Features

- **Live KPI cards** — Total Products, Total Revenue, Average Order Value, Fulfilment Rate
- **Streaming store analysis** — Groq streams an NDJSON health report token-by-token; insight cards render progressively as tokens arrive
- **Store health score** — 1–10 score with a label (Critical / Needs Work / Adequate / Strong), visualised as an animated ring dial
- **AI insight cards** — 3–5 categorised insight cards sorted high → medium → low priority, with smart orphan-filling layout
- **Quick wins panel** — 3 immediately actionable steps extracted from the AI response
- **Product Optimiser** — per-product audit scoring (0–100, grade A–F) across Title, Description, SEO, Media, and Metadata; Groq streams copy rewrites with a predicted score delta; suggestions persist to the database
- **Bulk Optimise** — one-click sequential Groq optimisation for all products below a score threshold
- **Product detail + history** — individual product page at `/products/[id]` with full audit breakdown and suggestion history at `/products/[id]/history`
- **Orders Intelligence** — revenue metrics cards, daily revenue chart, financial/fulfilment status breakdowns, top products by revenue, repeat customer rate, and AI-powered orders health analysis
- **Orders AI analysis** — Groq streams a 4-category health report (Revenue Health, Fulfilment Performance, Product Mix, Customer Quality) with overall score and top priority action; persisted with a metrics snapshot; history dropdown for the 10 most recent runs
- **Analysis history** — up to 20 past store analyses browsable in list or grid view, with score, revenue, order, and product deltas vs. the previous run
- **Mock mode** — full UI with realistic demo data when `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` are absent
- **Responsive layout** — mobile-first sidebar with hamburger navigation, all tables adapted for 375 px viewports
- **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` on every response

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router) |
| UI runtime | React 19.2.4 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4, PostCSS (CSS-first config in `globals.css`) |
| Charts | Recharts |
| Fonts | Geist Sans & Geist Mono (`next/font/google`) |
| AI / LLM | Groq Cloud API — `llama-3.3-70b-versatile`, via OpenAI-compatible SDK |
| Streaming | Server-Sent Events (SSE) + `ReadableStream` |
| Database | PostgreSQL (Supabase / Neon), managed via Prisma ORM 6 |
| Icons | Lucide React |
| Package manager | pnpm |
| Linting | ESLint 9, `eslint-config-next` |

---

## Project Structure

```
shopify-store-analyser/
├── Dockerfile                               # Multi-stage production build (base/deps/builder/runner)
├── docker-compose.yml                       # App only — connects to Supabase via .env.local
├── docker-compose.dev.yml                   # Hot-reload dev mode + optional local Postgres
├── docker-entrypoint.sh                     # prisma db push → node server.js
├── prisma.config.ts                         # Prisma config (no dotenv — safe for Vercel generate)
├── next.config.ts                           # standalone output, security headers, serverExternalPackages
├── prisma/
│   └── schema.prisma                        # DB models: StoreAnalysis, ShopifySnapshot,
│                                            #   ProductAuditLog, ProductSuggestion, OrdersAnalysis
└── src/
    ├── app/
    │   ├── layout.tsx                       # Root layout: sidebar + SidebarProvider
    │   ├── page.tsx                         # Overview: KPI cards + streaming analysis
    │   ├── error.tsx / loading.tsx          # Root error boundary + skeleton
    │   ├── globals.css                      # Tailwind v4 CSS-first config
    │   ├── products/
    │   │   ├── page.tsx                     # Paginated products table with audit scores
    │   │   ├── loading.tsx / error.tsx
    │   │   └── [id]/
    │   │       ├── page.tsx                 # Product detail: audit breakdown + suggestions
    │   │       └── history/
    │   │           └── page.tsx             # Per-product suggestion history
    │   ├── orders/
    │   │   ├── page.tsx                     # Orders intelligence dashboard
    │   │   └── loading.tsx / error.tsx
    │   ├── history/
    │   │   ├── page.tsx                     # Store analysis history list (RSC)
    │   │   ├── HistoryClient.tsx            # List/grid toggle, delta badges (client)
    │   │   ├── loading.tsx / error.tsx
    │   │   └── [id]/
    │   │       ├── page.tsx                 # Full analysis detail view
    │   │       └── loading.tsx
    │   └── api/
    │       ├── analyse/
    │       │   ├── route.ts                 # POST: Groq store analysis stream + DB persist
    │       │   └── latest/route.ts          # GET: most recent saved store analysis
    │       ├── orders/
    │       │   └── analyse/route.ts         # POST: Groq orders analysis stream + DB persist
    │       ├── products/
    │       │   └── suggest/route.ts         # POST: Groq product copy suggestions (SSE)
    │       └── auth/callback/route.ts       # Shopify OAuth token exchange (dev tool)
    ├── components/
    │   ├── audit/
    │   │   ├── AuditBreakdown.tsx           # Per-category score breakdown UI
    │   │   ├── ProductSuggestions.tsx       # Streaming suggestion UI + copy buttons
    │   │   └── ScoreBadge.tsx              # Grade badge (A–F)
    │   ├── orders/
    │   │   ├── OrdersAnalysis.tsx           # AI orders analysis: SSE stream, history dropdown
    │   │   ├── RevenueMetrics.tsx           # Revenue KPI cards
    │   │   ├── RevenueChart.tsx             # Daily revenue line chart (Recharts)
    │   │   ├── OrderStatusBreakdown.tsx     # Financial + fulfilment status bars
    │   │   ├── StatusPieChart.tsx           # Pie chart for order status distribution
    │   │   ├── TopProductsTable.tsx         # Top products by revenue (paginated)
    │   │   ├── RepeatCustomerCard.tsx       # Repeat customer rate card
    │   │   └── CustomerInsight.tsx          # Customer quality insights
    │   ├── BulkOptimise.tsx                 # Sequential bulk optimisation controller
    │   ├── StreamingAnalysis.tsx            # Store analysis streaming UI + cache
    │   ├── InsightCard.tsx
    │   ├── StoreScoreCard.tsx               # Ring dial score visualisation
    │   ├── StoreMetrics.tsx                 # KPI stat cards grid
    │   ├── StoreStats.tsx                   # Store-level stats summary
    │   ├── ProductsTable.tsx                # Paginated products table (client)
    │   ├── OrdersTable.tsx                  # Orders table (server)
    │   ├── OrderSummary.tsx                 # Revenue + status breakdown
    │   ├── QuickWins.tsx
    │   ├── CopyButton.tsx                   # One-click copy to clipboard
    │   ├── PageShell.tsx
    │   ├── Sidebar.tsx                      # Navigation (client, uses usePathname)
    │   ├── SidebarContext.tsx               # isOpen / toggle / close context
    │   ├── MobileMenuButton.tsx
    │   └── InsightsSkeleton.tsx / LoadingSkeleton.tsx
    ├── lib/
    │   ├── audit/
    │   │   └── productAudit.ts              # Pure audit logic: 17 checks, scoring, grading
    │   ├── shopify/
    │   │   ├── client.ts                    # shopifyFetch<T>() — returns {data, error}, never throws
    │   │   ├── api.ts                       # getShopInfo / getProducts / getOrders / getOrdersGraphQL
    │   │   ├── queries.ts                   # GraphQL query strings (SHOP, PRODUCTS, ORDERS, ORDERS_DETAIL)
    │   │   ├── cached.ts                    # React.cache() wrapper
    │   │   └── utils.ts
    │   ├── analytics.ts                     # Pure metric computation
    │   ├── orders.ts                        # Order flattening, revenue metrics, top products
    │   ├── ordersAnalysisDb.ts              # DB helpers: persist / getLatest / getHistory
    │   ├── ordersSummary.ts                 # buildOrdersSummary() + buildOrdersAnalysisSnapshot()
    │   ├── sanitizeHtml.ts                  # Strips unsafe HTML from AI-generated content
    │   └── prisma.ts                        # Prisma client singleton
    ├── services/
    │   └── shopify.ts                       # getStoreData() + getOrdersData() assemblers
    └── types/
        ├── shopify.ts                       # ShopInfo, Product, Order, StoreData, StoreMetrics
        ├── analysis.ts                      # StoreAnalysis, Insight, InsightCategory, InsightPriority
        ├── ordersAnalysis.ts                # OrdersAnalysisResult, CategoryStatus, CategoryName
        └── suggestions.ts                   # ProductSuggestion type
```

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm (`npm install -g pnpm`)
- A PostgreSQL database — [Supabase](https://supabase.com) or [Neon](https://neon.tech) (free tier works)
- A Groq API key (free tier at [console.groq.com](https://console.groq.com))
- *(Optional for live data)* A Shopify store with an Admin API token

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/shopify-store-analyser.git
cd shopify-store-analyser
pnpm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Push the database schema:

```bash
pnpm db:push
```

Start the dev server:

```bash
pnpm dev        # http://localhost:3000
```

### Commands

```bash
pnpm dev              # Start dev server at http://localhost:3000
pnpm build            # Production build (type-check + lint + Next.js compiler)
pnpm lint             # ESLint only
npx tsc --noEmit      # Type-check without building
pnpm db:push          # Push schema changes to database
pnpm db:migrate       # Create and apply a named migration
pnpm db:studio        # Open Prisma Studio to inspect the database
pnpm db:generate      # Regenerate Prisma client after schema changes
```

---

## Docker

The project ships a production-optimised multi-stage Dockerfile and two Compose files.

### How the Dockerfile works

| Stage | Base | Purpose |
|---|---|---|
| `base` | `node:20-alpine` | Shared layer — installs `openssl`, `ca-certificates`, and `pnpm` |
| `deps` | `base` | Runs `pnpm install --frozen-lockfile` (all deps — `postinstall` runs `prisma generate`) |
| `builder` | `base` | Copies `node_modules` from `deps`, copies source, runs `pnpm build` → `output: standalone` |
| `runner` | `node:20-alpine` | Installs prod deps only (`--shamefully-hoist` for flat layout), overlays standalone output, drops to non-root user |

The final image contains only the standalone Next.js server, traced runtime `node_modules`, and the `prisma` CLI (needed by the entrypoint). Source files, devDependencies, and build artefacts are discarded.

### Production (Supabase DB)

The default `docker-compose.yml` starts the app only. `DATABASE_URL` comes from `.env.local` — your Supabase connection string is never baked into the image.

```bash
docker compose up --build
```

On startup, `docker-entrypoint.sh` runs `prisma db push` against your Supabase database, then starts the server with `node server.js`.

### Dev hot-reload

`docker-compose.dev.yml` builds only to the `deps` stage and bind-mounts your source code into the container for instant hot reload.

```bash
# Against Supabase (default)
docker compose -f docker-compose.dev.yml up --build

# Against a local Postgres container
docker compose -f docker-compose.dev.yml --profile local-db up --build
```

The local Postgres (profile-gated) uses:

| Setting | Value |
|---|---|
| Image | `postgres:15-alpine` |
| Database | `shopify_analyser` |
| User | `dev` |
| Password | `devpassword` |
| Port | `5432` |

Point `DATABASE_URL` in `.env.local` to `postgresql://dev:devpassword@db:5432/shopify_analyser` when using the local profile.

```bash
# Wipe local dev database volume
docker compose -f docker-compose.dev.yml down -v
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | No† | Your store's `.myshopify.com` domain, e.g. `my-store.myshopify.com`. Omit to use mock data. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | No† | Admin API access token. Obtain via the OAuth callback or Shopify Admin → Apps → custom app. |
| `SHOPIFY_API_KEY` | No‡ | App client ID — only needed for the one-time OAuth token exchange at `/api/auth/callback`. |
| `SHOPIFY_API_SECRET` | No‡ | App client secret — only needed for the OAuth flow. |
| `GROQ_API_KEY` | Yes | Groq Cloud API key. Required for store analysis, Product Optimiser, and Orders Analysis. |
| `DATABASE_URL` | Yes | PostgreSQL pooled connection string (Supabase / Neon pooler URL). |
| `DIRECT_URL` | Yes | Direct (non-pooled) PostgreSQL URL. Used by Prisma for migrations. |

> † Both `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN` must be set for live mode. If either is absent, the app falls back to demo data automatically.
>
> ‡ Only needed for the initial access-token exchange at `/api/auth/callback`.

---

## How Groq Is Used

All three routes use `llama-3.3-70b-versatile` via the OpenAI-compatible SDK pointed at `https://api.groq.com/openai/v1`. Each retries up to 2 times on 429/5xx with exponential backoff (600 ms, 1 200 ms).

### 1. Store Analysis — `POST /api/analyse`

```
Browser: POST /api/analyse  (X-Requested-With: XMLHttpRequest)
         │
         ▼
route.ts: validates CSRF → fetches StoreData → builds store summary JSON
         │
         ▼
Groq API: llama-3.3-70b-versatile  (stream: true)
         │  NDJSON — one JSON object per line:
         │    Line 1:    { "overallScore": 7, "summary": "..." }
         │    Lines 2–5: { "insight": { category, title, finding, recommendation, priority } }
         │    Last line: { "quickWins": ["...", "...", "..."] }
         │
         ▼
ReadableStream → browser renders cards progressively as tokens arrive
         │
         ▼  (after stream closes)
prisma.storeAnalysis.create() + ShopifySnapshot persisted to DB
```

### 2. Product Optimiser — `POST /api/products/suggest`

```
Browser: POST /api/products/suggest  (product + auditResult)
         │
         ▼
route.ts: Zod validation → runs auditProduct() → builds directive prompt
         │  (passing fields → RETURN UNCHANGED; failing → FIX THESE FAILURES)
         │
         ▼
Groq API: streams a single minified JSON object
         │  { improvedTitle, improvedDescription, improvedDescriptionHtml,
         │    improvedSeoTitle, improvedSeoDescription, suggestedTags, reasoning }
         │
         ▼
SSE stream → browser renders fields as tokens arrive
         │
         ▼  (after stream closes)
sanitizeHtml() → re-audit for expectedScore → prisma.productSuggestion.create()
event: score { current, expected } emitted to browser
```

### 3. Orders Analysis — `POST /api/orders/analyse`

```
Browser: POST /api/orders/analyse  (FlatOrder[])
         │
         ▼
route.ts: Zod validation (OrdersBodySchema) → buildOrdersSummary(orders)
         │  Sections: time period, revenue, financial status, fulfilment,
         │            top 5 products, customer retention, notable flags
         │
         ▼
Groq API: streams structured JSON (max_tokens: 2048)
         │  { overallHealthScore (1-10), categories [4], topPriority, positives }
         │  Categories: Revenue Health | Fulfilment Performance |
         │              Product Mix | Customer Quality
         │
         ▼
SSE stream → browser accumulates until [DONE], then parses
         │
         ▼  (after [DONE])
persistOrdersAnalysis() → OrdersAnalysis row + metricsSnapshot (non-fatal)
```

---

## Product Audit System

The Product Optimiser analyses each Shopify product against 5 categories with 17 individual checks:

| Category | Max Score | What's checked |
|---|---|---|
| Title | 25 | Length (20–70 chars), no generic prefix, has a descriptor, no ALL CAPS |
| Description | 25 | Min length (150/300 chars), 2+ paragraphs, no placeholder text |
| SEO | 25 | SEO title set + 30–60 chars, SEO description set + 120–160 chars |
| Media | 15 | Has at least one image, featured image has alt text |
| Metadata | 10 | 2+ tags, vendor set, product type set |

Each product receives a score (0–100) and grade (A–F). Groq generates improvement suggestions that are streamed in real time, re-audited locally for expected score gain, HTML-sanitized, and saved with original vs. improved values side by side.

**Bulk Optimise** — processes all products sequentially from a single button click, skipping products that already have a recent suggestion with the same audit hash.

---

## Database Schema

```prisma
model StoreAnalysis {
  id           String           @id @default(cuid())
  storeDomain  String
  overallScore Int
  summary      String
  rawInsights  Json             // Insight[]
  quickWins    Json             // string[]
  createdAt    DateTime         @default(now())
  snapshot     ShopifySnapshot?
}

model ShopifySnapshot {
  id           String        @id @default(cuid())
  storeDomain  String
  productCount Int
  orderCount   Int
  totalRevenue Float
  rawData      Json
  createdAt    DateTime      @default(now())
  analysisId   String        @unique
  analysis     StoreAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
}

model ProductAuditLog {
  id           String              @id @default(cuid())
  productId    String
  productTitle String
  totalScore   Int
  grade        String
  checksJson   Json
  checksHash   String?
  storeDomain  String
  createdAt    DateTime            @default(now())
  suggestions  ProductSuggestion[]
}

model ProductSuggestion {
  id                      String           @id @default(cuid())
  productId               String
  originalTitle           String
  improvedTitle           String
  originalDescription     String
  improvedDescription     String
  improvedDescriptionHtml String?
  originalSeoTitle        String?
  improvedSeoTitle        String
  originalSeoDescription  String?
  improvedSeoDescription  String
  suggestedTags           Json
  reasoning               String
  auditScore              Int
  expectedScore           Int?
  auditLogId              String?
  storeDomain             String
  createdAt               DateTime         @default(now())
}

model OrdersAnalysis {
  id              String    @id @default(cuid())
  storeDomain     String
  analysisJson    Json      // OrdersAnalysisResult
  metricsSnapshot Json?     // snapshot of metrics sent to Groq (nullable — older rows predate this field)
  generatedAt     DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([generatedAt(sort: Desc)])
}
```

---

## Shopify Integration

### Admin GraphQL API

| Query | Fields fetched |
|---|---|
| `SHOP_QUERY` | name, email, myshopifyDomain, primaryDomain, currencyCode, plan |
| `PRODUCTS_QUERY` | id, title, status, vendor, productType, totalInventory, priceRangeV2, images (with altText), seo, tags — paginated up to 250/batch |
| `ORDERS_QUERY` | id, name, totalPriceSet, displayFinancialStatus, displayFulfillmentStatus, createdAt — paginated up to 250/batch |
| `ORDERS_DETAIL_QUERY` | above + lineItems (title, quantity, price, variant) — used by the orders intelligence page |

API version: `2025-01`.

### Mock Mode

When `SHOPIFY_STORE_DOMAIN` or `SHOPIFY_ADMIN_ACCESS_TOKEN` are absent, `isMockMode()` returns `true` and all API callers immediately return hard-coded demo data (5 products, 4 orders). The full UI — including audit scoring and streaming suggestions — is functional in this state.

> **Note:** `getOrdersGraphQL` (used by the `/orders` page) has no mock mode guard — it always calls the real Shopify API. The orders page will show an error state when credentials are absent.

---

## Deployment (Vercel + Database)

### Recommended Stack

| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com) | Hosting — Next.js-first, zero-config |
| [Supabase](https://supabase.com) or [Neon](https://neon.tech) | Serverless PostgreSQL with connection pooling |

### Steps

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add all environment variables in **Settings → Environment Variables**.
4. Set `DATABASE_URL` to the **pooled** connection string and `DIRECT_URL` to the **direct** connection string (both provided by Supabase / Neon).
5. Run the initial migration against your hosted database:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
   ```
   Or use `pnpm db:push` for a schema-push without migration history.

### Notes

- All pages export `dynamic = 'force-dynamic'` to opt out of static generation — every request fetches fresh store data.
- `next.config.ts` sets `output: 'standalone'` (required for the Docker build) and `serverExternalPackages: ['@prisma/client']` (required for Prisma on Vercel Lambda).
- `schema.prisma` includes `binaryTargets = ["native", "rhel-openssl-3.0.x"]` — do not remove this or Prisma will fail on Vercel's runtime.
- `prisma.config.ts` must not import `dotenv` — it runs during `prisma generate` on Vercel where dotenv is unavailable.

---

## Security Considerations

- **HTTP security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` on every response via `next.config.ts`.
- **CSRF guard** — All three AI routes reject requests without `X-Requested-With: XMLHttpRequest` and validate the `Origin` header against the current host.
- **Input validation** — All API route bodies are validated with Zod before processing (`SuggestBodySchema`, `OrdersBodySchema`).
- **HTML sanitisation** — AI-generated `improvedDescriptionHtml` is passed through `sanitizeHtml()` before storage or score computation, eliminating XSS vectors introduced via prompt injection.
- **Input field capping** — Product fields are hard-capped before Groq injection (`title`: 200 chars, `description`: 10 000 chars) to limit prompt injection surface.
- **OAuth SSRF prevention** — `/api/auth/callback` validates `shop` against `/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/` before constructing any outbound URL.
- **Credentials server-only** — Shopify and Groq keys are read exclusively in server components and API routes. Nothing is exposed to the browser.
- **Non-root Docker user** — The production container runs as a dedicated `nextjs:nodejs` system user (UID/GID 1001), not root.

**Known gap:** there is no end-user authentication. Deploy behind Vercel password protection or a VPN for any public deployment.

---

## Known Limitations

- **No authentication** — The dashboard has no login system. Deploy behind Vercel password protection or similar access control.
- **No test suite** — There are no automated tests. `lib/audit/productAudit.ts` and the NDJSON/SSE streaming parsers are the highest-value targets for unit tests.
- **History capped at 20** — The store analysis history page queries at most 20 recent rows. There is no pagination.
- **Orders page requires live credentials** — `getOrdersGraphQL` has no mock mode. The `/orders` page errors when Shopify credentials are absent.
- **Single-store only** — Designed for one store domain per deployment. Multi-store support would require per-store auth and row-level data isolation.
- **Groq rate limits** — The free tier has per-minute token limits. The Bulk Optimise flow can exhaust the quota on large catalogues.
- **No CSP header** — A Content Security Policy is not configured. Recommended before any public deployment.

---

## Future Improvements

- Add authentication (e.g. [NextAuth.js](https://authjs.dev) or Vercel password protection)
- Write unit tests for `lib/audit/productAudit.ts` and streaming parsers
- Add mock mode support for the orders page
- Add a `Content-Security-Policy` header
- Implement pagination for the analysis history list
- Add multi-store support with per-store data isolation
- Add Shopify webhook support to auto-trigger re-analysis when new orders arrive
- Export analysis reports and optimisation suggestions as PDF or CSV
- Add error tracking (e.g. Sentry) to surface production exceptions
