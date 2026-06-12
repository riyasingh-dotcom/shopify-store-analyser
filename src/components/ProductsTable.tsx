'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product, ProductStatus, ProductImage, MoneyV2 } from '@/types/shopify';
import type { ProductAuditResult } from '@/lib/audit/productAudit';
import { extractNumericId } from '@/lib/shopify/utils';
import ScoreBadge from '@/components/audit/ScoreBadge';

const PAGE_SIZE = 10;

// ── helpers ───────────────────────────────────────────────────────────────────

function formatMoney(money: MoneyV2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}

function formatPriceRange(product: Product): string {
  const { minVariantPrice, maxVariantPrice } = product.priceRangeV2;
  if (minVariantPrice.amount === maxVariantPrice.amount) return formatMoney(minVariantPrice);
  return `${formatMoney(minVariantPrice)} – ${formatMoney(maxVariantPrice)}`;
}

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ProductStatus, { dot: string; bg: string; text: string; label: string }> = {
  ACTIVE:   { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active'   },
  DRAFT:    { dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-600',    label: 'Draft'    },
  ARCHIVED: { dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-600',     label: 'Archived' },
};

function StatusBadge({ status }: { status: ProductStatus }) {
  const { dot, bg, text, label } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ── product thumbnail ─────────────────────────────────────────────────────────

function ProductThumbnail({ image, title }: { image: ProductImage | undefined; title: string }) {
  const [error, setError] = useState(false);

  if (!image?.url || error) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
        {title.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={image.url}
      alt={image.altText ?? title}
      width={48}
      height={48}
      className="h-12 w-12 shrink-0 rounded-lg object-cover"
      onError={() => setError(true)}
    />
  );
}

// ── inventory bar ─────────────────────────────────────────────────────────────

function InventoryBar({ value, max }: { value: number; max: number }) {
  const pct   = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = value === 0 ? 'bg-red-400' : value < 10 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${value === 0 ? 'text-red-500' : value < 10 ? 'text-amber-600' : 'text-gray-600'}`}>
        {value}
      </span>
    </div>
  );
}

// ── summary pill ──────────────────────────────────────────────────────────────

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${color}`}>
      <span>{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

// ── pagination controls ───────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

function Pagination({ page, totalPages, totalItems, pageSize, onPrev, onNext }: PaginationProps) {
  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 sm:px-6">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span> products
      </p>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 sm:flex">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === page ? 'bg-indigo-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="mx-2 text-xs text-gray-400">{page + 1} / {totalPages}</span>
        <button
          onClick={onPrev}
          disabled={page === 0}
          aria-label="Previous page"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

interface ProductsTableProps {
  products: Product[];
  audits: Record<string, ProductAuditResult>;
}

export default function ProductsTable({ products, audits }: ProductsTableProps) {
  const [page, setPage] = useState(0);

  const totalPages   = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const visibleRows  = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxInventory = Math.max(...products.map((p) => p.totalInventory), 1);

  const active   = products.filter((p) => p.status === 'ACTIVE').length;
  const draft    = products.filter((p) => p.status === 'DRAFT').length;
  const archived = products.filter((p) => p.status === 'ARCHIVED').length;
  const lowStock = products.filter((p) => p.totalInventory > 0 && p.totalInventory < 10).length;

  const needsAttention = Object.values(audits).filter(
    (a) => a.grade === 'D' || a.grade === 'F',
  ).length;
  const goodProducts = Object.values(audits).filter(
    (a) => a.grade === 'A' || a.grade === 'B',
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Products</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {products.length} products · sorted by audit score (worst first)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SummaryPill label="Active"    value={active}   color="bg-emerald-50 text-emerald-700" />
            <SummaryPill label="Draft"     value={draft}    color="bg-gray-100 text-gray-600" />
            <SummaryPill label="Archived"  value={archived} color="bg-red-50 text-red-600" />
            {goodProducts > 0 && (
              <SummaryPill label="Good (A/B)"      value={goodProducts}    color="bg-blue-50 text-blue-700" />
            )}
            {needsAttention > 0 && (
              <SummaryPill label="Needs attention" value={needsAttention}  color="bg-orange-50 text-orange-700" />
            )}
            {lowStock > 0 && (
              <SummaryPill label="Low stock" value={lowStock} color="bg-amber-50 text-amber-700" />
            )}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No products found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/70">
                <tr>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Image</th>
                  <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:px-4">Product</th>
                  <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:px-4">Status</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Vendor</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Variants</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Price</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:table-cell">Inventory</th>
                  <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:px-4">Score</th>
                  <th className="px-2 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:px-4">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleRows.map((product) => {
                  const audit = audits[product.id];
                  const numericId = extractNumericId(product.id);
                  return (
                    <tr key={product.id} className="group transition-colors hover:bg-indigo-50/30">
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <ProductThumbnail image={product.images[0]} title={product.title} />
                      </td>
                      <td className="px-2 py-3 sm:px-4 sm:py-4">
                        <span className="block max-w-28 truncate font-medium text-gray-900 transition-colors group-hover:text-indigo-700 sm:max-w-44">
                          {product.title}
                        </span>
                      </td>
                      <td className="px-2 py-3 sm:px-4 sm:py-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="hidden px-4 py-4 text-gray-500 sm:table-cell">
                        {product.vendor || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="hidden px-4 py-4 sm:table-cell">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {product.variants.length}
                        </span>
                      </td>
                      <td className="hidden px-4 py-4 font-medium text-gray-700 sm:table-cell">
                        {formatPriceRange(product)}
                      </td>
                      <td className="hidden px-4 py-4 sm:table-cell">
                        {product.status === 'ARCHIVED' ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <InventoryBar value={product.totalInventory} max={maxInventory} />
                        )}
                      </td>
                      <td className="px-2 py-3 sm:px-4 sm:py-4">
                        {audit ? (
                          <ScoreBadge score={audit.totalScore} grade={audit.grade} size="sm" />
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 sm:px-4 sm:py-4">
                        <Link
                          href={`/products/${numericId}`}
                          aria-label={`View audit for ${product.title}`}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={products.length}
              pageSize={PAGE_SIZE}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
}
