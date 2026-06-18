import TopNav from '@/components/layout/TopNav';
import { getStoreDataCached } from '@/lib/shopify/cached';
import type { ShopInfo } from '@/types/shopify';

export const dynamic = 'force-dynamic';

const FALLBACK_SHOP: ShopInfo = {
  name: 'Store',
  email: '',
  myshopifyDomain: '',
  primaryDomain: { url: '' },
  currencyCode: 'USD',
  plan: { displayName: '' },
};

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let shop: ShopInfo = FALLBACK_SHOP;
  let isMockData = true;

  try {
    const result = await getStoreDataCached();
    ({ shop, isMockData } = result);
  } catch (err) {
    console.error('[MainLayout] getStoreDataCached failed, using fallback:', err);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav shop={shop} isMockData={isMockData} />
      <div className="flex min-w-0 flex-1 flex-col lg:px-24">
        {children}
      </div>
    </div>
  );
}
