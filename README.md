# Shopify Store Analyser

A full-stack analytics dashboard for Shopify stores, with a real-time AI analysis engine powered by the Groq API. Built with Next.js 16 App Router, React 19, Prisma, and Tailwind CSS v4.

---

## Overview

Shopify Store Analyser connects to a store's Admin API to surface key performance metrics — product inventory, order volume, revenue, and fulfilment rates — in a clean, responsive dashboard. Clicking **Regenerate Analysis** streams a structured AI report directly to the browser as tokens arrive, then persists it to a PostgreSQL database for trend tracking over time.

The app runs in **mock mode** automatically when no Shopify credentials are configured, making it fully usable for development and portfolio demonstration without a real store.

---

## Features

- **Live KPI cards** — Total Products, Total Revenue, Average Order Value, Fulfilment Rate
- **Streaming AI analysis** — NDJSON-over-HTTP response streamed token-by-token from Groq; partial results render progressively as they arrive
- **Store health score** — 1–10 score with a categorised label (Critical / Needs Work / Adequate / Strong) visualised as an animated ring dial
- **AI insights grid** — 3–5 categorised insight cards (Inventory, Revenue, Products, Marketing, Operations, Growth), sorted high → medium → low priority, with smart orphan-filling layout
- **Quick wins panel** — 3 immediately actionable steps extracted from the AI response
- **Orders table** — Recent orders with payment and fulfilment status badges
- **Products table** — Paginated product list with live inventory bars, status badges, and vendor info
- **Order summary** — Revenue breakdown, payment status distribution, and fulfilment stats
- **Analysis history** — Up to 20 past analyses stored in the database, browsable in list or grid view, with score, revenue, order, and product deltas vs. the previous run
- **Analysis detail page** — Full insight breakdown for any saved analysis at `/history/[id]`
- **Mock mode** — Full UI with realistic demo data when `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` are absent
- **Responsive layout** — Mobile-first sidebar with hamburger navigation, all tables adapted for 375 px viewports
- **Reduced-motion support** — All `animate-pulse` and `animate-bounce` animations disabled via `prefers-reduced-motion`
- **WCAG touch targets** — All interactive elements meet the 44 × 44 px minimum
- **Route-level error boundaries** — Each page segment has its own `error.tsx` with a retry button
- **Security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` on every response

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router) |
| UI runtime | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4, PostCSS (CSS-first config in `globals.css`) |
| Fonts | Geist Sans & Geist Mono (`next/font/google`) |
| AI / LLM | Groq Cloud API — `llama-3.3-70b-versatile`, via OpenAI-compatible SDK |
| Streaming | Native `fetch` + `ReadableStream` (NDJSON over HTTP) |
| Database | PostgreSQL, managed via Prisma ORM 6 |
| Icons | Lucide React (History views) |
| Linting | ESLint 9, `eslint-config-next` |

---

## Architecture

### Data Flow

```
Browser
  │
  ├─ Server Components (RSC)
  │     app/layout.tsx  ──► getStoreDataCached()   ← React.cache, deduplicates per-request
  │     app/**/page.tsx ──► getStoreDataCached()   ← hits the same memoised result
  │                               │
  │                         services/shopify.ts     ← assembles StoreData + StoreMetrics
  │                               │
  │                         lib/shopify/api.ts      ← typed GraphQL callers; returns mock data
  │                               │                    in mock mode, throws on live API errors
  │                         lib/shopify/client.ts   ← raw shopifyFetch<T>(); never throws;
  │                                                    returns { data, error }
  │
  └─ Client Component: StreamingAnalysis
        POST /api/analyse  ──► Groq streaming API
                                    │
                                    ├─ streams NDJSON tokens → browser renders progressively
                                    └─ after stream closes → prisma.storeAnalysis.create()
