/**
 * Shopify service layer — the single entry point for all Shopify data.
 *
 * Sits between the page/components and the low-level lib:
 *   page.tsx  →  services/shopify.ts  →  lib/shopify/api.ts  →  lib/shopify/client.ts
 *
 * Exposes getProducts(), getOrders(), and getStoreData() which assembles
 * the full StoreData shape (shop + products + orders + computed metrics).
 */

import {
  getProducts as fetchProducts,
  getOrders as fetchOrders,
  getOrdersGraphQL,
  getShopInfo,
} from '@/lib/shopify/api';
import { isMockMode } from '@/lib/shopify/client';
import { calculateMetrics } from '@/lib/analytics';
import { flattenOrders, calculateRevenueMetrics } from '@/lib/orders';
import type { Product, Order, StoreData } from '@/types/shopify';
import type { FlatOrder, RevenueMetrics } from '@/lib/orders';

export async function getProducts(maxCount?: number): Promise<Product[]> {
  return fetchProducts(maxCount);
}

export async function getOrders(maxCount?: number): Promise<Order[]> {
  return fetchOrders(maxCount);
}

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
