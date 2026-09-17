'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownLeft, CreditCard, AlertCircle, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import {
  getUserTransactions,
  TransactionResponse,
} from '@/lib/api/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OnChainBadge } from './OnChainBadge';

interface TransactionsListProps {
  limit?: number;
  showViewAll?: boolean;
  profileId?: string;
}

export function TransactionsList({ limit, showViewAll = true, profileId }: TransactionsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(profileId ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setTransactions([]);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!currentProfileId) {
          const { data: profile } = await supabase
            .from('Profile')
            .select('id')
            .eq('userId', user.id)
            .single();
          if (profile?.id) setCurrentProfileId(profile.id);
        }

        const { transactions: txs, error: apiError } = await getUserTransactions(user.id);
        if (apiError) throw new Error(apiError);

        const sliced = limit ? txs.slice(0, limit) : txs;
        setTransactions(sliced);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('No se pudieron cargar las transacciones');
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las transacciones',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [limit, toast, user, authLoading, currentProfileId]);

  const isIncoming = (tx: TransactionResponse) =>
    currentProfileId ? tx.receiverId === currentProfileId : false;

  const getTransactionIcon = (tx: TransactionResponse) => {
    if (tx.isEntityPayment && tx.entityReceiver) {
      if (tx.entityReceiver.logoUrl) {
        return (
          <img
            src={tx.entityReceiver.logoUrl}
            alt={tx.entityReceiver.name}
            className="h-6 w-6 rounded-md object-cover"
          />
        );
      }
      return <Building2 className="h-4 w-4 text-indigo-500" />;
    }
    return isIncoming(tx)
      ? <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
      : <ArrowUpRight className="h-4 w-4 text-rose-500" />;
  };

  const getTransactionTitle = (tx: TransactionResponse) => {
    if (tx.isEntityPayment && tx.entityReceiver) {
      return `Pago a ${tx.entityReceiver.name}`;
    }
    if (tx.description) return tx.description;
    return isIncoming(tx) ? 'Transferencia recibida' : 'Transferencia enviada';
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'success') return null;
    if (s === 'pending' || s === 'processing')
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
    if (s === 'failed' || s === 'cancelled')
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Fallida</Badge>;
    return null;
  };

  const handleViewTransaction = (id: string) => {
    router.push(`/transactions/${id}`);
  };

  return (
    <div className="rounded-2xl bg-white border border-violet-100 overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.08)' }}
    >
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}
          >
            <ArrowUpRight className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-none">Movimientos</h3>
            <p className="text-xs text-slate-400 mt-0.5">Historial verificable on-chain</p>
          </div>
        </div>
        {showViewAll && transactions.length > 0 && (
          <button
            onClick={() => router.push('/transactions')}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            Ver todas →
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">No se pudieron cargar</p>
              <p className="text-xs text-slate-400 mt-0.5">Intenta recargar la página</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
            >
              Reintentar →
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Sin transacciones</p>
              <p className="text-xs text-slate-400 mt-0.5">Realiza tu primera transferencia</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {transactions.map((tx) => {
              const incoming = isIncoming(tx);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 hover:bg-violet-50/60 group"
                  onClick={() => handleViewTransaction(tx.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                      tx.isEntityPayment ? 'bg-indigo-100' : incoming ? 'bg-emerald-100' : 'bg-rose-100'
                    }`}>
                      {getTransactionIcon(tx)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 leading-none truncate">
                        {getTransactionTitle(tx)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-xs text-slate-400">
                          {formatDate(tx.createdAt.toISOString())}
                        </p>
                        {getStatusBadge(tx.status)}
                        <OnChainBadge
                          status={tx.onChainStatus}
                          txHash={tx.onChainTxHash}
                          variant="compact"
                        />
                      </div>
                    </div>
                  </div>
                  <p className={`font-bold text-sm tabular-nums ml-2 shrink-0 ${incoming ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {incoming ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
