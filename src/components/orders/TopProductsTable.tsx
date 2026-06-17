'use client';

import { useState } from 'react';
import type { ProductRevenueEntry } from '@/lib/orders';

const PAGE_SIZE = 5;

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
  const [page, setPage] = useState(0);

  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">No product data available</p>
      </div>
    );
  }

  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageItems = products.slice(start, start + PAGE_SIZE);
  // Bar is always relative to the #1 product across all pages
  const maxRevenue = products[0]?.totalRevenue ?? 1;

  return (
    <section aria-label="Top products by revenue">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Top Products by Revenue</h2>
            <p className="text-xs text-gray-400">Ranked by total revenue across all orders</p>
          </div>
          {totalPages > 1 && (
            <span className="text-xs text-gray-400 tabular-nums">
              {start + 1}–{Math.min(start + PAGE_SIZE, products.length)} of {products.length}
            </span>
          )}
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
              {pageItems.map((p, i) => {
                const globalIndex = start + i;
                const revenuePerOrder = p.orderCount > 0 ? p.totalRevenue / p.orderCount : 0;
                const barPct = maxRevenue > 0 ? (p.totalRevenue / maxRevenue) * 100 : 0;

                return (
                  <tr key={p.productId} className="group transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-4 text-xs font-bold text-gray-300">
                      {String(globalIndex + 1).padStart(2, '0')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-medium leading-tight text-gray-900">
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
          {pageItems.map((p, i) => {
            const globalIndex = start + i;
            const revenuePerOrder = p.orderCount > 0 ? p.totalRevenue / p.orderCount : 0;
            const barPct = maxRevenue > 0 ? (p.totalRevenue / maxRevenue) * 100 : 0;

            return (
              <li key={p.productId} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 w-5 shrink-0 text-xs font-bold text-gray-300">
                      {String(globalIndex + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
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
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                    {formatCurrency(p.totalRevenue, currencyCode)}
                  </span>
                </div>
                <div className="ml-8 mt-2 flex gap-4 text-xs tabular-nums text-gray-400">
                  <span>{p.totalQuantity} units</span>
                  <span>{p.orderCount} orders</span>
                  <span>{formatCurrency(revenuePerOrder, currencyCode)} / order</span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
              Previous
            </button>

            <span className="text-xs font-medium text-gray-500">
              Page {page + 1} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages - 1}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
