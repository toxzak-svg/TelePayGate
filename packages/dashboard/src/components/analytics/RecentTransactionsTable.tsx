import { useQuery } from '@tanstack/react-query';
import { paymentService } from '../../api/services';
import { TableSkeleton } from '../common/Skeleton';
import EmptyState from '../common/EmptyState';

const statusColor = {
  pending: 'text-yellow-600 bg-yellow-100',
  received: 'text-blue-600 bg-blue-100',
  converting: 'text-purple-600 bg-purple-100',
  settled: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
};

export default function RecentTransactionsTable() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => paymentService.getPayments({ limit: 5 }),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (isLoading) {
    return <TableSkeleton rows={5} />;
  }

  if (!payments || payments.length === 0) {
    return (
      <EmptyState
        title="No recent transactions"
        description="Transactions will appear here once you start receiving payments"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {payments.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-mono text-sm text-blue-700">
                  {tx.id.substring(0, 8)}...
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {tx.telegramUserId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {tx.amount.toLocaleString()} {tx.currency}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    statusColor[tx.status as keyof typeof statusColor] ||
                    'text-gray-600 bg-gray-100'
                  }`}
                >
                  {tx.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                {new Date(tx.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
