import type { Product, Order, StoreMetrics, TopProduct } from '@/types/shopify';

/** parseFloat that returns 0 instead of NaN for malformed strings. */
function safeFloat(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function calculateTotalRevenue(orders: Order[]): number {
  return orders.reduce(
    (sum, order) => sum + safeFloat(order.totalPriceSet.shopMoney.amount),
    0,
  );
}

export function calculateAverageOrderValue(orders: Order[]): number {
  if (orders.length === 0) return 0;
  return calculateTotalRevenue(orders) / orders.length;
}

// Returns the top N active products sorted by inventory descending.
export function getTopProducts(products: Product[], limit = 5): TopProduct[] {
  return products
    .filter((p) => p.status === 'ACTIVE')
    .sort((a, b) => b.totalInventory - a.totalInventory)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      title: p.title,
      vendor: p.vendor,
      totalInventory: p.totalInventory,
      minPrice: safeFloat(p.priceRangeV2.minVariantPrice.amount),
      maxPrice: safeFloat(p.priceRangeV2.maxVariantPrice.amount),
      currencyCode: p.priceRangeV2.minVariantPrice.currencyCode,
    }));
}

export function calculateMetrics(
  products: Product[],
  orders: Order[],
): StoreMetrics {
  const productStats = products.reduce(
    (acc, p) => {
      if (p.status === 'ACTIVE')         acc.active++;
      else if (p.status === 'DRAFT')     acc.draft++;
      else if (p.status === 'ARCHIVED')  acc.archived++;
      if (p.totalInventory > 0 && p.totalInventory < 10) acc.lowStock++;
      return acc;
    },
    { active: 0, draft: 0, archived: 0, lowStock: 0 },
  );

  const orderStats = orders.reduce(
    (acc, o) => {
      acc.revenue += safeFloat(o.totalPriceSet.shopMoney.amount);
      if (o.displayFinancialStatus.toLowerCase() === 'paid') acc.paid++;
      return acc;
    },
    { revenue: 0, paid: 0 },
  );

  return {
    totalRevenue: orderStats.revenue,
    averageOrderValue: orders.length > 0 ? orderStats.revenue / orders.length : 0,
    totalProducts: products.length,
    activeProducts: productStats.active,
    draftProducts: productStats.draft,
    archivedProducts: productStats.archived,
    totalOrders: orders.length,
    paidOrders: orderStats.paid,
    lowStockProducts: productStats.lowStock,
    currencyCode: orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD',
    topProducts: getTopProducts(products),
  };
}
