import { getDashboardData } from '@/lib/shopify/api';
import Sidebar from '@/components/Sidebar';
import StoreStats from '@/components/StoreStats';
import ProductsTable from '@/components/ProductsTable';
import OrdersTable from '@/components/OrdersTable';
import OrderSummary from '@/components/OrderSummary';
import type { DashboardData } from '@/types/shopify';

// ── error view ────────────────────────────────────────────────────────────────

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-red-900/40 bg-gray-900 p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30">
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-white">Failed to load store data</h2>
        <p className="text-sm text-gray-400">{message}</p>
        <p className="mt-4 text-xs text-gray-600">
          Check SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env.local
        </p>
      </div>
    </div>
  );
}

// ── mock data banner ──────────────────────────────────────────────────────────

function MockBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <svg className="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span>
        <strong>Demo mode</strong> — Shopify credentials not found. Showing mock data.
        Add <code className="rounded bg-amber-100 px-1 font-mono text-xs">SHOPIFY_STORE_DOMAIN</code> and{' '}
        <code className="rounded bg-amber-100 px-1 font-mono text-xs">SHOPIFY_ADMIN_ACCESS_TOKEN</code> to .env.local.
      </span>
    </div>
  );
}

// ── top bar ───────────────────────────────────────────────────────────────────

function TopBar({ data }: { data: DashboardData }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-6 backdrop-blur-sm">
      <div>
        <h1 className="text-base font-bold text-gray-900">Overview</h1>
        <p className="text-xs text-gray-400">{data.shop.myshopifyDomain}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-gray-400 sm:block">{data.shop.currencyCode}</span>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${data.isMockData ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${data.isMockData ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          {data.isMockData ? 'Demo mode' : 'Live data'}
        </div>
      </div>
    </header>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let data: DashboardData;

  try {
    data = await getDashboardData();
  } catch (err) {
    return <ErrorView message={err instanceof Error ? err.message : 'Unknown error'} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar shop={data.shop} isMockData={data.isMockData} />

      {/* main content shifted right of sidebar */}
      <div className="flex flex-1 flex-col lg:ml-64">
        <TopBar data={data} />

        <main className="flex-1 space-y-6 p-6">
          {data.isMockData && <MockBanner />}

          {/* KPI cards */}
          <StoreStats data={data} />

          {/* Products table + Order summary side panel */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ProductsTable products={data.products} />
            </div>
            <div>
              <OrderSummary orders={data.orders} />
            </div>
          </div>

          {/* Orders table */}
          <OrdersTable orders={data.orders} />
        </main>

        <footer className="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-400">
          Shopify Store Analyser · {data.isMockData ? 'Mock data' : `Live · ${data.shop.name}`}
        </footer>
      </div>
    </div>
  );
}
