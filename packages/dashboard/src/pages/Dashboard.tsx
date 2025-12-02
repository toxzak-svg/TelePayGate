
import { DollarSign, TrendingUp, Users, Activity, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AnalyticsCharts from '../components/analytics/AnalyticsCharts';
import RecentTransactionsTable from '../components/analytics/RecentTransactionsTable';
import { statsService } from '../api/services';

export default function Dashboard() {
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboardStats(),
    refetchInterval: 60000, // Refresh every minute
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

  const stats = [
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
  ];

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load dashboard stats. Please try again.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <stat.icon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
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
      <AnalyticsCharts />

      {/* Recent transactions table */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
        <RecentTransactionsTable />
      </div>
    </div>
  );
}
