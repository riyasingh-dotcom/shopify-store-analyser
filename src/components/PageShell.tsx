// Shared outer shell for every dashboard page.
// Server component — composes SidebarProvider (client) and Sidebar (client)
// with server-rendered children, which is valid in the App Router.
import { type ReactNode } from 'react';
import { SidebarProvider } from './SidebarContext';
import Sidebar from './Sidebar';
import type { ShopInfo } from '@/types/shopify';

interface PageShellProps {
  shop: ShopInfo;
  isMockData: boolean;
  children: ReactNode;
}

export default function PageShell({ shop, isMockData, children }: PageShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar shop={shop} isMockData={isMockData} />
        <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
