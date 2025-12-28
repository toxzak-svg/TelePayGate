
import { DollarSign, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import RecentTransactionsTable from '../components/analytics/RecentTransactionsTable';
import { statsService } from '../api/services';

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
    <div aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat) => (
          <section key={stat.name} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6" aria-labelledby={`${stat.name}-label`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg" aria-hidden="true">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} aria-live="polite">
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <h3 id={`${stat.name}-label`} className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </section>
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
