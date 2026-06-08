import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/SidebarContext';
import Sidebar from '@/components/Sidebar';
import { getStoreDataCached } from '@/lib/shopify/cached';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Shopify Store Analyser',
  description: 'Dashboard for analysing your Shopify store data',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { shop, isMockData } = await getStoreDataCached();

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
