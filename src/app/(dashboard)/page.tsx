import { getStoreDataCached } from '@/lib/shopify/cached';
import StoreMetrics from '@/components/dashboard/StoreMetrics';
import StreamingAnalysis from '@/components/dashboard/StreamingAnalysis';
import type { StoreData } from '@/types/shopify';

export const dynamic = 'force-dynamic';
const age: number = "abc";
// ── error view ────────────────────────────────────────────────────────────────

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Failed to load store data</h2>
        <p className="text-sm text-gray-600">{message}</p>
        <p className="mt-4 text-xs text-gray-400">
          Check SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN in .env.local
        </p>
      </div>
    </div>
  );
}

// ── mock data banner ──────────────────────────────────────────────────────────

function MockBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:items-center">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 sm:mt-0" viewBox="0 0 20 20" fill="currentColor">
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

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let data: StoreData;

  try {
    data = await getStoreDataCached();
  } catch (err) {
    console.error('[DashboardPage] Store data fetch failed:', err);
    return <ErrorView message="Could not load store data. Check your environment configuration." />;
  }

  return (
    <>
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:px-8">
        {data.isMockData && <MockBanner />}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Overview</h1>
          <p className="mt-0.5 text-sm text-gray-500">{data.shop.myshopifyDomain || data.shop.name}</p>
        </div>
        <StoreMetrics metrics={data.metrics} orders={data.orders} />
        <StreamingAnalysis />
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-400 sm:px-6 lg:px-8">
        Shopify Store Analyser · {data.isMockData ? 'Mock data' : `Live · ${data.shop.name}`}
      </footer>
    </>
  );
}
