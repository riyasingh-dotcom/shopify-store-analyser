import type { StoreMetrics as TStoreMetrics, Order } from '@/types/shopify';

interface StoreMetricsProps {
  metrics: TStoreMetrics;
  orders: Order[];
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function PackageIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel: string;
  subValue: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

function StatCard({ label, value, subLabel, subValue, icon, iconBg, iconColor, accentColor }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accentColor}`} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-sm">
        <span className="text-gray-400">{subLabel}</span>
        <span className="font-semibold text-gray-700">{subValue}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoreMetrics
// ---------------------------------------------------------------------------

export default function StoreMetrics({ metrics, orders }: StoreMetricsProps) {
  const { currencyCode, totalProducts, activeProducts, totalRevenue, averageOrderValue, totalOrders } = metrics;

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(amount);

  const fmtShort = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);

  const fulfilledOrders = orders.filter(
    (o) => o.displayFulfillmentStatus?.toLowerCase() === 'fulfilled',
  ).length;
  const fulfillmentRate =
    totalOrders > 0 ? Math.round((fulfilledOrders / totalOrders) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <StatCard
        label="Total Products"
        value={totalProducts}
        subLabel="Active:"
        subValue={String(activeProducts)}
        icon={<PackageIcon />}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        accentColor="bg-indigo-500"
      />
      <StatCard
        label="Total Revenue"
        value={fmt(totalRevenue)}
        subLabel="Orders:"
        subValue={String(totalOrders)}
        icon={<CurrencyIcon />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        accentColor="bg-emerald-500"
      />
      <StatCard
        label="Avg Order Value"
        value={fmtShort(averageOrderValue)}
        subLabel="From:"
        subValue={`${totalOrders} orders`}
        icon={<ChartIcon />}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        accentColor="bg-violet-500"
      />
      <StatCard
        label="Fulfillment Rate"
        value={`${fulfillmentRate}%`}
        subLabel="Fulfilled:"
        subValue={`${fulfilledOrders} of ${totalOrders}`}
        icon={<TruckIcon />}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        accentColor="bg-amber-500"
      />
    </div>
  );
}
