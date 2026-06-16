import type { ProductRevenueEntry } from '@/lib/orders';

export type { ProductRevenueEntry };

// Snapshot of every metric sent to the AI — stored alongside each analysis record
// so the exact input can always be reconstructed.
export type OrdersAnalysisSnapshot = {
  // Time period
  firstOrderDate: string;        // YYYY-MM-DD
  lastOrderDate: string;         // YYYY-MM-DD
  totalOrders: number;
  currencyCode: string;

  // Revenue
  totalRevenue: number;
  averageOrderValue: number;
  totalDiscountsGiven: number;
  revenueAfterDiscounts: number;
  discountRate: number;          // percentage (0–100)

  // Order status breakdowns (keys are Shopify status strings, values are counts)
  financialStatusBreakdown: Record<string, number>;
  fulfilmentStatusBreakdown: Record<string, number>;

  // Top 5 products by revenue (same slice sent to the AI)
  topProducts: ProductRevenueEntry[];

  // Customer retention
  repeatCustomers: number;
  totalCustomers: number;
  repeatCustomerRate: number;    // 0–1 fraction
};

export type CategoryName =
  | 'Revenue Health'
  | 'Fulfilment Performance'
  | 'Product Mix'
  | 'Customer Quality';

export type CategoryStatus = 'good' | 'warning' | 'critical';

export type AnalysisCategory = {
  name: CategoryName;
  score: number;
  status: CategoryStatus;
  finding: string;
  recommendation: string;
  metric: string;
};

export type OrdersAnalysisResult = {
  overallHealthScore: number;
  categories: AnalysisCategory[];
  topPriority: string;
  positives: string[];
};

// One record in the history sidebar — includes the full analysis for instant switching.
export type OrdersAnalysisHistoryItem = {
  id: string;
  generatedAt: string;
  overallHealthScore: number;
  analysis: OrdersAnalysisResult;
};
