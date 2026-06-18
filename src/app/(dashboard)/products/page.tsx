import { getStoreDataCached } from '@/lib/shopify/cached';
import ProductsTable from '@/components/products/ProductsTable';
import BulkOptimise from '@/components/products/BulkOptimise';
import { auditProduct } from '@/lib/analysis/products/productAudit';
import type { ProductAuditResult } from '@/lib/analysis/products/productAudit';
import { prisma } from '@/lib/prisma';
import { extractNumericId } from '@/lib/shopify/utils';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const { shop, products, isMockData } = await getStoreDataCached();

  const audits: Record<string, ProductAuditResult> = Object.fromEntries(
    products.map((p) => [p.id, auditProduct(p)]),
  );

  const sorted = [...products].sort(
    (a, b) => (audits[a.id]?.totalScore ?? 0) - (audits[b.id]?.totalScore ?? 0),
  );

  // Products graded D or F that don't already have a saved suggestion.
  const poorGradeIds = products
    .filter((p) => {
      const g = audits[p.id]?.grade;
      return g === 'D' || g === 'F';
    })
    .map((p) => p.id);

  const alreadySaved = await prisma.productSuggestion
    .findMany({
      where: { productId: { in: poorGradeIds } },
      select: { productId: true },
      distinct: ['productId'],
    })
    .then((rows) => new Set(rows.map((r) => r.productId)));

  const poorProducts = products
    .filter((p) => {
      const g = audits[p.id]?.grade;
      return (g === 'D' || g === 'F') && !alreadySaved.has(p.id);
    })
    .slice(0, 5)
    .map((p) => ({
      id: extractNumericId(p.id),
      title: p.title,
      score: audits[p.id]?.totalScore ?? 0,
      product: p,
      auditResult: audits[p.id]!,
    }));

  return (
    <>
      <main className="flex-1 p-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">{products.length} products · sorted by audit score</p>
        </div>

        {poorProducts.length > 0 && (
          <div className="mb-5">
            <BulkOptimise poorProducts={poorProducts} />
          </div>
        )}

        <ProductsTable products={sorted} audits={audits} />
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-400 lg:px-8">
        Shopify Store Analyser · {isMockData ? 'Mock data' : `Live · ${shop.name}`}
      </footer>
    </>
  );
}
