import { Metadata } from 'next';
import { ServicePaymentForm } from '@/components/services/ServicePaymentForm';

export const metadata: Metadata = {
  title: 'Service Payment | OpenPay',
  description: 'Pay your bills and services with OpenPay',
};

export default function ServicePaymentPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Service Payment</h1>
        <p className="text-muted-foreground">
          Pay your bills and services quickly and securely through OpenPay.
        </p>
      </div>
      
      <ServicePaymentForm />
    </div>
  );
} 