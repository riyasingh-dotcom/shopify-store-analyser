import { getStoreDataCached } from '@/lib/shopify/cached';
import { getOrdersData } from '@/services/shopify';
import {
  getRevenueByDay,
  getOrdersByStatus,
  getOrdersByFulfilmentStatus,
  getRepeatCustomerRate,
  getTopProductsByRevenue,
} from '@/lib/orders';
import { getLatestOrdersAnalysis, getOrdersAnalysisHistory } from '@/lib/ordersAnalysisDb';
import MobileMenuButton from '@/components/MobileMenuButton';
import RevenueMetrics from '@/components/orders/RevenueMetrics';
import RevenueChart from '@/components/orders/RevenueChart';
import OrderStatusBreakdown from '@/components/orders/OrderStatusBreakdown';
import CustomerInsight from '@/components/orders/CustomerInsight';
import TopProductsTable from '@/components/orders/TopProductsTable';
import OrdersAnalysis from '@/components/orders/OrdersAnalysis';
import type { FlatOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

function getDateRangeLabel(orders: FlatOrder[]): string {
  if (orders.length === 0) return 'No orders in range';

  const timestamps = orders.map((o) => new Date(o.createdAt).getTime());
  const min = new Date(Math.min(...timestamps));
  const max = new Date(Math.max(...timestamps));

  const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const fullFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (min.toDateString() === max.toDateString()) return fullFmt.format(min);
  return `${shortFmt.format(min)} – ${fullFmt.format(max)}`;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Failed to load orders</h2>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

export default async function OrdersPage() {
  const [{ shop, isMockData }, ordersResult, latestAnalysis, history] = await Promise.all([
    getStoreDataCached(),
    getOrdersData(),
    getLatestOrdersAnalysis().catch(() => null),
    getOrdersAnalysisHistory(10).catch(() => []),
  ]);

  if ('error' in ordersResult) {
    return <ErrorState message={ordersResult.error} />;
  }

  const { orders, metrics } = ordersResult;
  const storeDomain = shop.myshopifyDomain || shop.name;
  const dateRange = getDateRangeLabel(orders);
  const revenueByDay = getRevenueByDay(orders);
  const ordersByStatus = getOrdersByStatus(orders);
  const ordersByFulfilment = getOrdersByFulfilmentStatus(orders);
  const repeatRate = getRepeatCustomerRate(orders);
  const topProducts = getTopProductsByRevenue(orders, 50);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-base font-bold text-gray-900">Orders Intelligence</h1>
            <p className="hidden text-xs text-gray-400 sm:block">{dateRange}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 ${isMockData ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isMockData ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          {isMockData ? 'Demo' : 'Live'}
          <span className="hidden sm:inline">{isMockData ? ' mode' : ' data'}</span>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4 sm:p-6">
        {/* 2 — Revenue Metrics */}
        <RevenueMetrics metrics={metrics} />

        {/* 3 — AI Orders Analysis (on-demand) */}
        <OrdersAnalysis
          orders={orders}
          storeDomain={storeDomain}
          initialAnalysis={latestAnalysis}
          history={history}
        />

        {/* 4 — Revenue Over Time (full width) */}
        <RevenueChart data={revenueByDay} currencyCode={metrics.currencyCode} />

        {/* 4 — Order Status (left) + Customer Insight (right) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OrderStatusBreakdown
            byFinancialStatus={ordersByStatus}
            byFulfilmentStatus={ordersByFulfilment}
          />
          <CustomerInsight rate={repeatRate} />
        </div>

        {/* 5 — Top Products (full width) */}
        <TopProductsTable products={topProducts} currencyCode={metrics.currencyCode} />
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-400 sm:px-6">
        Shopify Store Analyser · {isMockData ? 'Mock data' : `Live · ${shop.name}`}
      </footer>
    </>
  );
}
