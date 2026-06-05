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

export interface Product {
  id: string;
  title: string;
  status: ProductStatus;
  vendor: string;
  /** Sum of inventory across all variants and locations */
  totalInventory: number;
  priceRangeV2: {
    minVariantPrice: MoneyV2;
    maxVariantPrice: MoneyV2;
  };
}

export interface Order {
  id: string;
  /** Human-readable order number, e.g. "#1001" */
  name: string;
  totalPriceSet: {
    shopMoney: MoneyV2;
  };
  /** Human-readable payment status, e.g. "Paid", "Pending", "Refunded" */
  displayFinancialStatus: string;
  /** Human-readable fulfillment status, e.g. "Fulfilled", "Unfulfilled" */
  displayFulfillmentStatus: string;
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
    edges: Array<{ node: Product }>;
    pageInfo: { hasNextPage: boolean; endCursor?: string };
  };
}

export interface OrdersQuery {
  orders: {
    edges: Array<{ node: Order }>;
    pageInfo: { hasNextPage: boolean };
  };
}

// Aggregated shape consumed by the dashboard page
export interface DashboardData {
  shop: ShopInfo;
  products: Product[];
  orders: Order[];
  isMockData: boolean;
}
