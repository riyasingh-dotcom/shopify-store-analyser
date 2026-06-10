// Server Component — orders table with coloured financial status badges
import type { Order, MoneyV2 } from '@/types/shopify';

function formatMoney(money: MoneyV2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function financialBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'paid')                              return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'pending')                           return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'refunded')                          return 'bg-red-50 text-red-600 border-red-200';
  if (s === 'authorized')                        return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.startsWith('partially'))                 return 'bg-orange-50 text-orange-600 border-orange-200';
  if (s === 'voided' || s === 'expired')         return 'bg-gray-100 text-gray-500 border-gray-200';
  if (s === 'unpaid')                            return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function fulfillmentDotColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'fulfilled')          return 'bg-emerald-500';
  if (s === 'unfulfilled')        return 'bg-gray-300';
  if (s.includes('partial'))      return 'bg-amber-400';
  if (s === 'in progress')        return 'bg-blue-400';
  return 'bg-gray-300';
}

interface OrdersTableProps {
  orders: Order[];
}

export default function OrdersTable({ orders }: OrdersTableProps) {
  const paidCount    = orders.filter((o) => o.displayFinancialStatus?.toLowerCase() === 'paid').length;
  const pendingCount = orders.filter((o) => o.displayFinancialStatus?.toLowerCase() === 'pending').length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <p className="mt-0.5 text-xs text-gray-500">{orders.length} most recent orders</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              {paidCount} paid
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/70">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Order</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Total</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</th>
                <th className="hidden px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Fulfillment</th>
                <th className="hidden px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="group transition-colors hover:bg-indigo-50/30">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {order.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {formatMoney(order.totalPriceSet.shopMoney)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${financialBadgeClass(order.displayFinancialStatus)}`}>
                      {order.displayFinancialStatus}
                    </span>
                  </td>
                  <td className="hidden px-6 py-4 sm:table-cell">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className={`h-2 w-2 rounded-full ${fulfillmentDotColor(order.displayFulfillmentStatus)}`} />
                      {order.displayFulfillmentStatus}
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 text-gray-400 sm:table-cell">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
