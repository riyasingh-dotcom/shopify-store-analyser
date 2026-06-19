'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyRevenue } from '@/lib/orders';

type Props = {
  data: DailyRevenue[];
  currencyCode: string;
};

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAxisDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(year, (month ?? 1) - 1, day),
  );
}

type TooltipEntry = {
  value: number;
  payload: DailyRevenue;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currencyCode: string;
};

function CustomTooltip({ active, payload, label, currencyCode }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const revenue = payload[0]?.value ?? 0;
  const orderCount = payload[0]?.payload.orderCount ?? 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        {label !== undefined ? formatAxisDate(label) : ''}
      </p>
      <p className="text-base font-bold text-gray-900">
        {formatCurrency(revenue, currencyCode)}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        {orderCount} {orderCount === 1 ? 'order' : 'orders'}
      </p>
    </div>
  );
}

export default function RevenueChart({ data, currencyCode }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Revenue Over Time</h2>
        <p className="text-xs text-gray-400">Daily revenue from completed orders</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tickFormatter={(v: number) => formatCurrency(v, currencyCode)}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          <Tooltip
            content={<CustomTooltip currencyCode={currencyCode} />}
            cursor={{ stroke: '#7c3aed', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
