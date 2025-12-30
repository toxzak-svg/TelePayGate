
import { DollarSign, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import RecentTransactionsTable from '../components/analytics/RecentTransactionsTable';
import { statsService } from '../api/services';
import StatCard from '../components/common/StatCard';

const AnalyticsCharts = lazy(() => import('../components/analytics/AnalyticsCharts'));

export default function Dashboard() {
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboardStats(),
    refetchInterval: 60000,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  };

  const stats = useMemo(() => [
    {
      name: 'Total Revenue',
      value: formatCurrency(dashboardStats?.totalRevenue),
      change: dashboardStats?.revenueChange ? `${dashboardStats.revenueChange > 0 ? '+' : ''}${dashboardStats.revenueChange.toFixed(1)}%` : 'N/A',
      icon: DollarSign,
      trend: (dashboardStats?.revenueChange ?? 0) >= 0 ? 'up' : 'down'
    },
    {
      name: 'Transactions',
      value: formatNumber(dashboardStats?.totalTransactions),
      change: dashboardStats?.transactionChange ? `${dashboardStats.transactionChange > 0 ? '+' : ''}${dashboardStats.transactionChange.toFixed(1)}%` : 'N/A',
      icon: Activity,
      trend: (dashboardStats?.transactionChange ?? 0) >= 0 ? 'up' : 'down'
    },
    {
      name: 'Active Users',
      value: formatNumber(dashboardStats?.activeUsers),
      change: dashboardStats?.userChange ? `${dashboardStats.userChange > 0 ? '+' : ''}${dashboardStats.userChange.toFixed(1)}%` : 'N/A',
      icon: Users,
      trend: (dashboardStats?.userChange ?? 0) >= 0 ? 'up' : 'down'
    },
    {
      name: 'Success Rate',
      value: formatPercent(dashboardStats?.successRate),
      change: dashboardStats?.successRateChange ? `${dashboardStats.successRateChange > 0 ? '+' : ''}${dashboardStats.successRateChange.toFixed(1)}%` : 'N/A',
      icon: TrendingUp,
      trend: (dashboardStats?.successRateChange ?? 0) >= 0 ? 'up' : 'down'
    },
  ], [dashboardStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" role="alert">
        <p className="text-red-800 dark:text-red-300">Failed to load dashboard stats. Please try again.</p>
      </div>
    );
  }

  return (
    <div aria-labelledby="dashboard-title" className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 id="dashboard-title" className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={stat.name} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in">
            <StatCard
              title={stat.name}
              value={stat.value}
              change={dashboardStats ? parseFloat(stat.change.replace(/[^0-9.-]+/g, '')) : undefined}
              changeLabel="vs last month"
              icon={stat.icon}
              trend={stat.trend}
              loading={isLoading}
              gradient={index % 2 === 0}
            />
          </div>
        ))}
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading charts...</span>
        </div>
      }>
        <AnalyticsCharts />
      </Suspense>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Transactions</h2>
        <RecentTransactionsTable />
      </div>
    </div>
  );
}
