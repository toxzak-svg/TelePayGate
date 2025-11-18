import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentService } from '../api/services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';

const statusColor = {
  pending: 'text-yellow-600 bg-yellow-100',
  received: 'text-blue-600 bg-blue-100',
  converting: 'text-purple-600 bg-purple-100',
  settled: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
};

export default function Transactions() {
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: payments, isLoading, error, refetch } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: () => paymentService.getPayments({ 
      limit: 100,
      status: statusFilter || undefined 
    }),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (error) {
    return <ErrorMessage error={error} title="Failed to load transactions" retry={refetch} />;
  }

  const filtered = payments
    ? payments
        .filter((tx) => {
          const searchTerm = filter.toLowerCase();
          return (
            tx.id.toLowerCase().includes(searchTerm) ||
            tx.telegramUserId.toLowerCase().includes(searchTerm) ||
            tx.amount.toString().includes(searchTerm)
          );
        })
        .sort((a, b) => {
          if (sortBy === 'amount') {
            return b.amount - a.amount;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by ID, user, or amount..."
          className="flex-1 min-w-[200px] border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 px-4 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="converting">Converting</option>
          <option value="settled">Settled</option>
          <option value="failed">Failed</option>
        </select>

        <button
          className={`px-4 py-2 rounded-lg text-sm border transition ${
            sortBy === 'date'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setSortBy('date')}
        >
          Sort by Date
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm border transition ${
            sortBy === 'amount'
              ? 'bg-blue-50 border-blue-500 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setSortBy('amount')}
        >
          Sort by Amount
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description={
              filter
                ? 'Try adjusting your search or filter criteria'
                : 'Transactions will appear here once you start receiving payments'
            }
          />
        ) : (
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
                    Currency
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
                {filtered.map((tx) => (
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
                      {tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.currency}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}{' '}
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
