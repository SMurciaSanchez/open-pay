'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  AlertCircle,
  Check,
  Copy,
  ChevronLeft,
  Building2,
} from 'lucide-react';
import { CATEGORY_LABELS, EntityCategory } from '@/lib/api/entities';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { getTransactionById, TransactionResponse } from '@/lib/api/transactions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OnChainBadge } from './OnChainBadge';

interface TransactionDetailProps {
  transactionId: string;
}

export function TransactionDetail({ transactionId }: TransactionDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user) {
          const { data: profile } = await supabase
            .from('Profile')
            .select('id')
            .eq('userId', user.id)
            .single();
          if (profile?.id) setProfileId(profile.id);
        }

        const result = await getTransactionById(transactionId);
        if ('message' in result) throw new Error(result.message);
        setTransaction(result);
      } catch (err) {
        console.error('Error fetching transaction:', err);
        const msg = err instanceof Error ? err.message : 'No se pudo cargar la transacción';
        setError(msg);
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchTransaction();
    }
  }, [transactionId, toast, user]);

  const isIncoming = transaction && profileId
    ? transaction.receiverId === profileId
    : false;

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'success')
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completada</Badge>;
    if (s === 'pending' || s === 'processing')
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
    if (s === 'failed' || s === 'cancelled')
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Fallida</Badge>;
    return null;
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: message });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !transaction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>No se pudo cargar la información de la transacción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-semibold">{error || 'Transacción no encontrada'}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Intenta nuevamente o revisa el ID de la transacción
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEntity = transaction.isEntityPayment && transaction.entityReceiver;
  const entity = transaction.entityReceiver;

  const title = isEntity && entity
    ? `Pago a ${entity.name}`
    : transaction.description
      || (isIncoming ? 'Transferencia recibida' : 'Transferencia enviada');

  const headerIcon = isEntity
    ? <Building2 className="h-5 w-5 text-indigo-500" />
    : isIncoming
      ? <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
      : <ArrowUpRight className="h-5 w-5 text-rose-500" />;

  const amountColor = isEntity
    ? 'text-indigo-600'
    : isIncoming ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {headerIcon}
              {title}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatDate(transaction.createdAt.toISOString(), 'PPpp')}
            </CardDescription>
          </div>
          {getStatusBadge(transaction.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEntity && entity && (
          <div className="flex items-center gap-3 rounded-md border bg-indigo-50/40 p-3">
            {entity.logoUrl ? (
              <img src={entity.logoUrl} alt={entity.name} className="h-10 w-10 rounded-md object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-md bg-indigo-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-indigo-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{entity.name}</p>
              <p className="text-xs text-slate-500">
                {CATEGORY_LABELS[entity.category as EntityCategory] ?? entity.category} · {entity.entityCode}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center items-center py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Importe</p>
            <p className={`text-3xl font-bold mt-1 ${amountColor}`}>
              {isEntity ? '-' : isIncoming ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>

        <OnChainBadge
          status={transaction.onChainStatus}
          txHash={transaction.onChainTxHash}
          anchoredAt={transaction.anchoredAt}
          variant="detailed"
        />

        <div className="rounded-md border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo</span>
            <span className="font-medium">{transaction.type}</span>
          </div>

          {transaction.description && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Concepto</span>
              <span className="font-medium">{transaction.description}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Referencia</span>
            <div className="flex items-center gap-1">
              <span className="font-medium font-mono text-xs">{transaction.id.slice(0, 8)}…</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(transaction.id, 'ID copiado al portapapeles')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {transaction.status.toLowerCase() === 'completed' && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <div className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                <span className="font-medium">Completada</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </CardFooter>
    </Card>
  );
}
