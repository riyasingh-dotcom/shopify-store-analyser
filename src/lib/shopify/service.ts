import { getShopInfo, getProducts, getOrders, getOrdersGraphQL } from './api';
import { isMockMode } from './client';
import { calculateMetrics } from '@/lib/analysis/store/analytics';
import { flattenOrders, calculateRevenueMetrics } from '@/lib/analysis/orders/orders';
import type { StoreData } from '@/types/shopify';
import type { FlatOrder, RevenueMetrics } from '@/lib/analysis/orders/orders';

export async function getOrdersData(): Promise<
  { orders: FlatOrder[]; metrics: RevenueMetrics } | { error: string }
> {
  try {
    const { orders: rawOrders } = await getOrdersGraphQL();
    const orders = flattenOrders(rawOrders);
    const metrics = calculateRevenueMetrics(orders);
    return { orders, metrics };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch orders',
    };
  }
}

export async function getStoreData(): Promise<StoreData> {
  // Fetch shop info first (cheap), then products and orders together.
  // Splitting into two waves halves the concurrent Shopify call count when
  // this runs alongside other page-level queries (e.g. getOrdersGraphQL),
  // keeping the GraphQL cost bucket from draining all at once.
  const shop = await getShopInfo();
  const [products, orders] = await Promise.all([getProducts(), getOrders()]);

  return {
    shop,
    products,
    orders,
    metrics: calculateMetrics(products, orders),
    isMockData: isMockMode(),
  };
}
