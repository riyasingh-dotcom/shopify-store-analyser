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
  ProductRawNode,
  Order,
  ShopQuery,
  ProductsQuery,
  OrdersQuery,
} from '@/types/shopify';

/** Flattens Shopify connection sub-objects (variants, images) into plain arrays. */
function flattenProduct(raw: ProductRawNode): Product {
  return {
    ...raw,
    variants: raw.variants.edges.map(({ node }) => node),
    images: raw.images.edges.map(({ node }) => node),
  };
}

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
    descriptionHtml: '<p>Soft, breathable 100% cotton T-shirt for everyday wear. Pre-shrunk fabric, reinforced stitching.</p>',
    status: 'ACTIVE',
    vendor: 'Acme Apparel',
    productType: 'Apparel',
    tags: ['cotton', 'unisex', 'summer', 'basics'],
    onlineStoreUrl: 'https://demo-store.myshopify.com/products/premium-cotton-t-shirt',
    seo: {
      title: 'Premium Cotton T-Shirt | Acme Apparel',
      description: 'Shop our soft, breathable premium cotton T-shirt. Pre-shrunk, reinforced stitching. Available in S–XL.',
    },
    totalInventory: 145,
    priceRangeV2: {
      minVariantPrice: { amount: '29.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '39.99', currencyCode: 'USD' },
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/101', title: 'S', price: '29.99', inventoryQuantity: 50, sku: 'TSHIRT-S' },
      { id: 'gid://shopify/ProductVariant/102', title: 'M', price: '29.99', inventoryQuantity: 60, sku: 'TSHIRT-M' },
      { id: 'gid://shopify/ProductVariant/103', title: 'L / Blue', price: '39.99', inventoryQuantity: 35, sku: 'TSHIRT-L-BLU' },
    ],
    images: [
      { url: 'https://cdn.shopify.com/s/files/mock/t-shirt-front.jpg', altText: 'Premium Cotton T-Shirt — front view' },
      { url: 'https://cdn.shopify.com/s/files/mock/t-shirt-back.jpg', altText: null },
    ],
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-05-20T14:00:00Z',
  },
  {
    id: 'gid://shopify/Product/2',
    title: 'Wireless Earbuds Pro',
    descriptionHtml: '<p>True wireless earbuds with active noise cancellation, 30-hour battery life, and IPX5 water resistance.</p>',
    status: 'ACTIVE',
    vendor: 'TechGear',
    productType: 'Electronics',
    tags: ['wireless', 'audio', 'anc', 'earbuds'],
    onlineStoreUrl: 'https://demo-store.myshopify.com/products/wireless-earbuds-pro',
    seo: {
      title: null,
      description: null,
    },
    totalInventory: 82,
    priceRangeV2: {
      minVariantPrice: { amount: '79.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '79.99', currencyCode: 'USD' },
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/201', title: 'Black', price: '79.99', inventoryQuantity: 50, sku: 'EARBUDS-BLK' },
      { id: 'gid://shopify/ProductVariant/202', title: 'White', price: '79.99', inventoryQuantity: 32, sku: 'EARBUDS-WHT' },
    ],
    images: [
      { url: 'https://cdn.shopify.com/s/files/mock/earbuds.jpg', altText: 'Wireless Earbuds Pro in charging case' },
    ],
    createdAt: '2025-02-14T11:30:00Z',
    updatedAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'gid://shopify/Product/3',
    title: 'Leather Wallet',
    descriptionHtml: '',
    status: 'DRAFT',
    vendor: 'Heritage Goods',
    productType: 'Accessories',
    tags: ['leather', 'wallet', 'handmade'],
    onlineStoreUrl: null,
    seo: { title: null, description: null },
    totalInventory: 0,
    priceRangeV2: {
      minVariantPrice: { amount: '49.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '59.99', currencyCode: 'USD' },
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/301', title: 'Brown', price: '49.99', inventoryQuantity: 0, sku: 'WALLET-BRN' },
      { id: 'gid://shopify/ProductVariant/302', title: 'Black', price: '59.99', inventoryQuantity: 0, sku: 'WALLET-BLK' },
    ],
    images: [],
    createdAt: '2025-03-05T16:00:00Z',
    updatedAt: '2025-03-05T16:00:00Z',
  },
  {
    id: 'gid://shopify/Product/4',
    title: 'Yoga Mat Classic',
    descriptionHtml: '<p>Non-slip, eco-friendly TPE yoga mat. 6mm thick for joint support. Includes carrying strap.</p>',
    status: 'ACTIVE',
    vendor: 'FitLife',
    productType: 'Sports & Fitness',
    tags: ['yoga', 'fitness', 'eco', 'non-slip'],
    onlineStoreUrl: 'https://demo-store.myshopify.com/products/yoga-mat-classic',
    seo: {
      title: 'Yoga Mat Classic — Eco TPE | FitLife',
      description: 'Non-slip eco-friendly TPE yoga mat, 6mm thick. Perfect for home and studio yoga practice.',
    },
    totalInventory: 30,
    priceRangeV2: {
      minVariantPrice: { amount: '34.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '34.99', currencyCode: 'USD' },
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/401', title: 'Purple', price: '34.99', inventoryQuantity: 15, sku: 'YOGAMAT-PRP' },
      { id: 'gid://shopify/ProductVariant/402', title: 'Teal', price: '34.99', inventoryQuantity: 15, sku: 'YOGAMAT-TEL' },
    ],
    images: [
      { url: 'https://cdn.shopify.com/s/files/mock/yoga-mat.jpg', altText: null },
    ],
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-04-10T12:00:00Z',
  },
  {
    id: 'gid://shopify/Product/5',
    title: 'Coffee Mug XL',
    descriptionHtml: '<p>Extra-large 20oz ceramic mug. Dishwasher and microwave safe.</p>',
    status: 'ARCHIVED',
    vendor: 'Morning Brew',
    productType: 'Kitchen',
    tags: ['mug', 'ceramic', 'coffee'],
    onlineStoreUrl: null,
    seo: { title: null, description: null },
    totalInventory: 0,
    priceRangeV2: {
      minVariantPrice: { amount: '14.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '14.99', currencyCode: 'USD' },
    },
    variants: [
      { id: 'gid://shopify/ProductVariant/501', title: 'Default Title', price: '14.99', inventoryQuantity: 0, sku: 'MUG-XL' },
    ],
    images: [
      { url: 'https://cdn.shopify.com/s/files/mock/mug.jpg', altText: 'Coffee Mug XL — 20oz ceramic' },
    ],
    createdAt: '2024-11-01T08:00:00Z',
    updatedAt: '2025-02-28T09:00:00Z',
  },
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'gid://shopify/Order/1001',
    name: '#1001',
    totalPriceSet: { shopMoney: { amount: '159.97', currencyCode: 'USD' } },
    subtotalPriceSet: { shopMoney: { amount: '149.97', currencyCode: 'USD' } },
    totalDiscountsSet: { shopMoney: { amount: '0.00', currencyCode: 'USD' } },
    displayFinancialStatus: 'Paid',
    displayFulfillmentStatus: 'Fulfilled',
    cancelReason: null,
    tags: [],
    createdAt: '2025-06-03T10:22:00Z',
  },
  {
    id: 'gid://shopify/Order/1002',
    name: '#1002',
    totalPriceSet: { shopMoney: { amount: '79.99', currencyCode: 'USD' } },
    subtotalPriceSet: { shopMoney: { amount: '79.99', currencyCode: 'USD' } },
    totalDiscountsSet: { shopMoney: { amount: '0.00', currencyCode: 'USD' } },
    displayFinancialStatus: 'Pending',
    displayFulfillmentStatus: 'Unfulfilled',
    cancelReason: null,
    tags: [],
    createdAt: '2025-06-04T14:05:00Z',
  },
  {
    id: 'gid://shopify/Order/1003',
    name: '#1003',
    totalPriceSet: { shopMoney: { amount: '206.96', currencyCode: 'USD' } },
    subtotalPriceSet: { shopMoney: { amount: '229.96', currencyCode: 'USD' } },
    totalDiscountsSet: { shopMoney: { amount: '23.00', currencyCode: 'USD' } },
    displayFinancialStatus: 'Paid',
    displayFulfillmentStatus: 'Partially fulfilled',
    cancelReason: null,
    tags: ['wholesale'],
    createdAt: '2025-06-04T16:30:00Z',
  },
  {
    id: 'gid://shopify/Order/1004',
    name: '#1004',
    totalPriceSet: { shopMoney: { amount: '49.99', currencyCode: 'USD' } },
    subtotalPriceSet: { shopMoney: { amount: '49.99', currencyCode: 'USD' } },
    totalDiscountsSet: { shopMoney: { amount: '0.00', currencyCode: 'USD' } },
    displayFinancialStatus: 'Refunded',
    displayFulfillmentStatus: 'Restocked',
    cancelReason: 'CUSTOMER',
    tags: [],
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

    all.push(...data.products.edges.map(({ node }) => flattenProduct(node)));
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

