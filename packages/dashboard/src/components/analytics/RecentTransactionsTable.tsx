import React from 'react';

const mockTx = [
  { id: 'TX1001', user: 'alice', amount: 120, status: 'Success', date: '2025-11-07' },
  { id: 'TX1002', user: 'bob', amount: 75, status: 'Pending', date: '2025-11-07' },
  { id: 'TX1003', user: 'carol', amount: 200, status: 'Failed', date: '2025-11-06' },
  { id: 'TX1004', user: 'dan', amount: 50, status: 'Success', date: '2025-11-06' },
  { id: 'TX1005', user: 'eve', amount: 300, status: 'Success', date: '2025-11-05' },
];

const statusColor = {
  Success: 'text-green-600',
  Pending: 'text-yellow-600',
  Failed: 'text-red-600',
};

export default function RecentTransactionsTable() {
  return (
    <div className="overflow-x-auto" role="region" aria-label="Recent transactions">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800" role="table">
        <caption className="sr-only">Recent transactions</caption>
        <thead>
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {mockTx.map((tx) => (
            <tr key={tx.id}>
              <td className="px-4 py-2 font-mono text-sm text-blue-700 dark:text-blue-300">{tx.id}</td>
              <td className="px-4 py-2">{tx.user}</td>
              <td className="px-4 py-2">${tx.amount}</td>
              <td className={`px-4 py-2 font-semibold ${statusColor[tx.status as keyof typeof statusColor]}`}>{tx.status}</td>
              <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{tx.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
