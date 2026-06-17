'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type Props = {
  data: Record<string, number>;
  title: string;
  subtitle: string;
};

const STATUS_COLORS: Record<string, string> = {
  // Financial
  Paid: '#10b981',
  Pending: '#f59e0b',
  Refunded: '#ef4444',
  'Partially refunded': '#f97316',
  'Partially paid': '#f97316',
  Authorized: '#3b82f6',
  Voided: '#9ca3af',
  Expired: '#9ca3af',
  // Fulfillment
  Fulfilled: '#10b981',
  Unfulfilled: '#3b82f6',
  'Partially fulfilled': '#f59e0b',
  Restocked: '#9ca3af',
  'In progress': '#8b5cf6',
  'On hold': '#f97316',
  Scheduled: '#06b6d4',
  'Pending fulfillment': '#f59e0b',
};

const FALLBACK_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#f43f5e',
];

function colorFor(name: string, index: number): string {
  return STATUS_COLORS[name] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length] ?? '#9ca3af';
}

type SliceEntry = { name: string; value: number };

type PieTooltipProps = {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
};

function PieTooltip({ active, payload, total }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0] ?? { name: '', value: 0 };
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-gray-700">{name}</p>
      <p className="text-sm font-bold text-gray-900">
        {value} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
      </p>
    </div>
  );
}

export default function StatusPieChart({ data, title, subtitle }: Props) {
  const entries: SliceEntry[] = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((sum, e) => sum + e.value, 0);

  if (entries.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={entries}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {entries.map((entry, i) => (
              <Cell key={entry.name} fill={colorFor(entry.name, i)} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <ul className="mt-3 space-y-2">
        {entries.map((entry, i) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
          return (
            <li key={entry.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(entry.name, i) }}
                />
                <span className="text-gray-600">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-semibold text-gray-900">{entry.value}</span>
                <span className="w-10 text-right text-gray-400">{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
