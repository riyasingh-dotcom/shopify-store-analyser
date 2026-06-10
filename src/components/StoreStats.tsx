// Server Component — 4 KPI cards with icons
import type { DashboardData } from '@/types/shopify';

function PackageIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function ShoppingBagIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
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
      {/* Subtle top accent line */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accentColor}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
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

interface StoreStatsProps {
  data: DashboardData;
}

export default function StoreStats({ data }: StoreStatsProps) {
  const { products, orders } = data;

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const draftProducts = products.filter((p) => p.status === 'DRAFT').length;
  const activePercent = totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : 0;

  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const currencyCode = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD';
  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(revenue);

  const paidOrders = orders.filter((o) => o.displayFinancialStatus?.toLowerCase() === 'paid').length;

  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      <StatCard
        label="Total Products"
        value={totalProducts}
        subLabel="Draft:"
        subValue={String(draftProducts)}
        icon={<PackageIcon />}
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        accentColor="bg-indigo-500"
      />
      <StatCard
        label="Active Products"
        value={activeProducts}
        subLabel="of total:"
        subValue={`${activePercent}%`}
        icon={<CheckIcon />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        accentColor="bg-emerald-500"
      />
      <StatCard
        label="Total Orders"
        value={orders.length}
        subLabel="Paid:"
        subValue={String(paidOrders)}
        icon={<ShoppingBagIcon />}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        accentColor="bg-violet-500"
      />
      <StatCard
        label="Revenue"
        value={formattedRevenue}
        subLabel="Avg:"
        subValue={
          orders.length > 0
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(revenue / orders.length)
            : '—'
        }
        icon={<CurrencyIcon />}
        iconBg="bg-amber-50"
        iconColor="text-amber-600"
        accentColor="bg-amber-500"
      />
    </div>
  );
}
