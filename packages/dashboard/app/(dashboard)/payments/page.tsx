import * as React from 'react';
import { usePayments } from '@/lib/api/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Search, Filter, Download } from 'lucide-react';
import { useState } from 'react';
import { formatStars, formatDate, getStatusColor } from '@/lib/utils';
import type { Payment, PaymentFilters } from '@/lib/types';

export default function PaymentsPage() {
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: payments, isLoading } = usePayments(filters);

  const handleFilterChange = (key: keyof PaymentFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredPayments = React.useMemo(() => {
    if (!payments) return [];
    return payments.filter((payment) =>
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payments, searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="converting">Converting</option>
                <option value="converted">Converted</option>
                <option value="settled">Settled</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({})}
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>

          {/* Payments Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-foreground">ID</th>
                    <th className="text-left p-4 font-medium text-foreground">Amount</th>
                    <th className="text-left p-4 font-medium text-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {payment.id.substring(0, 8)}
                        </code>
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {formatStars(payment.starsAmount)}
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
