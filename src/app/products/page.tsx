import { getStoreDataCached } from '@/lib/shopify/cached';
import MobileMenuButton from '@/components/MobileMenuButton';
import ProductsTable from '@/components/ProductsTable';

export default async function ProductsPage() {
  const { shop, products, isMockData } = await getStoreDataCached();

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-base font-bold text-gray-900">Products</h1>
            <p className="hidden text-xs text-gray-400 sm:block">{products.length} products</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 ${isMockData ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isMockData ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          {isMockData ? 'Demo' : 'Live'}
          <span className="hidden sm:inline">{isMockData ? ' mode' : ' data'}</span>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <ProductsTable products={products} />
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-400 sm:px-6">
        Shopify Store Analyser · {isMockData ? 'Mock data' : `Live · ${shop.name}`}
      </footer>
    </>
  );
}
