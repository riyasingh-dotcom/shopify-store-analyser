import type { RepeatCustomerRate } from '@/lib/orders';

type Props = {
  rate: RepeatCustomerRate;
};

function formatPercent(ratio: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);
}

export default function RepeatCustomerCard({ rate }: Props) {
  const hasData = rate.totalCustomers > 0;

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Repeat Customers</h2>
        <p className="text-xs text-gray-400">Customers with more than one lifetime order</p>
      </div>

      {!hasData ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Customer data unavailable</p>
            <p className="mt-1 text-xs text-gray-400">
              Requires <span className="font-medium text-gray-600">protected_customer_data</span> scope
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-5">
          {/* Rate headline */}
          <div className="text-center">
            <p className="text-4xl font-bold tracking-tight text-gray-900">
              {formatPercent(rate.rate)}
            </p>
            <p className="mt-1 text-xs text-gray-400">repeat customer rate</p>
          </div>

          {/* Bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${(rate.rate * 100).toFixed(1)}%` }}
              />
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-violet-600">{rate.repeatCustomers}</p>
              <p className="text-xs text-gray-400">repeat</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-lg font-bold text-gray-700">
                {rate.totalCustomers - rate.repeatCustomers}
              </p>
              <p className="text-xs text-gray-400">first-time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
