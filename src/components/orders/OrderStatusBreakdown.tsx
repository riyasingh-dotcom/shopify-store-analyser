import StatusPieChart from '@/components/orders/StatusPieChart';

type Props = {
  byFinancialStatus: Record<string, number>;
  byFulfilmentStatus: Record<string, number>;
};

export default function OrderStatusBreakdown({ byFinancialStatus, byFulfilmentStatus }: Props) {
  return (
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
  );
}
