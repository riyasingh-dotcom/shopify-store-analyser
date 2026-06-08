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
  getShopInfo,
} from '@/lib/shopify/api';
import { isMockMode } from '@/lib/shopify/client';
import { calculateMetrics } from '@/lib/analytics';
import type { Product, Order, StoreData } from '@/types/shopify';

export async function getProducts(maxCount?: number): Promise<Product[]> {
  return fetchProducts(maxCount);
}

export async function getOrders(maxCount?: number): Promise<Order[]> {
  return fetchOrders(maxCount);
}

export async function getStoreData(): Promise<StoreData> {
  const [shop, products, orders] = await Promise.all([
    getShopInfo(),
    getProducts(),
    getOrders(),
  ]);

  return {
    shop,
    products,
    orders,
    metrics: calculateMetrics(products, orders),
    isMockData: isMockMode(),
  };
}
