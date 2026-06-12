import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getStoreDataCached } from '@/lib/shopify/cached';
import { auditProduct } from '@/lib/audit/productAudit';
import { extractNumericId } from '@/lib/shopify/utils';
import MobileMenuButton from '@/components/MobileMenuButton';
import ScoreBadge from '@/components/audit/ScoreBadge';
import AuditBreakdown from '@/components/audit/AuditBreakdown';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const { products } = await getStoreDataCached();

  const product = products.find((p) => extractNumericId(p.id) === id);
  if (!product) notFound();

  const audit = auditProduct(product);

  const featuredImage = product.images[0];
  const minPrice = product.priceRangeV2.minVariantPrice;
  const maxPrice = product.priceRangeV2.maxVariantPrice;
  const priceDisplay =
    minPrice.amount === maxPrice.amount
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: minPrice.currencyCode }).format(parseFloat(minPrice.amount))
      : `${new Intl.NumberFormat('en-US', { style: 'currency', currency: minPrice.currencyCode }).format(parseFloat(minPrice.amount))} – ${new Intl.NumberFormat('en-US', { style: 'currency', currency: maxPrice.currencyCode }).format(parseFloat(maxPrice.amount))}`;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div className="flex items-center gap-2">
            <Link
              href="/products"
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-indigo-600"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Products
            </Link>
            <span className="text-gray-200">/</span>
            <h1 className="max-w-[180px] truncate text-sm font-bold text-gray-900 sm:max-w-xs">
              {product.title}
            </h1>
          </div>
        </div>
        <ScoreBadge score={audit.totalScore} grade={audit.grade} size="md" />
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Left column: product info ── */}
          <div className="space-y-4">

            {/* Product card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Featured image */}
              {featuredImage?.url ? (
                <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
                  <Image
                    src={featuredImage.url}
                    alt={featuredImage.altText ?? product.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-indigo-50">
                  <span className="text-5xl font-bold text-indigo-200">
                    {product.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-gray-900">{product.title}</h2>
                    {product.vendor && (
                      <p className="mt-0.5 text-sm text-gray-500">{product.vendor}</p>
                    )}
                  </div>
                  <ScoreBadge score={audit.totalScore} grade={audit.grade} size="lg" />
                </div>

                <p className="mt-2 text-lg font-semibold text-indigo-700">{priceDisplay}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {product.status === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active
                    </span>
                  )}
                  {product.status === 'DRAFT' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Draft
                    </span>
                  )}
                  {product.status === 'ARCHIVED' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />Archived
                    </span>
                  )}
                  {product.productType && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {product.productType}
                    </span>
                  )}
                  {product.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                      {tag}
                    </span>
                  ))}
                  {product.tags.length > 4 && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      +{product.tags.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Title & description */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Title & Description</h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Title</p>
                  <p className="text-sm text-gray-700">{product.title}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{product.title.length} characters</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Description</p>
                  {product.descriptionHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-600"
                      dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                  ) : (
                    <p className="text-sm italic text-gray-400">No description set.</p>
                  )}
                </div>
              </div>
            </div>

            {/* SEO fields */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">SEO Fields</h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">SEO Title</p>
                  {product.seo.title ? (
                    <>
                      <p className="text-sm text-gray-700">{product.seo.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{product.seo.title.length} characters</p>
                    </>
                  ) : (
                    <p className="text-sm italic text-gray-400">Not set</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">SEO Description</p>
                  {product.seo.description ? (
                    <>
                      <p className="text-sm text-gray-700">{product.seo.description}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{product.seo.description.length} characters</p>
                    </>
                  ) : (
                    <p className="text-sm italic text-gray-400">Not set</p>
                  )}
                </div>
              </div>
            </div>

            {/* Get Claude Suggestions button */}
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-sm font-semibold text-indigo-700 opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 5v5l3 3" />
              </svg>
              Get Claude Suggestions
              <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-500">
                Soon
              </span>
            </button>
          </div>

          {/* ── Right column: audit breakdown ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Audit Breakdown</h3>
            <AuditBreakdown result={audit} />
          </div>

        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-400 sm:px-6">
        Shopify Store Analyser · Product Audit
      </footer>
    </>
  );
}
