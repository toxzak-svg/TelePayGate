import { useQuery } from '@tanstack/react-query';
import { dexService } from '../api/services';
import { TrendingUp, Zap } from 'lucide-react';

export default function DexAnalytics() {
  const { data: liquidity, isLoading } = useQuery({
    queryKey: ['dex-liquidity'],
    queryFn: () => dexService.getLiquidity('STARS', 'TON', 1000),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;

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
              <span className="font-semibold">${liquidity?.sources?.[0]?.liquidityUsd?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Rate</span>
              <span className="font-semibold font-mono">{liquidity?.sources?.[0]?.rate || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">24h Volume</span>
              <span className="font-semibold">$45,231</span>
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
              <span className="font-semibold">${liquidity?.sources?.[1]?.liquidityUsd?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Rate</span>
              <span className="font-semibold font-mono">{liquidity?.sources?.[1]?.rate || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">24h Volume</span>
              <span className="font-semibold">$38,492</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
