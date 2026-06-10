# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js Version

This project runs **Next.js 16.2.7** with React 19. APIs, conventions, and file structure differ significantly from older versions. **Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`** and heed deprecation notices.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs type-check + lint)
npm run lint     # ESLint
npx tsc --noEmit # Type-check without emitting
```

There are no tests in this project.

## Environment Variables

Copy `.env.example` to `.env.local`. The app runs in **mock mode** automatically if `SHOPIFY_STORE_DOMAIN` or `SHOPIFY_ADMIN_ACCESS_TOKEN` are absent — no real store needed for development.

```
SHOPIFY_STORE_DOMAIN=         # e.g. my-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=   # Admin API token
SHOPIFY_API_KEY=               # For OAuth flow only
SHOPIFY_API_SECRET=            # For OAuth flow only
GEMINI_API_KEY=                # Required for AI insights feature
```

## Architecture

### Data Flow

```
app/layout.tsx (async server component)
  └── getStoreDataCached()  ← React.cache wrapper, deduplicates per-request
        └── services/shopify.ts → lib/shopify/api.ts → lib/shopify/client.ts
                                                         └── Shopify Admin GraphQL API

app/**/page.tsx  (also calls getStoreDataCached — gets memoized result, no extra fetch)
```

**`lib/shopify/client.ts`** — raw `shopifyFetch<T>()` wrapper. Returns `{ data, error }`, never throws. `isMockMode()` returns true when credentials are missing.

**`lib/shopify/api.ts`** — typed GraphQL callers (`getShopInfo`, `getProducts`, `getOrders`). Each silently returns mock data in mock mode, or throws on API errors in live mode.

**`services/shopify.ts`** — assembles the full `StoreData` shape (shop + products + orders + computed `StoreMetrics`) via `getStoreData()`. Also exports `getProducts()` / `getOrders()` separately.

**`lib/shopify/cached.ts`** — `export const getStoreDataCached = cache(getStoreData)`. Import this instead of `getStoreData` directly in any server component so the root layout and pages share a single Shopify API call per navigation.

**`lib/analytics.ts`** — pure functions that compute `StoreMetrics` from raw products/orders arrays.

### Layout & Routing

The persistent sidebar lives in **`app/layout.tsx`** (root layout), not in individual pages. This is what keeps the sidebar mounted across client-side navigations. The layout fetches shop data once via `getStoreDataCached()`.

Each route has its own `loading.tsx` (content-area skeleton only — no sidebar) that Next.js shows automatically while the async page resolves.

```
app/
  layout.tsx          ← async; owns SidebarProvider + Sidebar + flex shell
  loading.tsx         ← overview content skeleton
  page.tsx            ← Overview: StoreStats + AIInsightsSection
  products/
    loading.tsx        ← products table skeleton
    page.tsx           ← ProductsTable
  orders/
    loading.tsx        ← orders table + summary skeleton
    page.tsx           ← OrdersTable + OrderSummary
  actions/
    analyse.ts         ← 'use server'; Gemini AI analysis server action
  api/auth/callback/   ← Shopify OAuth callback route
```

### AI Insights

**`app/actions/analyse.ts`** — `'use server'` file with two exports:
- `analyseStore(storeData)` — calls Gemini (`gemini-2.5-flash`, `thinkingBudget: 0`) and returns `StoreAnalysis | null`
- `analyseCurrentStore()` — no-arg wrapper that fetches store data server-side (avoids large client→server serialisation)

**`components/AIInsightsSection.tsx`** — `'use client'` component that calls `analyseCurrentStore()` once and caches the result in a **module-level variable** (`analysisCache`). Survives client-side route changes; resets only on full page refresh.

### Sidebar / Mobile Navigation

**`components/SidebarContext.tsx`** — `'use client'` context providing `{ isOpen, toggle, close }`.

**`components/Sidebar.tsx`** — `'use client'`; uses `usePathname()` for active nav state and `Link` from `next/link` for client-side navigation. Calls `close()` on each nav link click to dismiss on mobile.

**`components/MobileMenuButton.tsx`** — `'use client'`; hamburger/X button, reads `useSidebar()`. Rendered inside each page's sticky header.

### Key Type Shapes

- `StoreData` (`types/shopify.ts`) — the full assembled shape with `shop`, `products`, `orders`, `metrics`, `isMockData`
- `StoreAnalysis` (`types/analysis.ts`) — `{ overallScore, summary, insights[], quickWins[] }`
- `StoreMetrics` (`types/shopify.ts`) — computed KPIs derived by `calculateMetrics()` in `lib/analytics.ts`

### Styling

Tailwind v4 with PostCSS. No `tailwind.config.js` — configuration is CSS-first via `globals.css`.
