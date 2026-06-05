import { getStoreData } from '@/services/shopify';
import { analyseStore } from '@/app/actions/analyse';
import { SidebarProvider } from '@/components/SidebarContext';
import MobileMenuButton from '@/components/MobileMenuButton';
import Sidebar from '@/components/Sidebar';
import StoreStats from '@/components/StoreStats';
import ProductsTable from '@/components/ProductsTable';
import OrdersTable from '@/components/OrdersTable';
import OrderSummary from '@/components/OrderSummary';
import StoreScoreCard from '@/components/StoreScoreCard';
import InsightCard from '@/components/InsightCard';
import QuickWins from '@/components/QuickWins';
import type { StoreData } from '@/types/shopify';
import type { StoreAnalysis } from '@/types/analysis';

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

// ── analysis missing banner ───────────────────────────────────────────────────

function AnalysisMissingBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:items-center">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 sm:mt-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
      <span>
        <strong>AI analysis unavailable</strong> — Add{' '}
        <code className="rounded bg-gray-200 px-1 font-mono text-xs">ANTHROPIC_API_KEY</code> to .env.local to enable Claude-powered store insights.
      </span>
    </div>
  );
}

// ── top bar ───────────────────────────────────────────────────────────────────

function TopBar({ data }: { data: StoreData }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible on mobile only, client component */}
        <MobileMenuButton />
        <div>
          <h1 className="text-base font-bold text-gray-900">Overview</h1>
          <p className="hidden text-xs text-gray-400 sm:block">{data.shop.myshopifyDomain}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-xs text-gray-400 sm:block">{data.shop.currencyCode}</span>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 ${data.isMockData ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${data.isMockData ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          {data.isMockData ? 'Demo' : 'Live'}
          <span className="hidden sm:inline">{data.isMockData ? ' mode' : ' data'}</span>
        </div>
      </div>
    </header>
  );
}

// ── AI insights section ───────────────────────────────────────────────────────

function AIInsightsSection({ analysis }: { analysis: StoreAnalysis }) {
  const order = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...analysis.insights].sort((a, b) => {
    const ap = (order as Record<string, number>)[a.priority] ?? 1;
    const bp = (order as Record<string, number>)[b.priority] ?? 1;
    return ap - bp;
  });

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
          <svg className="h-4 w-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">AI-Powered Insights</h2>
          <p className="text-xs text-gray-500">Powered by Claude · {sorted.length} insight{sorted.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Score card + quick wins */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StoreScoreCard analysis={analysis} />
        </div>
        <div>
          <QuickWins items={analysis.quickWins} />
        </div>
      </div>

      {/* Insight cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((insight, i) => (
          <InsightCard key={i} insight={insight} />
        ))}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let data: StoreData;

  try {
    data = await getStoreData();
  } catch (err) {
    return <ErrorView message={err instanceof Error ? err.message : 'Unknown error'} />;
  }

  let analysis: StoreAnalysis | null = null;
  try {
    analysis = await analyseStore(data);
  } catch (err) {
    console.error('[DashboardPage] analyseStore threw unexpectedly:', err);
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar shop={data.shop} isMockData={data.isMockData} />

        {/* Main content — offset right of sidebar on lg+ */}
        <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
          <TopBar data={data} />

          <main className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
            {data.isMockData && <MockBanner />}

            {/* KPI cards */}
            <StoreStats data={data} />

            {/* AI analysis — or nudge banner if key is missing */}
            {analysis ? (
              <AIInsightsSection analysis={analysis} />
            ) : (
              <AnalysisMissingBanner />
            )}

            {/* Products table + Order summary side panel */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
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

          <footer className="border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-400 sm:px-6">
            Shopify Store Analyser · {data.isMockData ? 'Mock data' : `Live · ${data.shop.name}`}
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
