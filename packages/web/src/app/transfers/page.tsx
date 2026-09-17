import TransferForm from '@/components/transfers/TransferForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transferencias | OpenPay',
  description: 'Realiza transferencias bancarias de forma segura y rápida con OpenPay',
}

export default function TransfersPage() {
  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-blue-600 text-lg">↔</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transferencias Bancarias</h1>
          <p className="text-slate-500 text-sm">Enviar dinero de forma segura y rápida</p>
        </div>
      </div>
      <TransferForm />
    </div>
  );
} 