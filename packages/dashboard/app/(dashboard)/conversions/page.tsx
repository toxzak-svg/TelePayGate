'use client';

import * as React from 'react';
import { useState } from 'react';
import { useConversions, useCreateConversion, useEstimateConversion, useLockRate } from '@/lib/api/conversions';
import { usePayments } from '@/lib/api/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Clock, Lock, Plus } from 'lucide-react';
import { formatCurrency, formatStars, formatDate, getStatusColor } from '@/lib/utils';
import type { Conversion, ConversionFilters } from '@/lib/types';

export default function ConversionsPage() {
  const [filters, setFilters] = useState<ConversionFilters>({});
  const [showNewConversion, setShowNewConversion] = useState(false);
  const [selectedPayments, setSelectedPayments] = React.useState<string[]>([]);
  const [estimate, setEstimate] = React.useState<any>(null);

  const { data: conversions, isLoading } = useConversions(filters);
  const { data: payments } = usePayments();
  const createConversion = useCreateConversion();
  const estimateMutation = useEstimateConversion();
  const lockRateMutation = useLockRate();

  const handleGetEstimate = async () => {
    if (selectedPayments.length === 0) return;
    const result = await estimateMutation.mutateAsync({
      sourceAmount: selectedPayments.reduce((sum, id) => {
        const payment = payments?.find((p) => p.id === id);
        return sum + (payment?.starsAmount || 0);
      }, 0),
      sourceCurrency: 'STARS',
      targetCurrency: 'TON',
    });
    setEstimate(result);
  };

  const handleCreateConversion = async () => {
    if (!estimate) return;
    await createConversion.mutateAsync({
      paymentIds: selectedPayments,
      targetCurrency: 'TON',
      rateLockId: estimate.rateLockId,
    });
    setShowNewConversion(false);
    setSelectedPayments([]);
    setEstimate(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Conversions</CardTitle>
            <Button
              onClick={() => setShowNewConversion(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Conversion
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="rate_locked">Rate Locked</option>
                <option value="phase1_prepared">Phase 1</option>
                <option value="phase2_committed">Phase 2</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Conversions Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading conversions...</p>
            </div>
          ) : conversions && conversions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-foreground">ID</th>
                    <th className="text-left p-4 font-medium text-foreground">Amount</th>
                    <th className="text-left p-4 font-medium text-foreground">Rate</th>
                    <th className="text-left p-4 font-medium text-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {conversions.map((conversion) => (
                    <tr key={conversion.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {conversion.id.substring(0, 8)}
                        </code>
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {formatStars(conversion.sourceAmount)} → {formatCurrency(conversion.targetAmount, conversion.targetCurrency)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {conversion.exchangeRate.toFixed(6)}
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(conversion.status)}>
                          {conversion.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(conversion.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No conversions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Conversion Modal */}
      {showNewConversion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Create New Conversion</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewConversion(false)}
              >
                ✕
              </Button>
            </div>

            {/* Step 1: Select Payments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">1. Select Payments</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the payments you want to convert from Stars to TON
              </p>
              {payments && payments.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      onClick={() => {
                        if (selectedPayments.includes(payment.id)) {
                          setSelectedPayments((prev) => prev.filter((id) => id !== payment.id));
                        } else {
                          setSelectedPayments((prev) => [...prev, payment.id]);
                        }
                      }}
                      className={cn(
                        'p-4 rounded-lg border cursor-pointer transition-colors',
                        selectedPayments.includes(payment.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-accent'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {formatStars(payment.starsAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.createdAt)}
                          </p>
                        </div>
                        {selectedPayments.includes(payment.id) && (
                          <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No payments available</p>
              )}
            </div>

            {/* Step 2: Get Estimate */}
            {selectedPayments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">2. Get Estimate</h3>
                <Button
                  onClick={handleGetEstimate}
                  disabled={estimateMutation.isPending}
                  className="w-full"
                >
                  {estimateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      Getting estimate...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Get Exchange Rate
                    </span>
                  )}
                </Button>

                {estimate && (
                  <div className="mt-4 p-4 rounded-lg bg-muted">
                    <h4 className="font-semibold text-foreground mb-2">Exchange Rate Estimate</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="font-bold text-foreground">
                          1 {estimate.exchangeRate.toFixed(6)} Stars = {estimate.estimatedAmount.toFixed(2)} TON
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees:</span>
                        <span className="font-bold text-destructive">
                          -{estimate.fees?.total?.toFixed(2)} TON
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">You receive:</span>
                        <span className="font-bold text-foreground">
                          {estimate.netAmount?.toFixed(2)} TON
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid until:</span>
                        <span className="font-bold text-foreground">
                          {new Date(estimate.validUntil).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Lock Rate & Create */}
            {estimate && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">3. Lock Rate & Create</h3>
                <div className="flex gap-4">
                  <Button
                    onClick={handleCreateConversion}
                    disabled={createConversion.isPending}
                    className="flex-1"
                  >
                    {createConversion.isPending ? (
                      <span className="flex items-center gap-2">
                        <Lock className="h-4 w-4 animate-spin" />
                        Creating conversion...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Create Conversion
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewConversion(false);
                      setSelectedPayments([]);
                      setEstimate(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
