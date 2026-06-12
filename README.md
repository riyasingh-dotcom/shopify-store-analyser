# Shopify Store Analyser

A full-stack analytics and AI optimisation dashboard for Shopify stores. Built with Next.js 16 App Router, React 19, Prisma, and Tailwind CSS v4. Powered by the Groq API (`llama-3.3-70b-versatile`) for streaming AI analysis and product copy optimisation.

---

## Live Demo

> **Demo URL:** _coming soon_ — deploy your own instance by following the [Deployment](#deployment-vercel--database) guide below.

---

## Overview

Shopify Store Analyser connects to a store's Admin GraphQL API to surface key performance metrics — product inventory, order volume, revenue, and fulfilment rates — in a clean, responsive dashboard.

**Store Analysis** — clicking **Regenerate Analysis** streams a structured AI health report directly to the browser as tokens arrive, then persists it to PostgreSQL for trend tracking over time.

**Product Optimiser** — every product is scored across 5 quality dimensions. For any product, Groq streams targeted rewrite suggestions (title, description, SEO fields, tags) that are validated, re-audited for score gain, and saved to the database. A **Bulk Optimise** button processes all low-scoring products sequentially.

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
| Fonts | Geist Sans & Geist Mono (`next/font/google`) |
| AI / LLM | Groq Cloud API — `llama-3.3-70b-versatile`, via OpenAI-compatible SDK |
| Streaming | Server-Sent Events (SSE) + `ReadableStream` |
| Database | PostgreSQL, managed via Prisma ORM 6 |
| Icons | Lucide React |
| Linting | ESLint 9, `eslint-config-next` |

---

## Project Structure

```
shopify-store-analyser/
├── prisma/
│   └── schema.prisma                    # DB models: StoreAnalysis, ShopifySnapshot,
│                                        #   ProductAuditLog, ProductSuggestion
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout: sidebar + SidebarProvider
│   │   ├── page.tsx                     # Overview: KPI cards + streaming analysis
│   │   ├── error.tsx / loading.tsx      # Root error boundary + skeleton
│   │   ├── globals.css                  # Tailwind v4 CSS-first config
│   │   ├── products/
│   │   │   ├── page.tsx                 # Paginated products table with audit scores
│   │   │   ├── loading.tsx / error.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # Product detail: audit breakdown + suggestions
│   │   │       └── history/
│   │   │           └── page.tsx         # Per-product suggestion history
│   │   ├── orders/
│   │   │   ├── page.tsx                 # Orders table + order summary
│   │   │   └── loading.tsx / error.tsx
│   │   ├── history/
│   │   │   ├── page.tsx                 # Store analysis history list (RSC)
│   │   │   ├── HistoryClient.tsx        # List/grid toggle, delta badges (client)
│   │   │   ├── loading.tsx / error.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # Full analysis detail view
│   │   │       └── loading.tsx
│   │   └── api/
│   │       ├── analyse/
│   │       │   ├── route.ts             # POST: Groq store analysis stream + DB persist
│   │       │   └── latest/route.ts      # GET: most recent saved store analysis
│   │       ├── products/
│   │       │   └── suggest/route.ts     # POST: Groq product copy suggestions (SSE)
│   │       └── auth/callback/route.ts   # Shopify OAuth token exchange (dev tool)
│   ├── components/
│   │   ├── audit/
│   │   │   ├── AuditBreakdown.tsx       # Per-category score breakdown UI
│   │   │   ├── ProductSuggestions.tsx   # Streaming suggestion UI + copy buttons
│   │   │   └── ScoreBadge.tsx           # Grade badge (A–F)
│   │   ├── BulkOptimise.tsx             # Sequential bulk optimisation controller
│   │   ├── StreamingAnalysis.tsx        # Store analysis streaming UI + cache
│   │   ├── InsightCard.tsx
│   │   ├── StoreScoreCard.tsx           # Ring dial score visualisation
│   │   ├── StoreMetrics.tsx             # KPI stat cards grid
│   │   ├── ProductsTable.tsx            # Paginated products table (client)
│   │   ├── OrdersTable.tsx              # Orders table (server)
│   │   ├── OrderSummary.tsx             # Revenue + status breakdown
│   │   ├── QuickWins.tsx
│   │   ├── CopyButton.tsx               # One-click copy to clipboard
│   │   ├── PageShell.tsx
│   │   ├── Sidebar.tsx                  # Navigation (client, uses usePathname)
│   │   ├── SidebarContext.tsx           # isOpen / toggle / close context
│   │   ├── MobileMenuButton.tsx
│   │   └── InsightsSkeleton.tsx / LoadingSkeleton.tsx
│   ├── lib/
│   │   ├── audit/
│   │   │   └── productAudit.ts          # Pure audit logic: 17 checks, scoring, grading
│   │   ├── shopify/
│   │   │   ├── client.ts                # shopifyFetch<T>() — returns {data, error}, never throws
│   │   │   ├── api.ts                   # getShopInfo / getProducts / getOrders (paginated)
│   │   │   ├── queries.ts               # GraphQL query strings
│   │   │   ├── cached.ts                # React.cache() wrapper
│   │   │   └── utils.ts
│   │   ├── analytics.ts                 # Pure metric computation
│   │   ├── sanitizeHtml.ts              # Strips unsafe HTML from AI-generated content
│   │   └── prisma.ts                    # Prisma client singleton
│   ├── services/
│   │   └── shopify.ts                   # getStoreData() assembler (Promise.all)
│   └── types/
│       ├── shopify.ts                   # ShopInfo, Product, Order, StoreData, StoreMetrics
│       ├── analysis.ts                  # StoreAnalysis, Insight, InsightCategory, InsightPriority
│       └── suggestions.ts              # ProductSuggestion type
└── next.config.ts                       # Security headers
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A PostgreSQL database (local or hosted — see [Deployment](#deployment-vercel--database))
- A Groq API key (free tier at [console.groq.com](https://console.groq.com))
- *(Optional for live data)* A Shopify store with an Admin API token

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/shopify-store-analyser.git
cd shopify-store-analyser
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Push the database schema:

```bash
pnpm db:push
# or without pnpm:
npx prisma db push
```

Start the dev server:

```bash
npm run dev        # http://localhost:3000
```

### Other Useful Commands

```bash
npm run build      # Production build (type-check + lint + Next.js compiler)
npm run lint       # ESLint only
npx tsc --noEmit   # Type-check without building
pnpm db:studio     # Open Prisma Studio to inspect the database
pnpm db:migrate    # Create and apply a named migration
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | No† | Your store's `.myshopify.com` domain, e.g. `my-store.myshopify.com`. Omit to use mock data. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | No† | Admin API access token. Obtain via the OAuth callback or Shopify Admin → Apps → custom app. |
| `SHOPIFY_API_KEY` | No‡ | App client ID — only needed for the one-time OAuth token exchange at `/api/auth/callback`. |
| `SHOPIFY_API_SECRET` | No‡ | App client secret — only needed for the OAuth flow. |
| `GROQ_API_KEY` | Yes | Groq Cloud API key. Required for store analysis and Product Optimiser. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use your pooler URL if behind PgBouncer (Neon, Supabase). |
| `DIRECT_URL` | Yes | Direct (non-pooled) PostgreSQL URL. Used by Prisma for migrations. Same as `DATABASE_URL` if not using a pooler. |

> † Both `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN` must be set for live mode. If either is absent, the app falls back to demo data automatically.
>
> ‡ Only needed for the initial access-token exchange at `/api/auth/callback`.

---

## How Groq Is Used

### Store Analysis

`POST /api/analyse` validates a CSRF header, fetches live store data, builds a JSON summary, and streams a structured NDJSON health report from Groq:

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

### Product Optimiser

`POST /api/products/suggest` runs the local audit against a product, builds a field-level directive prompt (only failing checks are listed; passing fields get a "RETURN UNCHANGED" directive), then streams Groq's rewrite as Server-Sent Events:

```
Browser: POST /api/products/suggest  (product + auditResult)
         │
         ▼
route.ts: validates body → runs auditProduct() → builds directive prompt
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

Groq calls are retried up to 2 times with exponential backoff (600 ms, 1 200 ms) on 429 and 5xx responses. All retries exhausted → 502 to client.

---

## Product Optimiser

The Product Optimiser analyses each Shopify product against 5 categories with 17 individual checks:

| Category | Max Score | What's checked |
|---|---|---|
| Title | 25 | Length (20–70 chars), no generic prefix, has a descriptor, no ALL CAPS |
| Description | 25 | Min length (150/300 chars), 2+ paragraphs, no placeholder text |
| SEO | 25 | SEO title set + 30–60 chars, SEO description set + 120–160 chars |
| Media | 15 | Has at least one image, featured image has alt text |
| Metadata | 10 | 2+ tags, vendor set, product type set |

Each product receives a score (0–100) and grade (A–F). For any product, Groq generates specific improvement suggestions that are:

- Streamed in real time to the browser
- Re-audited locally to compute an **expected score after improvements**
- Sanitized (HTML stripped of unsafe content) before storage
- Saved to the `ProductSuggestion` table with original vs. improved values side by side

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
  rawData      Json          // store summary sent to Groq
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
  checksHash   String?             // dedup key: skip re-run if unchanged
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
```

---

## Shopify Integration

### Admin GraphQL API

| Query | Fields fetched |
|---|---|
| `SHOP_QUERY` | name, email, myshopifyDomain, primaryDomain, currencyCode, plan |
| `PRODUCTS_QUERY` | id, title, status, vendor, productType, totalInventory, priceRangeV2, images (with altText), seo, tags — paginated, up to 250 per batch |
| `ORDERS_QUERY` | id, name, totalPriceSet, displayFinancialStatus, displayFulfillmentStatus, createdAt — paginated, up to 250 per batch |

API version: `2025-01`.

### Mock Mode

When `SHOPIFY_STORE_DOMAIN` or `SHOPIFY_ADMIN_ACCESS_TOKEN` are absent, `isMockMode()` returns `true` and all API callers immediately return hard-coded demo data (5 products, 4 orders). The full UI — including audit scoring and streaming suggestions — is functional in this state.

---

## Deployment (Vercel + Database)

### Recommended Stack

| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com) | Hosting — Next.js-first, zero-config |
| [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Serverless PostgreSQL with connection pooling |

### Steps

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add all environment variables in **Settings → Environment Variables**.
4. Set `DATABASE_URL` to the **pooled** connection string and `DIRECT_URL` to the **direct** connection string (both provided by Neon / Supabase).
5. Run the initial migration against your hosted database:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
   ```
   Or use `npx prisma db push` for a schema-push without migration history.

### Notes

- All pages export `dynamic = 'force-dynamic'` to opt out of static generation — every request fetches fresh store data.
- `schema.prisma` includes `binaryTargets = ["native", "rhel-openssl-3.0.x"]` and `next.config.ts` sets `serverExternalPackages: ['@prisma/client']`. Both are required for Prisma to function on Vercel's Lambda runtime — do not remove them.
- The `postinstall` script runs `prisma generate` automatically after `npm install`.

---

## Security Considerations

- **HTTP security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` on every response via `next.config.ts`.
- **CSRF guard** — Both `/api/analyse` and `/api/products/suggest` reject requests without `X-Requested-With: XMLHttpRequest` and validate the `Origin` header against the current host.
- **HTML sanitisation** — AI-generated `improvedDescriptionHtml` is passed through `sanitizeHtml()` before storage or score computation, eliminating XSS vectors introduced via prompt injection.
- **Input field capping** — Product fields are hard-capped before being injected into Groq prompts (`title`: 200 chars, `description`: 10 000 chars, etc.) to limit prompt injection surface and keep token usage predictable.
- **OAuth SSRF prevention** — `/api/auth/callback` validates `shop` against `/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/` before constructing any outbound URL.
- **Credentials server-only** — Shopify and Groq keys are read exclusively in server components and API routes. Nothing is exposed to the browser.

**Known gap:** there is no end-user authentication. Deploy behind Vercel password protection or a VPN for any public deployment.

---

## Known Limitations

- **No authentication** — The dashboard has no login system. Deploy behind Vercel password protection or similar access control.
- **No test suite** — There are no automated tests. `lib/audit/productAudit.ts` and the NDJSON streaming parser are the highest-value targets for unit tests.
- **History capped at 20** — The store analysis history page queries at most 20 recent rows. There is no pagination.
- **Single-store only** — Designed for one store domain per deployment. Multi-store support would require per-store auth and row-level data isolation.
- **Groq rate limits** — The free tier has per-minute token limits. The Bulk Optimise flow can exhaust the quota on large catalogues.
- **No CSP header** — A Content Security Policy is not configured. Recommended before any public deployment.

---

## Future Improvements

- Add authentication (e.g. [NextAuth.js](https://authjs.dev) or Vercel password protection)
- Write unit tests for `lib/audit/productAudit.ts` and streaming parsers
- Add a `Content-Security-Policy` header
- Implement pagination for the analysis history list
- Add multi-store support with per-store data isolation
- Add Shopify webhook support to auto-trigger re-analysis when new orders arrive
- Export analysis reports and optimisation suggestions as PDF or CSV
- Add error tracking (e.g. Sentry) to surface production exceptions
