# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (type-check + lint + Next.js compiler)
npm run lint     # ESLint only
npx tsc --noEmit # Type-check without building
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply a new migration
npx prisma studio     # Open DB browser UI
```

There are no tests in this project.

## Environment Variables

Copy `.env.example` to `.env.local`. The app enters **mock mode** automatically when either `SHOPIFY_STORE_DOMAIN` or `SHOPIFY_ADMIN_ACCESS_TOKEN` is absent — no real store needed for development.

| Variable | Required | Notes |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | No† | e.g. `my-store.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | No† | From Shopify Admin or the OAuth callback |
| `SHOPIFY_API_KEY` | No‡ | Only for the one-time OAuth flow at `/api/auth/callback` |
| `SHOPIFY_API_SECRET` | No‡ | Only for the OAuth flow |
| `GROQ_API_KEY` | Yes | Required for AI analysis |
| `DATABASE_URL` | Yes | Use the pooled connection string (Neon/Supabase) |
| `DIRECT_URL` | Yes | Direct (non-pooled) connection — used by Prisma migrations |

† Both must be set together for live mode; omit either to use mock data.  
‡ Only needed for the initial access-token exchange.

## Architecture

### Next.js Version

This project runs **Next.js 16.2.7** with React 19. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

### Data Flow

```
app/layout.tsx  (async RSC)
  └── getStoreDataCached()   ← React.cache() wrapper — one Shopify call per navigation
        └── services/shopify.ts
              └── lib/shopify/api.ts → lib/shopify/client.ts → Shopify Admin GraphQL API (v2025-01)

app/**/page.tsx  (also calls getStoreDataCached — gets the memoised result, no extra fetch)
```

Every page exports `dynamic = 'force-dynamic'` to opt out of static rendering.

### Key Library Files

**`lib/shopify/client.ts`** — `shopifyFetch<T>()`: raw GraphQL wrapper, returns `{ data, error }`, never throws. `isMockMode()` is true when credentials are absent.

**`lib/shopify/api.ts`** — `getShopInfo`, `getProducts`, `getOrders`: typed callers with cursor-based pagination (up to 250 per batch). Return mock data silently in mock mode; throw with a descriptive message in live mode.

**`lib/shopify/cached.ts`** — `getStoreDataCached = cache(getStoreData)`. Always import this instead of `getStoreData` directly in server components.

**`lib/analytics.ts`** — Pure functions that compute `StoreMetrics` from raw products/orders arrays. Uses a `safeFloat()` helper to guard all `parseFloat` calls against NaN.

**`lib/prisma.ts`** — Prisma singleton using `globalThis` to prevent multiple instances in dev hot-reload.

### AI Analysis Flow

`POST /api/analyse/route.ts` is the only AI entry point:
1. Guards the request with `X-Requested-With: XMLHttpRequest` (CSRF).
2. Fetches store data, builds a plain JSON summary object.
3. Calls Groq (`llama-3.3-70b-versatile`, `stream: true`) via the OpenAI-compatible SDK.
4. Pipes the NDJSON stream directly to the browser as `text/plain`.
5. Accumulates the full text in memory; after the stream closes, calls `persistAnalysis()` to write to the DB. Failure is non-fatal — the browser already has the response.

The NDJSON format Groq must emit: line 1 is `{overallScore, summary}`, lines 2-5 are `{insight: {...}}`, last line is `{quickWins: [...]}`.

`GET /api/analyse/latest` returns the most recent `StoreAnalysis` row from the DB (used by `StreamingAnalysis` on initial load to avoid re-running the AI).

### `StreamingAnalysis` Component (client-side)

`components/StreamingAnalysis.tsx` manages the entire AI section UI:
- Module-level `analysisCache` and `cachedAt` survive client-side navigation; only cleared on explicit Regenerate.
- On mount, fetches `/api/analyse/latest` to hydrate from the last saved analysis before triggering a new stream.
- Parses NDJSON progressively as tokens arrive via `isInsight()` / `isValidAnalysis()` type guards; malformed lines are skipped.
- Insight cards are sorted high → medium → low priority. Orphan-card layout: 1 orphan spans all 3 columns; 2 orphans use a 2-col sub-grid inside a 3-column span.

### Prisma / Database

Generator: `prisma-client-js` (outputs compiled JS to `node_modules/.prisma/client/`). Import from `@prisma/client`.

**Critical for Vercel deployment:** `schema.prisma` has `binaryTargets = ["native", "rhel-openssl-3.0.x"]` and `next.config.ts` has `serverExternalPackages: ['@prisma/client']`. These must stay. Removing either breaks the Lambda on Vercel because:
- Without `binaryTargets`: the RHEL engine binary is never generated.
- Without `serverExternalPackages`: Next.js bundles `@prisma/client`, causing `import.meta.url` to resolve to the bundle chunk URL instead of the module's real path, so the engine is never found at runtime.

`prisma.config.ts` must NOT import `dotenv` — it's executed by the Prisma CLI during `prisma generate` (including on Vercel), and `dotenv` is not in `package.json`.

### Sidebar / Layout

The persistent sidebar lives in `app/layout.tsx`, not individual pages — this is what keeps it mounted across client-side navigations.

`SidebarContext.tsx` provides `{ isOpen, toggle, close }`.  
`Sidebar.tsx` uses `usePathname()` for active nav state and calls `close()` on each nav click (mobile dismiss).  
`MobileMenuButton.tsx` renders the hamburger/X inside each page's sticky header.

### Styling

Tailwind v4 with PostCSS. No `tailwind.config.js` — all configuration is CSS-first in `globals.css`. There is a global `@media (prefers-reduced-motion: reduce)` block that disables `animate-pulse`, `animate-bounce`, and `animate-spin`.

### Type System

- `StoreData` (`types/shopify.ts`) — full assembled shape: `shop`, `products`, `orders`, `metrics`, `isMockData`
- `StoreMetrics` (`types/shopify.ts`) — computed KPIs from `calculateMetrics()` in `lib/analytics.ts`
- `StoreAnalysis` (`types/analysis.ts`) — AI result: `{ overallScore, summary, insights[], quickWins[] }`
- `Insight` (`types/analysis.ts`) — `{ category, title, finding, recommendation, priority }`
