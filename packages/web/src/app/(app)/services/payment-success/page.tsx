'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PaymentConfirmation } from '@/components/services/PaymentConfirmation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentId = searchParams.get('id');

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!paymentId) {
        setError('No se encontró el ID del pago');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Mock data for demo purposes
        setTimeout(() => {
          setPayment({
            id: paymentId,
            provider: 'CFE (Comisión Federal de Electricidad)',
            accountNumber: '123456789012',
            amount: 1250.50,
            description: 'Pago bimestral',
            status: 'success',
            date: new Date().toISOString(),
            reference: 'OP' + Math.random().toString(36).substring(2, 10).toUpperCase(),
          });
          setLoading(false);
        }, 1500);
      } catch (err) {
        setError('Error al cargar los detalles del pago');
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId]);

  const handleViewReceipt = () => {
    alert('Esta funcionalidad estaría integrada con un generador de PDF');
  };

  const handleMakeAnotherPayment = () => {
    router.push('/services');
  };

  if (loading) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-primary rounded-full animate-spin"></div>
          <p className="text-center text-muted-foreground">Cargando información del pago...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-xl font-bold">Error</h1>
          <p className="text-center text-muted-foreground">{error || 'No se pudo cargar la información del pago'}</p>
          <Button onClick={() => router.push('/services')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Servicios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-12 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/services')}
          className="pl-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Servicios
        </Button>
      </div>

      <PaymentConfirmation
        paymentData={payment}
        onViewReceipt={handleViewReceipt}
        onMakeAnotherPayment={handleMakeAnotherPayment}
      />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-md mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-primary rounded-full animate-spin"></div>
          <p className="text-center text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
