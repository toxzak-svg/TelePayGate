import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';
import { statsService } from '../api/services';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { StatCardSkeleton, ChartSkeleton } from '../components/common/Skeleton';
import AnalyticsCharts from '../components/analytics/AnalyticsCharts';
import RecentTransactionsTable from '../components/analytics/RecentTransactionsTable';

export default function Dashboard() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: statsService.getDashboardStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (error) {
    return <ErrorMessage error={error} title="Failed to load dashboard" retry={refetch} />;
  }

  const statsData = stats
    ? [
        {
          name: 'Total Revenue',
          value: `$${stats.totalRevenue.toLocaleString()}`,
          change: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%`,
          icon: DollarSign,
          trend: stats.revenueChange >= 0 ? 'up' : 'down',
        },
        {
          name: 'Transactions',
          value: stats.totalTransactions.toLocaleString(),
          change: `${stats.transactionChange >= 0 ? '+' : ''}${stats.transactionChange.toFixed(1)}%`,
          icon: Activity,
          trend: stats.transactionChange >= 0 ? 'up' : 'down',
        },
        {
          name: 'Active Users',
          value: stats.activeUsers.toLocaleString(),
          change: `${stats.userChange >= 0 ? '+' : ''}${stats.userChange.toFixed(1)}%`,
          icon: Users,
          trend: stats.userChange >= 0 ? 'up' : 'down',
        },
        {
          name: 'Success Rate',
          value: `${stats.successRate.toFixed(1)}%`,
          change: `${stats.successRateChange >= 0 ? '+' : ''}${stats.successRateChange.toFixed(1)}%`,
          icon: TrendingUp,
          trend: stats.successRateChange >= 0 ? 'up' : 'down',
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statsData.map((stat) => (
              <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <stat.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
      </div>

      {/* Analytics charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <AnalyticsCharts />
      )}

      {/* Recent transactions table */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
        <RecentTransactionsTable />
      </div>
    </div>
  );
}
