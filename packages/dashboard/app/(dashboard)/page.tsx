import * as React from 'react';
import { useMe } from '@/lib/api/auth';
import { usePaymentStats } from '@/lib/api/payments';
import { useConversions } from '@/lib/api/conversions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ArrowRightLeft, TrendingUp, Users, Zap, DollarSign, Activity } from 'lucide-react';
import { formatCurrency, formatStars } from '@/lib/utils';

export default function DashboardPage() {
  const { data: user } = useMe();
  const { data: paymentStats } = usePaymentStats();
  const { data: recentConversions } = useConversions({ limit: 5 });

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome back, {user?.appName || 'User'}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage your Telegram Stars payments and TON conversions
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Payments */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {paymentStats?.totalPayments || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Stars */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Activity className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatStars(paymentStats?.totalStars || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Stars</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Conversions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <ArrowRightLeft className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {paymentStats?.totalConversions || 0}
                </p>
                <p className="text-sm text-muted-foreground">Conversions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {paymentStats?.successRate ? `${(paymentStats.successRate * 100).toFixed(1)}%` : '0%'}
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Link
              href="/dashboard/conversions/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-medium">Create Conversion</span>
            </Link>
            <Link
              href="/dashboard/p2p/orders/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Create P2P Order</span>
            </Link>
            <Link
              href="/dashboard/dex/swap"
              className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
            >
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-medium">DEX Swap</span>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentConversions && recentConversions.length > 0 ? (
            <div className="space-y-4">
              {recentConversions.slice(0, 5).map((conversion) => (
                <div
                  key={conversion.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {formatStars(conversion.sourceAmount)} → {formatCurrency(conversion.targetAmount, conversion.targetCurrency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(conversion.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        conversion.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : conversion.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      )}
                    >
                      {conversion.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No recent conversions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
