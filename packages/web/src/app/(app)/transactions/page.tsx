'use client';

import { TransactionsList } from '@/components/transactions/TransactionsList';
import { Toaster } from '@/components/ui/toaster';
import { Clock } from 'lucide-react';

export default function TransactionsPage() {
  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transacciones</h1>
          <p className="text-slate-500 text-sm">
            Historial completo de tus movimientos
          </p>
        </div>
      </div>

      <TransactionsList showViewAll={false} />
      <Toaster />
    </div>
  );
} 