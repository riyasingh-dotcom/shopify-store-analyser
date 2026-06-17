import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { SidebarProvider } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import { getStoreDataCached } from '@/lib/shopify/cached';
import type { ShopInfo } from '@/types/shopify';

const FALLBACK_SHOP: ShopInfo = {
  name: 'Store',
  email: '',
  myshopifyDomain: '',
  primaryDomain: { url: '' },
  currencyCode: 'USD',
  plan: { displayName: '' },
};

export const dynamic = 'force-dynamic';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'Shopify Store Analyser',
  description: 'Dashboard for analysing your Shopify store data',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Wrap in try/catch so a bad API key or unreachable store never crashes
  // the entire layout. The page's own error boundary handles content-area errors.
  let shop: ShopInfo = FALLBACK_SHOP;
  let isMockData = true;
  try {
    ({ shop, isMockData } = await getStoreDataCached());
  } catch (err) {
    console.error('[RootLayout] getStoreDataCached failed, using fallback:', err);
  }

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SidebarProvider>
          <div className="flex min-h-screen bg-gray-100">
            <Sidebar shop={shop} isMockData={isMockData} />
            <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
              {children}
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
