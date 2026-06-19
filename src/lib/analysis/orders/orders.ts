import type { GraphQLOrder } from '@/types/shopify';

// ---------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------

function parseMoney(amount: string): number {
  const n = parseFloat(amount);
  if (isNaN(n)) {
    console.error(`[orders] parseMoney: invalid amount string "${amount}"`);
    return 0;
  }
  return n;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// ---------------------------------------------------------------------------
// Flat types
// ---------------------------------------------------------------------------

export type FlatLineItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantTitle: string;
  sku: string;
  productId: string;
  productTitle: string;
};

export type FlatCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  lifetimeOrders: number;
  lifetimeSpend: number;
};

export type FlatOrder = {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: number;
  subtotalPrice: number;
  totalDiscounts: number;
  totalShipping: number;
  currencyCode: string;
  lineItems: FlatLineItem[];
  customer: FlatCustomer | null;
  discountCodes: string[];
  tags: string[];
  isCancelled: boolean;
  cancelReason: string | null;
};

// ---------------------------------------------------------------------------
// Flatten
// ---------------------------------------------------------------------------

export function flattenOrder(order: GraphQLOrder): FlatOrder {
  const currencyCode = order.totalPriceSet.shopMoney.currencyCode;

  const lineItems = order.lineItems.edges.map(({ node }): FlatLineItem => {
    const unitPrice = parseMoney(node.originalUnitPriceSet.shopMoney.amount);
    return {
      id: node.id,
      title: node.title,
      quantity: node.quantity,
      unitPrice,
      totalPrice: roundMoney(node.quantity * unitPrice),
      variantTitle: node.variant?.title ?? '',
      sku: node.variant?.sku ?? '',
      productId: node.product?.id ?? '',
      productTitle: node.product?.title ?? '',
    };
  });

  return {
    id: order.id,
    name: order.name,
    // email and customer are intentionally absent from ORDERS_DETAIL_QUERY (PII deferral)
    email: null,
    createdAt: new Date(order.createdAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
    financialStatus: order.displayFinancialStatus,
    fulfillmentStatus: order.displayFulfillmentStatus,
    totalPrice: parseMoney(order.totalPriceSet.shopMoney.amount),
    subtotalPrice: parseMoney(order.subtotalPriceSet.shopMoney.amount),
    totalDiscounts: parseMoney(order.totalDiscountsSet.shopMoney.amount),
    totalShipping: parseMoney(order.totalShippingPriceSet.shopMoney.amount),
    currencyCode,
    lineItems,
    customer: null,
    discountCodes: order.discountCodes,
    tags: order.tags,
    isCancelled: order.cancelledAt !== null,
    cancelReason: order.cancelReason,
  };
}

export function flattenOrders(orders: GraphQLOrder[]): FlatOrder[] {
  return orders.map(flattenOrder);
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type RevenueMetrics = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscountsGiven: number;
  revenueAfterDiscounts: number;
  currencyCode: string;
};

export type ProductRevenueEntry = {
  productId: string;
  productTitle: string;
  totalRevenue: number;
  totalQuantity: number;
  orderCount: number;
};

export type DailyRevenue = {
  date: string;
  revenue: number;
  orderCount: number;
};

export type RepeatCustomerRate = {
  repeatCustomers: number;
  totalCustomers: number;
  rate: number;
};

export function calculateRevenueMetrics(orders: FlatOrder[]): RevenueMetrics {
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const totalDiscountsGiven = orders.reduce((sum, o) => sum + o.totalDiscounts, 0);

  return {
    totalRevenue,
    totalOrders: orders.length,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    totalDiscountsGiven,
    revenueAfterDiscounts: totalRevenue - totalDiscountsGiven,
    currencyCode: orders[0]?.currencyCode ?? 'USD',
  };
}

export function getOrdersByStatus(orders: FlatOrder[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    counts[order.financialStatus] = (counts[order.financialStatus] ?? 0) + 1;
  }
  return counts;
}

export function getOrdersByFulfilmentStatus(orders: FlatOrder[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    counts[order.fulfillmentStatus] = (counts[order.fulfillmentStatus] ?? 0) + 1;
  }
  return counts;
}

export function getTopProductsByRevenue(
  orders: FlatOrder[],
  limit: number,
): ProductRevenueEntry[] {
  const map = new Map<
    string,
    { productTitle: string; totalRevenue: number; totalQuantity: number; orderIds: Set<string> }
  >();

  for (const order of orders) {
    for (const item of order.lineItems) {
      if (!item.productId) continue;
      const existing = map.get(item.productId);
      if (existing) {
        existing.totalRevenue += item.totalPrice;
        existing.totalQuantity += item.quantity;
        existing.orderIds.add(order.id);
      } else {
        map.set(item.productId, {
          productTitle: item.productTitle,
          totalRevenue: item.totalPrice,
          totalQuantity: item.quantity,
          orderIds: new Set([order.id]),
        });
      }
    }
  }

  return Array.from(map.entries())
    .map(([productId, entry]) => ({
      productId,
      productTitle: entry.productTitle,
      totalRevenue: entry.totalRevenue,
      totalQuantity: entry.totalQuantity,
      orderCount: entry.orderIds.size,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);
}

export function getRevenueByDay(orders: FlatOrder[]): DailyRevenue[] {
  const map = new Map<string, { revenue: number; orderCount: number }>();

  for (const order of orders) {
    const date = order.createdAt.slice(0, 10);
    const existing = map.get(date);
    if (existing) {
      existing.revenue += order.totalPrice;
      existing.orderCount += 1;
    } else {
      map.set(date, { revenue: order.totalPrice, orderCount: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([date, entry]) => ({ date, ...entry }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getRepeatCustomerRate(orders: FlatOrder[]): RepeatCustomerRate {
  const seen = new Map<string, number>();

  for (const order of orders) {
    if (order.customer === null) continue;
    if (!seen.has(order.customer.id)) {
      seen.set(order.customer.id, order.customer.lifetimeOrders);
    }
  }

  const totalCustomers = seen.size;
  const repeatCustomers = Array.from(seen.values()).filter((count) => count > 1).length;

  return {
    repeatCustomers,
    totalCustomers,
    rate: totalCustomers > 0 ? repeatCustomers / totalCustomers : 0,
  };
}
