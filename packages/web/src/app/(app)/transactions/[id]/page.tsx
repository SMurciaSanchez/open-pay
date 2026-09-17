'use client';

import { use } from 'react';
import { TransactionDetail } from '@/components/transactions/TransactionDetail';
import { Toaster } from '@/components/ui/toaster';

// Next.js 15: params es Promise incluso en Client Components
export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="container py-10 max-w-2xl mx-auto">
      <TransactionDetail transactionId={id} />
      <Toaster />
    </div>
  );
}
