'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, Download, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';

interface PaymentConfirmationProps {
  paymentData: {
    id: string;
    provider: string;
    accountNumber: string;
    amount: number;
    description?: string;
    status: 'success' | 'processing' | 'failed';
    date: string;
    reference: string;
  };
  onViewReceipt?: () => void;
  onMakeAnotherPayment?: () => void;
}

export function PaymentConfirmation({
  paymentData,
  onViewReceipt,
  onMakeAnotherPayment
}: PaymentConfirmationProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyReference = () => {
    navigator.clipboard.writeText(paymentData.reference);
    setCopied(true);
    toast({
      title: "Referencia copiada",
      description: "La referencia de pago ha sido copiada al portapapeles",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="text-xl">¡Pago Completado!</CardTitle>
        <CardDescription>
          Tu pago de servicio ha sido procesado correctamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Estado</span>
            <Badge variant="outline" className={getStatusColor(paymentData.status)}>
              {paymentData.status === 'success' ? 'Exitoso' : 
               paymentData.status === 'processing' ? 'Procesando' : 'Fallido'}
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-medium">{formatDate(new Date(paymentData.date))}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Referencia</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{paymentData.reference}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={handleCopyReference}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Proveedor</span>
            <span className="font-medium">{paymentData.provider}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cuenta/Servicio</span>
            <span className="font-medium">{paymentData.accountNumber}</span>
          </div>

          {paymentData.description && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Descripción</span>
              <span className="font-medium">{paymentData.description}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Monto</span>
            <span className="font-medium text-lg">{formatCurrency(paymentData.amount)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          className="w-full" 
          variant="outline"
          onClick={onViewReceipt}
        >
          <Download className="mr-2 h-4 w-4" />
          Descargar comprobante
        </Button>
        <Button 
          className="w-full" 
          onClick={onMakeAnotherPayment || (() => router.push('/services'))}
        >
          Realizar otro pago
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
} 