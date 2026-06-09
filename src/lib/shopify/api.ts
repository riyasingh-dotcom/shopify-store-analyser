/**
 * High-level Shopify data-fetching functions.
 *
 * Each function:
 *  1. Returns mock data immediately if credentials are absent (isMockMode).
 *  2. Otherwise calls shopifyFetch() and transforms the GraphQL connection
 *     pattern (edges/node) into a plain array.
 *  3. Throws with a descriptive message on API errors so the page layer can
 *     catch them and render a user-facing error state.
 */

import { shopifyFetch, isMockMode } from './client';
import { SHOP_QUERY, PRODUCTS_QUERY, ORDERS_QUERY } from './queries';
import type {
  ShopInfo,
  Product,
  Order,
  ShopQuery,
  ProductsQuery,
  OrdersQuery,
} from '@/types/shopify';

// ---------------------------------------------------------------------------
// Mock data — used when SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_ACCESS_TOKEN
// are not set, so the UI is fully functional without a real store.
// ---------------------------------------------------------------------------

const MOCK_SHOP: ShopInfo = {
  name: 'Demo Store',
  email: 'demo@example.com',
  myshopifyDomain: 'demo-store.myshopify.com',
  primaryDomain: { url: 'https://demo-store.myshopify.com' },
  currencyCode: 'USD',
  plan: { displayName: 'Basic Shopify' },
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'gid://shopify/Product/1',
    title: 'Premium Cotton T-Shirt',
    status: 'ACTIVE',
    vendor: 'Acme Apparel',
    totalInventory: 145,
    priceRangeV2: {
      minVariantPrice: { amount: '29.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '39.99', currencyCode: 'USD' },
    },
  },
  {
    id: 'gid://shopify/Product/2',
    title: 'Wireless Earbuds Pro',
    status: 'ACTIVE',
    vendor: 'TechGear',
    totalInventory: 82,
    priceRangeV2: {
      minVariantPrice: { amount: '79.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '79.99', currencyCode: 'USD' },
    },
  },
  {
    id: 'gid://shopify/Product/3',
    title: 'Leather Wallet',
    status: 'DRAFT',
    vendor: 'Heritage Goods',
    totalInventory: 0,
    priceRangeV2: {
      minVariantPrice: { amount: '49.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '59.99', currencyCode: 'USD' },
    },
  },
  {
    id: 'gid://shopify/Product/4',
    title: 'Yoga Mat Classic',
    status: 'ACTIVE',
    vendor: 'FitLife',
    totalInventory: 30,
    priceRangeV2: {
      minVariantPrice: { amount: '34.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '34.99', currencyCode: 'USD' },
    },
  },
  {
    id: 'gid://shopify/Product/5',
    title: 'Coffee Mug XL',
    status: 'ARCHIVED',
    vendor: 'Morning Brew',
    totalInventory: 0,
    priceRangeV2: {
      minVariantPrice: { amount: '14.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '14.99', currencyCode: 'USD' },
    },
  },
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'gid://shopify/Order/1001',
    name: '#1001',
    totalPriceSet: { shopMoney: { amount: '159.97', currencyCode: 'USD' } },
    displayFinancialStatus: 'Paid',
    displayFulfillmentStatus: 'Fulfilled',
    createdAt: '2025-06-03T10:22:00Z',
  },
  {
    id: 'gid://shopify/Order/1002',
    name: '#1002',
    totalPriceSet: { shopMoney: { amount: '79.99', currencyCode: 'USD' } },
    displayFinancialStatus: 'Pending',
    displayFulfillmentStatus: 'Unfulfilled',
    createdAt: '2025-06-04T14:05:00Z',
  },
  {
    id: 'gid://shopify/Order/1003',
    name: '#1003',
    totalPriceSet: { shopMoney: { amount: '229.96', currencyCode: 'USD' } },
    displayFinancialStatus: 'Paid',
    displayFulfillmentStatus: 'Partially fulfilled',
    createdAt: '2025-06-04T16:30:00Z',
  },
  {
    id: 'gid://shopify/Order/1004',
    name: '#1004',
    totalPriceSet: { shopMoney: { amount: '49.99', currencyCode: 'USD' } },
    displayFinancialStatus: 'Refunded',
    displayFulfillmentStatus: 'Restocked',
    createdAt: '2025-06-05T08:11:00Z',
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getShopInfo(): Promise<ShopInfo> {
  if (isMockMode()) return MOCK_SHOP;

  const { data, error } = await shopifyFetch<ShopQuery>({ query: SHOP_QUERY });
  if (error || !data) throw new Error(error ?? 'Failed to fetch shop info');
  return data.shop;
}

export async function getProducts(maxCount = 250): Promise<Product[]> {
  if (isMockMode()) return MOCK_PRODUCTS;

  const all: Product[] = [];
  let cursor: string | undefined;

  do {
    const batchSize = Math.min(250, maxCount - all.length);
    const { data, error } = await shopifyFetch<ProductsQuery>({
      query: PRODUCTS_QUERY,
      variables: { first: batchSize, after: cursor },
    });
    if (error || !data) throw new Error(error ?? 'Failed to fetch products');

    all.push(...data.products.edges.map(({ node }) => node));
    cursor = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : undefined;
  } while (cursor && all.length < maxCount);

  return all;
}

export async function getOrders(maxCount = 250): Promise<Order[]> {
  if (isMockMode()) return MOCK_ORDERS;

  const all: Order[] = [];
  let cursor: string | undefined;

  do {
    const batchSize = Math.min(250, maxCount - all.length);
    const { data, error } = await shopifyFetch<OrdersQuery>({
      query: ORDERS_QUERY,
      variables: { first: batchSize, after: cursor },
    });
    if (error || !data) throw new Error(error ?? 'Failed to fetch orders');

    all.push(...data.orders.edges.map(({ node }) => node));
    cursor = data.orders.pageInfo.hasNextPage
      ? data.orders.pageInfo.endCursor
      : undefined;
  } while (cursor && all.length < maxCount);

  return all;
}

