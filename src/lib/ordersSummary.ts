import {
  type FlatOrder,
  calculateRevenueMetrics,
  getOrdersByStatus,
  getOrdersByFulfilmentStatus,
  getTopProductsByRevenue,
  getRepeatCustomerRate,
} from '@/lib/orders';
import type { OrdersAnalysisSnapshot } from '@/types/ordersAnalysis';

function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

function formatDate(isoString: string): string {
  return isoString.slice(0, 10);
}

function pct(count: number, total: number): string {
  if (total === 0) return '0.0%';
  return `${((count / total) * 100).toFixed(1)}%`;
}

// Captures the exact computed values used to generate the LLM prompt.
// Call this before buildOrdersSummary to ensure the snapshot mirrors the AI input.
export function buildOrdersAnalysisSnapshot(orders: FlatOrder[]): OrdersAnalysisSnapshot {
  const metrics = calculateRevenueMetrics(orders);
  const financialStatusBreakdown = getOrdersByStatus(orders);
  const fulfilmentStatusBreakdown = getOrdersByFulfilmentStatus(orders);
  const topProducts = getTopProductsByRevenue(orders, 5);
  const repeatRate = getRepeatCustomerRate(orders);

  let firstOrderDate = orders[0]?.createdAt.slice(0, 10) ?? '';
  let lastOrderDate = orders[0]?.createdAt.slice(0, 10) ?? '';
  for (const order of orders) {
    const d = order.createdAt.slice(0, 10);
    if (d < firstOrderDate) firstOrderDate = d;
    if (d > lastOrderDate) lastOrderDate = d;
  }

  const discountRate =
    metrics.totalRevenue > 0
      ? (metrics.totalDiscountsGiven / metrics.totalRevenue) * 100
      : 0;

  return {
    firstOrderDate,
    lastOrderDate,
    totalOrders: metrics.totalOrders,
    currencyCode: metrics.currencyCode,
    totalRevenue: metrics.totalRevenue,
    averageOrderValue: metrics.averageOrderValue,
    totalDiscountsGiven: metrics.totalDiscountsGiven,
    revenueAfterDiscounts: metrics.revenueAfterDiscounts,
    discountRate,
    financialStatusBreakdown,
    fulfilmentStatusBreakdown,
    topProducts,
    repeatCustomers: repeatRate.repeatCustomers,
    totalCustomers: repeatRate.totalCustomers,
    repeatCustomerRate: repeatRate.rate,
  };
}

export function buildOrdersSummary(orders: FlatOrder[]): string {
  if (orders.length === 0) {
    return 'No orders available for analysis.';
  }

  const metrics = calculateRevenueMetrics(orders);
  const financialCounts = getOrdersByStatus(orders);
  const fulfillmentCounts = getOrdersByFulfilmentStatus(orders);
  const topProducts = getTopProductsByRevenue(orders, 5);
  const repeatRate = getRepeatCustomerRate(orders);

  const currency = metrics.currencyCode || 'USD';
  const total = orders.length;

  // Avoid spread on potentially large arrays
  let firstDate = orders[0].createdAt;
  let lastDate = orders[0].createdAt;
  for (const order of orders) {
    if (order.createdAt < firstDate) firstDate = order.createdAt;
    if (order.createdAt > lastDate) lastDate = order.createdAt;
  }

  const discountRate =
    metrics.totalRevenue > 0
      ? (metrics.totalDiscountsGiven / metrics.totalRevenue) * 100
      : 0;

  // Notable flags
  const flags: string[] = [];

  const unfulfilledCount = Object.entries(fulfillmentCounts)
    .filter(([status]) => status.toLowerCase().includes('unfulfil'))
    .reduce((sum, [, count]) => sum + count, 0);
  const unfulfilledPct = total > 0 ? (unfulfilledCount / total) * 100 : 0;
  if (unfulfilledPct > 20) {
    flags.push(
      `High unfulfilled rate: ${unfulfilledPct.toFixed(1)}% of orders are unfulfilled (threshold: 20%)`,
    );
  }

  if (discountRate > 25) {
    flags.push(
      `High discount rate: ${discountRate.toFixed(1)}% of gross revenue is discounted (threshold: 25%)`,
    );
  }

  if (topProducts.length > 0 && metrics.totalRevenue > 0) {
    const top = topProducts[0];
    const topPct = (top.totalRevenue / metrics.totalRevenue) * 100;
    if (topPct > 50) {
      flags.push(
        `Revenue concentration: "${top.productTitle}" accounts for ${topPct.toFixed(1)}% of total revenue`,
      );
    }
  }

  const lines: string[] = [];

  lines.push('TIME PERIOD');
  lines.push(`First order:   ${formatDate(firstDate)}`);
  lines.push(`Last order:    ${formatDate(lastDate)}`);
  lines.push(`Total orders:  ${total}`);

  lines.push('');
  lines.push('REVENUE');
  lines.push(`Total revenue:       ${formatCurrency(metrics.totalRevenue, currency)}`);
  lines.push(`Average order value: ${formatCurrency(metrics.averageOrderValue, currency)}`);
  lines.push(`Total discounts:     ${formatCurrency(metrics.totalDiscountsGiven, currency)}`);
  lines.push(`Discount rate:       ${discountRate.toFixed(1)}% of gross revenue`);

  lines.push('');
  lines.push('ORDER STATUS (FINANCIAL)');
  for (const [status, count] of Object.entries(financialCounts).sort(([, a], [, b]) => b - a)) {
    lines.push(`  ${status}: ${count} (${pct(count, total)})`);
  }

  lines.push('');
  lines.push('ORDER STATUS (FULFILMENT)');
  for (const [status, count] of Object.entries(fulfillmentCounts).sort(([, a], [, b]) => b - a)) {
    lines.push(`  ${status}: ${count} (${pct(count, total)})`);
  }

  lines.push('');
  lines.push('TOP 5 PRODUCTS BY REVENUE');
  if (topProducts.length === 0) {
    lines.push('  No product data available.');
  } else {
    for (const [i, product] of topProducts.entries()) {
      lines.push(
        `  ${i + 1}. ${product.productTitle} — ${formatCurrency(product.totalRevenue, currency)}, ${product.totalQuantity} units`,
      );
    }
  }

  lines.push('');
  lines.push('CUSTOMER RETENTION');
  if (repeatRate.totalCustomers === 0) {
    lines.push('  No customer data available.');
  } else {
    lines.push(
      `  Repeat customer rate: ${(repeatRate.rate * 100).toFixed(1)}% (${repeatRate.repeatCustomers} of ${repeatRate.totalCustomers} identified customers)`,
    );
  }

  if (flags.length > 0) {
    lines.push('');
    lines.push('NOTABLE FLAGS');
    for (const flag of flags) {
      lines.push(`  - ${flag}`);
    }
  }

  return lines.join('\n');
}
