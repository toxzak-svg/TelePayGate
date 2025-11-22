import React, { useEffect, useState } from 'react';
import { fetchP2POrders } from '../services/api';

export interface P2POrder {
  id: string;
  type: 'buy' | 'sell';
  status: 'active' | 'completed' | 'cancelled';
  user: string;
  amount: number;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function P2POrders() {
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchP2POrders()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">P2P Orders</h1>
      <div className="mb-4 flex gap-2">
        {['all', 'active', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            className={`px-3 py-1 rounded ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => setFilter(f as any)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="px-4 py-2">Order ID</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td className="border px-4 py-2">{order.id}</td>
                <td className="border px-4 py-2">{order.type}</td>
                <td className="border px-4 py-2">{order.user}</td>
                <td className="border px-4 py-2">{order.amount}</td>
                <td className="border px-4 py-2">{order.rate}</td>
                <td className={`border px-4 py-2 rounded ${statusColors[order.status]}`}>{order.status}</td>
                <td className="border px-4 py-2">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="border px-4 py-2">{new Date(order.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
