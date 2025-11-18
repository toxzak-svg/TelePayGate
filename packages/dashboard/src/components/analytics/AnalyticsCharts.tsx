import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { statsService } from '../../api/services';
import { ChartSkeleton } from '../common/Skeleton';

export default function AnalyticsCharts() {
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => statsService.getRevenueChart(7),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transaction-chart'],
    queryFn: () => statsService.getTransactionChart(7),
  });

  if (revenueLoading || txLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  // Format data for charts
  const formattedRevenueData = revenueData?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.value,
  })) || [];

  const formattedTxData = txData?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.value,
  })) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={formattedRevenueData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString()}`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Transactions (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={formattedTxData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <Bar dataKey="count" fill="#22c55e" barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
