import type { ProductRevenueEntry } from '@/lib/orders';

type Props = {
  products: ProductRevenueEntry[];
  currencyCode: string;
};

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function TopProductsTable({ products, currencyCode }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">No product data available</p>
      </div>
    );
  }

  const maxRevenue = products[0]?.totalRevenue ?? 1;

  return (
    <section aria-label="Top products by revenue">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Top Products by Revenue</h2>
          <p className="text-xs text-gray-400">Ranked by total revenue across all orders</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3 text-right">Units Sold</th>
                <th className="px-5 py-3 text-right">Orders</th>
                <th className="px-5 py-3 text-right">Rev / Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p, i) => {
                const revenuePerOrder = p.orderCount > 0 ? p.totalRevenue / p.orderCount : 0;
                const barPct = maxRevenue > 0 ? (p.totalRevenue / maxRevenue) * 100 : 0;

                return (
                  <tr key={p.productId} className="group hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-xs font-bold text-gray-300">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium text-gray-900 leading-tight">
                          {p.productTitle || 'Unknown Product'}
                        </span>
                        <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{ width: `${barPct.toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-gray-900">
                      {formatCurrency(p.totalRevenue, currencyCode)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-600">
                      {p.totalQuantity.toLocaleString('en-US')}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-600">
                      {p.orderCount.toLocaleString('en-US')}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-gray-600">
                      {formatCurrency(revenuePerOrder, currencyCode)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y divide-gray-100 md:hidden">
          {products.map((p, i) => {
            const revenuePerOrder = p.orderCount > 0 ? p.totalRevenue / p.orderCount : 0;
            const barPct = maxRevenue > 0 ? (p.totalRevenue / maxRevenue) * 100 : 0;

            return (
              <li key={p.productId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 text-xs font-bold text-gray-300 w-5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 text-sm">
                        {p.productTitle || 'Unknown Product'}
                      </p>
                      <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${barPct.toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-gray-900 text-sm">
                    {formatCurrency(p.totalRevenue, currencyCode)}
                  </span>
                </div>
                <div className="mt-2 ml-8 flex gap-4 text-xs text-gray-400 tabular-nums">
                  <span>{p.totalQuantity} units</span>
                  <span>{p.orderCount} orders</span>
                  <span>{formatCurrency(revenuePerOrder, currencyCode)} / order</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
