import type { Insight, InsightPriority } from '@/types/analysis';

interface InsightCardProps {
  insight: Insight;
}

const priorityStyles: Record<InsightPriority, { badge: string; dot: string; border: string }> = {
  high: {
    badge: 'bg-red-50 text-red-700 ring-red-200',
    dot: 'bg-red-500',
    border: 'border-red-200',
  },
  medium: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  low: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
};

const categoryLabels: Record<string, string> = {
  inventory: 'Inventory',
  revenue: 'Revenue',
  products: 'Products',
  marketing: 'Marketing',
  operations: 'Operations',
  growth: 'Growth',
};

function normalisePriority(raw: string): InsightPriority {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return 'medium';
}

export default function InsightCard({ insight }: InsightCardProps) {
  const priority = normalisePriority(insight.priority);
  const styles = priorityStyles[priority];
  const categoryLabel = categoryLabels[insight.category] ?? insight.category;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${styles.border}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {categoryLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {priority.charAt(0).toUpperCase() + priority.slice(1)} priority
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 flex flex-col flex-1 gap-4">
        <h3 className="text-sm font-semibold leading-snug text-gray-900">{insight.title}</h3>

        {/* Finding */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Finding
          </p>
          <p className="text-sm leading-relaxed text-gray-700">{insight.finding}</p>
        </div>

        {/* Recommendation */}
        <div className="flex gap-3">
          {/* Arrow icon */}
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100">
            <svg
              className="h-3 w-3 text-indigo-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{insight.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
