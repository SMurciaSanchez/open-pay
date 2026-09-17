'use client';

import { useRouter } from 'next/navigation';
import { PayEntityForm } from '@/components/transactions/PayEntityForm';
import { Toaster } from '@/components/ui/toaster';

export default function PayEntityPage() {
  const router = useRouter();

  const handleSuccess = (transactionId: string) => {
    setTimeout(() => {
      router.push(`/transactions/${transactionId}`);
    }, 1500);
  };

  return (
    <div className="container py-10 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pagar a una entidad</h1>
        <p className="text-muted-foreground mt-2">
          Paga impuestos, servicios o dona a organizaciones verificadas. Cada pago se ancla on-chain.
        </p>
      </div>

      <PayEntityForm onSuccess={handleSuccess} />

      <Toaster />
    </div>
  );
}