```

### Key Files

| File | Responsibility |
|---|---|
| `lib/shopify/client.ts` | Raw `shopifyFetch<T>()`. Returns `{ data, error }`, never throws. `isMockMode()` checks for missing credentials. |
| `lib/shopify/api.ts` | Typed GraphQL callers: `getShopInfo`, `getProducts`, `getOrders`. Handles cursor-based pagination (up to 250 per batch). |
| `lib/shopify/cached.ts` | `React.cache()` wrapper around `getStoreData` — ensures one Shopify API call per navigation even with multiple server components. |
| `services/shopify.ts` | Assembles `StoreData` (shop + products + orders + computed `StoreMetrics`) via `Promise.all`. |
| `lib/analytics.ts` | Pure functions: `calculateMetrics`, `getTopProducts`, `calculateTotalRevenue`. |
| `app/api/analyse/route.ts` | POST handler: validates request, streams Groq NDJSON to the browser, persists after delivery. |
| `app/api/analyse/latest/route.ts` | GET handler: returns the most recent saved analysis from the database. |
| `components/StreamingAnalysis.tsx` | `'use client'` component. Maintains a module-level analysis cache that survives client-side navigation. Renders progressively as the stream arrives. |

---

## Project Structure

```
shopify-store-analyser/
├── prisma/
│   └── schema.prisma               # StoreAnalysis + ShopifySnapshot models
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: async RSC, owns sidebar + SidebarProvider
│   │   ├── page.tsx                # Overview: KPI cards + streaming AI section
│   │   ├── error.tsx               # Root error boundary
│   │   ├── loading.tsx             # Overview skeleton
│   │   ├── globals.css             # Tailwind v4 CSS-first config
│   │   ├── products/
│   │   │   ├── page.tsx            # ProductsTable
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx            # OrdersTable + OrderSummary
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── history/
│   │   │   ├── page.tsx            # Analysis history list (server component)
│   │   │   ├── HistoryClient.tsx   # List/grid toggle, delta badges (client component)
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Full analysis detail view
│   │   │       └── loading.tsx
│   │   └── api/
│   │       ├── analyse/
│   │       │   ├── route.ts        # POST: Groq streaming + DB persistence
│   │       │   └── latest/
│   │       │       └── route.ts    # GET: most recent saved analysis
│   │       └── auth/
│   │           └── callback/
│   │               └── route.ts    # Shopify OAuth token exchange (dev tool)
│   ├── components/
│   │   ├── StreamingAnalysis.tsx   # AI streaming UI + cache
│   │   ├── InsightCard.tsx
│   │   ├── StoreScoreCard.tsx      # Ring dial score visualisation
│   │   ├── StoreMetrics.tsx        # KPI stat cards grid
│   │   ├── ProductsTable.tsx       # Paginated products table (client)
│   │   ├── OrdersTable.tsx         # Orders table (server)
│   │   ├── OrderSummary.tsx        # Revenue + status breakdown
│   │   ├── QuickWins.tsx
│   │   ├── Sidebar.tsx             # Navigation (client, uses usePathname)
│   │   ├── SidebarContext.tsx      # isOpen / toggle / close context
│   │   ├── MobileMenuButton.tsx
│   │   └── InsightsSkeleton.tsx
│   ├── lib/
│   │   ├── shopify/
│   │   │   ├── client.ts           # shopifyFetch<T>()
│   │   │   ├── api.ts              # getShopInfo / getProducts / getOrders
│   │   │   ├── queries.ts          # GraphQL query strings
│   │   │   └── cached.ts           # React.cache wrapper
│   │   ├── analytics.ts            # Pure metric computation
│   │   └── prisma.ts               # Prisma client singleton
│   ├── services/
│   │   └── shopify.ts              # getStoreData() assembler
│   └── types/
│       ├── shopify.ts              # ShopInfo, Product, Order, StoreData, StoreMetrics
│       └── analysis.ts             # StoreAnalysis, Insight, InsightCategory, InsightPriority
└── next.config.ts                  # Security headers
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- A PostgreSQL database (local or hosted — see [Deployment](#deployment-vercel--database))
- A Groq API key (free tier available at [console.groq.com](https://console.groq.com))
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

Run the database migration:

```bash
npx prisma migrate dev --name init
# or, for a hosted database without migration history:
npx prisma db push
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | No† | Your store's `.myshopify.com` domain, e.g. `my-store.myshopify.com`. Omit to use mock data. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | No† | Admin API access token. Obtain via the OAuth callback or Shopify Admin → Apps → custom app. Omit to use mock data. |
| `SHOPIFY_API_KEY` | No‡ | App client ID — only needed for the one-time OAuth token exchange at `/api/auth/callback`. |
| `SHOPIFY_API_SECRET` | No‡ | App client secret — only needed for the OAuth flow. |
| `GROQ_API_KEY` | Yes | Groq Cloud API key. Required for the AI analysis feature. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use your pooler URL if behind PgBouncer (Neon, Supabase). |
| `DIRECT_URL` | Yes | Direct (non-pooled) PostgreSQL URL. Used by Prisma for migrations. Same as `DATABASE_URL` if not using a connection pooler. |

> † Both `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN` must be set for live mode. If either is absent, the app automatically falls back to demo data.
>
> ‡ `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are only needed if you are using the built-in OAuth flow at `/api/auth/callback` to obtain an access token. They are not needed for normal dashboard operation.

### Running Locally

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build (TypeScript check + ESLint + Next.js compiler)
npm run lint       # ESLint only
npx tsc --noEmit   # Type-check without building
npx prisma studio  # Open Prisma Studio to inspect the database
```

---

## AI Analysis Flow

```
Browser: POST /api/analyse  (header: X-Requested-With: XMLHttpRequest)
         │
         ▼
route.ts: validates CSRF header → fetches StoreData → builds store summary JSON
         │
         ▼
Groq API: llama-3.3-70b-versatile  (max_tokens: 1024, stream: true)
         │  streams NDJSON — one JSON object per line:
         │    Line 1:   { "overallScore": 7, "summary": "..." }
         │    Lines 2–5: { "insight": { category, title, finding, recommendation, priority } }
         │    Last line: { "quickWins": ["...", "...", "..."] }
         │
         ▼
ReadableStream: each token is forwarded to the browser as it arrives
         │
         ▼
StreamingAnalysis.tsx: parses NDJSON progressively, renders partial cards in real time
         │
         ▼  (after stream closes)
prisma.storeAnalysis.create(): persists score, summary, insights, quick wins +
ShopifySnapshot (product count, order count, total revenue at time of analysis)
```

The AI response is validated with type guards (`isInsight`) before rendering and before database insertion. Malformed NDJSON lines are skipped with a console warning rather than crashing the stream.

Groq calls are retried up to 2 times with exponential backoff (600 ms, then 1 200 ms) on rate-limit (HTTP 429) and server errors (5xx). If all retries fail, the client receives a 502.

---

## Shopify Integration

### Admin GraphQL API

The app calls three Shopify Admin GraphQL endpoints:

| Query | Fields fetched |
|---|---|
| `SHOP_QUERY` | name, email, myshopifyDomain, primaryDomain, currencyCode, plan |
| `PRODUCTS_QUERY` | id, title, status, vendor, totalInventory, priceRangeV2 (paginated, up to 250 per batch) |
| `ORDERS_QUERY` | id, name, totalPriceSet, displayFinancialStatus, displayFulfillmentStatus, createdAt (paginated, up to 250 per batch) |

API version: `2025-01`.

### Mock Mode

When `SHOPIFY_STORE_DOMAIN` or `SHOPIFY_ADMIN_ACCESS_TOKEN` are absent, `isMockMode()` returns `true` and all API callers immediately return hard-coded demo data (5 products, 4 orders). The full UI is functional in this state.

### OAuth Callback (Developer Tool)

`GET /api/auth/callback?code=xxx&shop=xxx` exchanges a Shopify authorisation code for a permanent Admin API access token and displays it as copyable text. This is a one-time developer utility — it is not part of the normal app flow. The handler validates that `shop` matches `*.myshopify.com` before making any outbound request (SSRF prevention).

---

## Database Schema Overview

```prisma
model StoreAnalysis {
  id           String           @id @default(cuid())
  storeDomain  String
  overallScore Int
  summary      String
  rawInsights  Json             // Insight[] array
  quickWins    Json             // string[] array
  createdAt    DateTime         @default(now())
  snapshot     ShopifySnapshot?
}

model ShopifySnapshot {
  id           String        @id @default(cuid())
  storeDomain  String
  productCount Int
  orderCount   Int
  totalRevenue Float
  rawData      Json          // full store summary sent to Groq
  createdAt    DateTime      @default(now())
  analysisId   String        @unique
  analysis     StoreAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
}
```

The history page queries up to 20 most recent `StoreAnalysis` rows ordered by `createdAt` descending, and computes per-field deltas against the previous entry.

---

## Deployment (Vercel + Database)

### Recommended stack

| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com) | Hosting — Next.js-first, zero-config |
| [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Serverless PostgreSQL with connection pooling |

### Steps

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add all environment variables from the table above in **Settings → Environment Variables**.
4. Set `DATABASE_URL` to the **pooled** connection string and `DIRECT_URL` to the **direct** connection string (both provided by Neon / Supabase).
5. Run the initial migration against your hosted database:
   ```bash
   DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
   ```
   Or use `npx prisma db push` for a schema-push without migration history.

### Notes

- All pages use `export const dynamic = 'force-dynamic'` to opt out of static generation — every request fetches fresh store data.
- The Prisma client is output to `src/generated/prisma` (not `node_modules`) to work reliably with Vercel's build cache.
- The `postinstall` script runs `prisma generate` automatically — no manual step needed after `npm install`.

---

## Security Considerations

The following security controls are implemented:

- **HTTP security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` are set on every response via `next.config.ts`.
- **CSRF guard on `/api/analyse`** — The route rejects any POST that does not carry `X-Requested-With: XMLHttpRequest`. Browsers enforce CORS preflight for this header, blocking cross-origin callers.
- **OAuth SSRF prevention** — The `/api/auth/callback` handler validates `shop` against `/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/` before constructing any outbound URL.
- **HTML encoding** — The OAuth token display page escapes `shop` and `access_token` through `escapeHtml()` before embedding them in the HTML response.
- **Credentials server-only** — Shopify and Groq keys are read exclusively in server components and API routes. No credentials are exposed to the browser.
- **Input serialised before LLM** — Store data sent to Groq is serialised as JSON (not template-interpolated), limiting prompt injection surface.

**Known gap:** there is no end-user authentication. Anyone with the deployment URL can view dashboard data and trigger AI analyses. Deploy behind Vercel password protection or a VPN for production use.

---

## Known Limitations

- **No authentication** — The dashboard has no login system. It should be deployed behind Vercel password protection or similar access control for any public deployment.
- **No test suite** — There are no automated tests. Pure functions in `lib/analytics.ts` and the NDJSON streaming parser are the highest-value targets for unit tests.
- **History capped at 20** — The history page queries at most 20 recent analyses. There is no pagination on the history list.
- **Single-store only** — The app is designed for one store domain per deployment. Multi-store support would require per-store auth and row-level data isolation.
- **Groq rate limits** — The free tier of Groq has per-minute token limits. The route retries twice on 429s, but sustained load from multiple tabs can exhaust the quota.
- **No CSP header** — A Content Security Policy is not configured. Recommended before exposing the app publicly.
- **No database-level score constraint** — `overallScore` has no `CHECK (overallScore BETWEEN 1 AND 10)` constraint; only application-level clamping prevents out-of-range values.

---

## Future Improvements

- Add authentication (e.g. [NextAuth.js](https://authjs.dev) or Vercel password protection)
- Write unit tests for `lib/analytics.ts` and the NDJSON streaming parser
- Add a `Content-Security-Policy` header
- Implement pagination for the history list
- Add multi-store support with per-store data isolation
- Add error tracking (e.g. Sentry) to surface production exceptions
- Add Shopify webhook support to auto-trigger re-analysis when new orders arrive
- Export analysis reports as PDF or CSV
- Add a database-level `CHECK` constraint on `overallScore`

---

## What I Learned

**Next.js App Router data deduplication** — Using `React.cache()` to memoize the Shopify API call across both the root layout and individual page components is non-obvious but eliminates redundant network requests without prop-drilling or a global store. Every page shares the same in-flight promise.

**NDJSON streaming** — Structuring the Groq response as one JSON object per line (rather than one large blob at the end) enabled the UI to render progressively as tokens arrive. The challenge was accumulating the full response server-side for DB persistence while simultaneously forwarding each chunk to the browser through a `ReadableStream`, without a second LLM call.

**React 19 compiler lint rules** — The `react-hooks/set-state-in-effect` rule performs inter-procedural analysis, tracing through `useCallback`-wrapped functions to detect indirect `setState` calls inside effect bodies. Satisfying it required restructuring derived state so `startTransition` wraps the call site, not just the inner callback.

**Tailwind CSS v4** — The move to CSS-first configuration (`@theme` blocks, no `tailwind.config.js`) requires understanding the new `@import "tailwindcss"` directive. The `motion-safe:` variant and `@media (prefers-reduced-motion: reduce)` global overrides proved especially useful for accessible loading states.

**Security as retrofit** — Adding CSRF guards, SSRF validation, and HTML encoding as a post-build pass made clear how easy it is to ship a functional but unguarded app — and how small each individual fix is once the gap is identified.

---

## License

This project is private (`"private": true` in `package.json`). No license is specified. Add a `LICENSE` file if you intend to open-source or share the code.

---

## Appendix: Items to Fill In Manually

| Item | Where |
|---|---|
| Live demo URL | Add a badge/link at the top of this file after deploying |
| Repository URL | Replace `YOUR_USERNAME` in the installation clone command |
| License | Decide on MIT, proprietary, etc., and add a `LICENSE` file |
| Screenshot or demo GIF | Add to the Overview section to illustrate the streaming UI |
| Shopify API scopes | Document required scopes for the Admin API token (at minimum: `read_products`, `read_orders`, `read_inventory`) |

## Appendix: Codebase Inconsistencies

| Location | Issue |
|---|---|
| `CLAUDE.md` — Environment Variables | Documents `GEMINI_API_KEY` as required. The implementation uses Groq (`GROQ_API_KEY`). `@google/genai` has been removed from the project. |
| `CLAUDE.md` — AI Insights section | References `app/actions/analyse.ts` (a server action calling Gemini) and `components/AIInsightsSection.tsx`. Neither exists. The actual files are `app/api/analyse/route.ts` and `components/StreamingAnalysis.tsx`. |
| `CLAUDE.md` — AI Insights section | Describes `analyseStore()` / `analyseCurrentStore()` exports — these functions do not exist in the codebase. |
| `src/components/LoadingSkeleton.tsx` | Defines `SidebarSkeleton` with a dark colour scheme (`bg-gray-950`) that does not match the white sidebar. The file is never imported anywhere and is dead code. |
