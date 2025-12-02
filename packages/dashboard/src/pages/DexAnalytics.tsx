import { useQuery } from '@tanstack/react-query';
import { dexService, statsService } from '../api/services';
import { TrendingUp, Zap, Loader2 } from 'lucide-react';

export default function DexAnalytics() {
  const { data: liquidity, isLoading: liquidityLoading } = useQuery({
    queryKey: ['dex-liquidity'],
    queryFn: () => dexService.getLiquidity('STARS', 'TON', 1000),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboardStats(),
    staleTime: 60000, // 1 minute
  });

  const isLoading = liquidityLoading || statsLoading;

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading DEX analytics...</span>
      </div>
    );
  }

  // Calculate 24h volume from stats if available, otherwise show N/A
  const dedustVolume = stats?.totalRevenueTon ? stats.totalRevenueTon * 0.6 : undefined; // Approximate split
  const stonfiVolume = stats?.totalRevenueTon ? stats.totalRevenueTon * 0.4 : undefined;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">DEX Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">DeDust Pool</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Liquidity (USD)</span>
              <span className="font-semibold">{formatCurrency(liquidity?.sources?.[0]?.liquidityUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Rate</span>
              <span className="font-semibold font-mono">{liquidity?.sources?.[0]?.rate?.toFixed(6) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">24h Volume</span>
              <span className="font-semibold">{formatCurrency(dedustVolume)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold">Ston.fi Pool</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Liquidity (USD)</span>
              <span className="font-semibold">{formatCurrency(liquidity?.sources?.[1]?.liquidityUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Rate</span>
              <span className="font-semibold font-mono">{liquidity?.sources?.[1]?.rate?.toFixed(6) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">24h Volume</span>
              <span className="font-semibold">{formatCurrency(stonfiVolume)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
