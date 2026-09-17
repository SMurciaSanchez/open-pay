'use client';

import { useRouter } from 'next/navigation';
import { SendMoneyForm } from '@/components/transactions/SendMoneyForm';
import { Toaster } from '@/components/ui/toaster';

export default function SendMoneyPage() {
  const router = useRouter();
  
  const handleTransactionSuccess = (transactionId: string) => {
    // Navigate to transaction detail on success
    setTimeout(() => {
      router.push(`/transactions/${transactionId}`);
    }, 1500);
  };
  
  return (
    <div className="container py-10 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Enviar dinero</h1>
        <p className="text-muted-foreground mt-2">
          Realiza transferencias a otros usuarios de OpenPay
        </p>
      </div>
      
      <SendMoneyForm onSuccess={handleTransactionSuccess} />
      
      <Toaster />
    </div>
  );
} 