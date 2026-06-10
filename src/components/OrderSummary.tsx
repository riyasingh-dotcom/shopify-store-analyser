// Server Component — order status breakdown + revenue summary panel
import type { Order, MoneyV2 } from '@/types/shopify';

function formatMoney(money: MoneyV2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
    maximumFractionDigits: 0,
  }).format(parseFloat(money.amount));
}

interface StatusBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function StatusBar({ label, count, total, color }: StatusBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          <span className="text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{count}</span>
          <span className="text-xs text-gray-400">{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface OrderSummaryProps {
  orders: Order[];
}

export default function OrderSummary({ orders }: OrderSummaryProps) {
  const total = orders.length;

  // Group by financial status (case-insensitive match on first word)
  const counts: Record<string, number> = {};
  let revenue = 0;
  for (const order of orders) {
    const key = order.displayFinancialStatus ?? 'Unknown';
    counts[key] = (counts[key] ?? 0) + 1;
    revenue += parseFloat(order.totalPriceSet.shopMoney.amount);
  }

  const currencyCode = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD';

  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(revenue);

  const statusColors: Record<string, string> = {
    Paid: 'bg-emerald-500',
    Pending: 'bg-amber-400',
    Refunded: 'bg-red-400',
    'Partially paid': 'bg-blue-400',
    'Partially refunded': 'bg-orange-400',
    Authorized: 'bg-blue-500',
    Voided: 'bg-gray-400',
    Unpaid: 'bg-red-500',
  };

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>
        <p className="mt-0.5 text-xs text-gray-500">Payment status breakdown</p>
      </div>

      {/* Revenue */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">Total Revenue</p>
        <p className="mt-1 text-3xl font-bold text-white">{formattedRevenue}</p>
        <p className="mt-1 text-xs text-indigo-200">from {total} order{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Status breakdown */}
      <div className="flex-1 space-y-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">By Status</p>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400">No orders</p>
        ) : (
          sorted.map(([status, count]) => (
            <StatusBar
              key={status}
              label={status}
              count={count}
              total={total}
              color={statusColors[status] ?? 'bg-gray-400'}
            />
          ))
        )}
      </div>

      {/* Avg order value */}
      <div className="border-t border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Avg. order value</span>
          <span className="text-sm font-semibold text-gray-800">
            {total > 0
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(revenue / total)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
