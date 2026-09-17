'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Transaction, TransactionStatus, TransactionType } from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime, 
  getStatusColor, 
  getTransactionTypeInfo 
} from '@/lib/utils';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Icons } from '@/components/ui/icons';
import { OnChainBadge } from '@/components/transactions/OnChainBadge';
import type { OnChainStatus } from '@/lib/api';

export function RecentTransactions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const { transactions } = await api.getTransactions({ limit: 5 });
        setTransactions(transactions as unknown as Transaction[]);
      } catch (err) {
        setError('An error occurred while fetching transactions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your most recent financial activities</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                <div className={`rounded-full p-2 ${getTransactionTypeInfo(transaction.type).classes}`}>
                  {(() => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    const IconComponent = Icons[typeInfo.icon];
                    return <IconComponent className="h-4 w-4" />;
                  })()}
                </div>
                <div className="flex-1">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.reference} • 
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                            <span>{formatRelativeTime(transaction.createdAt)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatDate(transaction.createdAt)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                  <OnChainBadge
                    status={(transaction as { onChainStatus?: OnChainStatus | null }).onChainStatus}
                    txHash={(transaction as { onChainTxHash?: string | null }).onChainTxHash}
                    variant="compact"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 