import type { RevenueMetrics } from '@/lib/orders';

type Props = {
  metrics: RevenueMetrics;
};

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(ratio: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);
}

type Card = {
  label: string;
  value: string;
  sub: string;
  accent: string;
};

export default function RevenueMetrics({ metrics }: Props) {
  const { currencyCode } = metrics;
  const discountRate =
    metrics.totalRevenue > 0 ? metrics.totalDiscountsGiven / metrics.totalRevenue : 0;

  const cards: Card[] = [
    {
      label: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue, currencyCode),
      sub: `${formatCurrency(metrics.revenueAfterDiscounts, currencyCode)} after discounts`,
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Total Orders',
      value: metrics.totalOrders.toLocaleString('en-US'),
      sub: `${metrics.totalOrders === 1 ? '1 order' : `${metrics.totalOrders} orders`} in range`,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(metrics.averageOrderValue, currencyCode),
      sub: 'per completed order',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Discount Rate',
      value: formatPercent(discountRate),
      sub: `${formatCurrency(metrics.totalDiscountsGiven, currencyCode)} total discounts given`,
      accent:
        discountRate > 0.15
          ? 'bg-red-50 text-red-600'
          : discountRate > 0
            ? 'bg-amber-50 text-amber-600'
            : 'bg-gray-50 text-gray-500',
    },
  ];

  return (
    <section aria-label="Revenue metrics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {card.label}
            </span>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              {card.value}
            </span>
            <span
              className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${card.accent}`}
            >
              {card.sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
