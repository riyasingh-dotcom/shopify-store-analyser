import type { Product, Order, StoreMetrics, TopProduct } from '@/types/shopify';

export function calculateTotalRevenue(orders: Order[]): number {
  return orders.reduce(
    (sum, order) => sum + parseFloat(order.totalPriceSet.shopMoney.amount),
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
      minPrice: parseFloat(p.priceRangeV2.minVariantPrice.amount),
      maxPrice: parseFloat(p.priceRangeV2.maxVariantPrice.amount),
      currencyCode: p.priceRangeV2.minVariantPrice.currencyCode,
    }));
}

export function calculateMetrics(
  products: Product[],
  orders: Order[],
): StoreMetrics {
  return {
    totalRevenue: calculateTotalRevenue(orders),
    averageOrderValue: calculateAverageOrderValue(orders),
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
    draftProducts: products.filter((p) => p.status === 'DRAFT').length,
    archivedProducts: products.filter((p) => p.status === 'ARCHIVED').length,
    totalOrders: orders.length,
    paidOrders: orders.filter(
      (o) => o.displayFinancialStatus.toLowerCase() === 'paid',
    ).length,
    lowStockProducts: products.filter(
      (p) => p.totalInventory > 0 && p.totalInventory < 10,
    ).length,
    currencyCode: orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD',
    topProducts: getTopProducts(products),
  };
}
