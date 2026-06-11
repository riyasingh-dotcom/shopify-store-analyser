// ---------------------------------------------------------------------------
// Shopify Admin API — TypeScript types
// These mirror the GraphQL schema shapes returned by the Shopify Admin API.
// ---------------------------------------------------------------------------

export interface ShopInfo {
  name: string;
  email: string;
  myshopifyDomain: string;
  primaryDomain: { url: string };
  currencyCode: string;
  plan: { displayName: string };
}

export type ProductStatus = 'ACTIVE' | 'ARCHIVED' | 'DRAFT';

export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

// ---------------------------------------------------------------------------
// Product sub-types
// ---------------------------------------------------------------------------

export type ProductSeo = {
  title: string | null;
  description: string | null;
};

export type ProductVariant = {
  id: string;
  title: string;
  price: string;
  inventoryQuantity: number | null;
  sku: string | null;
};

export type ProductImage = {
  url: string;
  altText: string | null;
};

// Internal helper that mirrors Shopify's GraphQL connection pattern.
// Used only for ProductRawNode — not part of the public Product type.
type GqlConnection<T> = {
  edges: Array<{ node: T }>;
};

export interface Product {
  id: string;
  title: string;
  /** Full HTML product description — used for SEO content analysis. */
  descriptionHtml: string;
  status: ProductStatus;
  vendor: string;
  /** Shopify product type — used for category-level SEO grouping. */
  productType: string;
  /** Array of store-defined tags — signals missing keyword coverage. */
  tags: string[];
  /** Public storefront URL; null for DRAFT/ARCHIVED products. */
  onlineStoreUrl: string | null;
  /** Shopify-managed SEO title + meta description for the PDP. */
  seo: ProductSeo;
  /** Sum of inventory across all variants and locations */
  totalInventory: number;
  priceRangeV2: {
    minVariantPrice: MoneyV2;
    maxVariantPrice: MoneyV2;
  };
  /** Flattened variant list — includes per-variant price, SKU, and stock. */
  variants: ProductVariant[];
  /** Flattened image list — alt text completeness is a direct SEO signal. */
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw GraphQL node shape returned by PRODUCTS_QUERY.
 * Variants and images arrive as Shopify connection objects; api.ts
 * calls flattenProduct() to convert this into the clean Product type.
 */
export interface ProductRawNode extends Omit<Product, 'variants' | 'images'> {
  variants: GqlConnection<ProductVariant>;
  images: GqlConnection<ProductImage>;
}

export interface Order {
  id: string;
  /** Human-readable order number, e.g. "#1001" */
  name: string;
  totalPriceSet: { shopMoney: MoneyV2 };
  /**
   * Order subtotal before shipping/taxes — paired with totalDiscountsSet to
   * compute effective discount rate per order.
   */
  subtotalPriceSet: { shopMoney: MoneyV2 } | null;
  /**
   * Total discount amount applied — used to identify discount-driven vs
   * organic revenue and correlate with product-level promo performance.
   */
  totalDiscountsSet: { shopMoney: MoneyV2 } | null;
  /** Human-readable payment status, e.g. "Paid", "Pending", "Refunded" */
  displayFinancialStatus: string;
  /** Human-readable fulfillment status, e.g. "Fulfilled", "Unfulfilled" */
  displayFulfillmentStatus: string;
  /**
   * Reason the order was cancelled (CUSTOMER, FRAUD, INVENTORY, etc.); null
   * when the order was not cancelled. Useful for identifying friction points.
   */
  cancelReason: string | null;
  /** Store-defined order tags — used for custom segmentation. */
  tags: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// GraphQL response wrappers
// ---------------------------------------------------------------------------

export interface ShopQuery {
  shop: ShopInfo;
}

export interface ProductsQuery {
  products: {
    edges: Array<{ node: ProductRawNode }>;
    pageInfo: { hasNextPage: boolean; endCursor?: string };
  };
}

export interface OrdersQuery {
  orders: {
    edges: Array<{ node: Order }>;
    pageInfo: { hasNextPage: boolean; endCursor?: string };
  };
}

// Aggregated shape consumed by the dashboard page
export interface DashboardData {
  shop: ShopInfo;
  products: Product[];
  orders: Order[];
  isMockData: boolean;
}

// ---------------------------------------------------------------------------
// Analytics / metrics types
// ---------------------------------------------------------------------------

export interface TopProduct {
  id: string;
  title: string;
  vendor: string;
  totalInventory: number;
  minPrice: number;
  maxPrice: number;
  currencyCode: string;
}

export interface StoreMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  totalOrders: number;
  paidOrders: number;
  lowStockProducts: number;
  currencyCode: string;
  topProducts: TopProduct[];
}

// Full store data shape — superset of DashboardData with computed metrics
export interface StoreData {
  shop: ShopInfo;
  products: Product[];
  orders: Order[];
  metrics: StoreMetrics;
  isMockData: boolean;
}
