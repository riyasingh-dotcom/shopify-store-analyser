import StatusPieChart from '@/components/orders/StatusPieChart';

type Props = {
  byFinancialStatus: Record<string, number>;
  byFulfilmentStatus: Record<string, number>;
};

export default function OrderStatusBreakdown({ byFinancialStatus, byFulfilmentStatus }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Order Status Breakdown</h2>
        <p className="text-xs text-gray-400">Payment and fulfillment distribution</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusPieChart
          data={byFinancialStatus}
          title="Financial Status"
          subtitle="Payment breakdown"
        />
        <StatusPieChart
          data={byFulfilmentStatus}
          title="Fulfillment Status"
          subtitle="Shipping progress"
        />
      </div>
    </div>
  );
}
