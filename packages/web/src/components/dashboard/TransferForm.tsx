'use client';

import { useState } from 'react';
import { Account } from '@/lib/api';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type TransferFormProps = {
  accounts: Account[];
  onTransferComplete?: () => void;
};

export default function TransferForm({ accounts, onTransferComplete }: TransferFormProps) {
  const [step, setStep] = useState<'amount' | 'recipient' | 'confirm' | 'result'>('amount');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [transferData, setTransferData] = useState({
    sourceAccountId: accounts[0]?.id || '',
    destinationType: 'openpay', // openpay | external
    amount: '',
    destinationId: '',
    recipientName: '',
    description: '',
  });

  // Métodos de transferencia
  const transferMethods = [
    {
      id: 'openpay',
      name: 'A cuenta OpenPay',
      icon: (
        <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      description: 'Transfiere a cuentas de amigos en OpenPay',
    },
    {
      id: 'external',
      name: 'A otro banco',
      icon: (
        <svg className="h-6 w-6 text-secondary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
        </svg>
      ),
      description: 'Transfiere a otros bancos',
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransferData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSelectTransferMethod = (methodId: 'openpay' | 'external') => {
    setTransferData((prev) => ({ ...prev, destinationType: methodId }));
  };

  const handleSubmitAmount = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que el monto sea válido y mayor a cero
    const amount = parseFloat(transferData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Ingresa un monto válido mayor a cero');
      return;
    }
    
    // Validar que el monto no supere el saldo disponible
    const sourceAccount = accounts.find(acc => acc.id === transferData.sourceAccountId);
    if (sourceAccount && Number(sourceAccount.balance) < amount) {
      setError('No tienes saldo suficiente para esta transferencia');
      return;
    }
    
    setStep('recipient');
  };

  const handleSubmitRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar datos del destinatario
    if (transferData.destinationType === 'openpay' && !transferData.destinationId) {
      setError('Ingresa el ID o número de cuenta del destinatario');
      return;
    }
    
    if (transferData.destinationType === 'external') {
      if (!transferData.destinationId || !transferData.recipientName) {
        setError('Ingresa todos los datos del destinatario');
        return;
      }
    }
    
    setStep('confirm');
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // En un caso real, aquí se llamaría a la API con los datos apropiados según el tipo de transferencia
      // TODO: implement via Supabase RPC transfer_funds when recipient lookup is available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('¡Transferencia realizada con éxito!');
      setStep('result');
      
      // Callback para actualizar datos en el componente padre
      onTransferComplete?.();
    } catch (err: any) {
      console.error('Error al realizar transferencia:', err);
      setError(err.message || 'Ha ocurrido un error al procesar tu transferencia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTransfer = () => {
    // Reiniciar el formulario
    setTransferData({
      sourceAccountId: accounts[0]?.id || '',
      destinationType: 'openpay',
      amount: '',
      destinationId: '',
      recipientName: '',
      description: '',
    });
    setStep('amount');
    setError(null);
    setSuccessMessage(null);
  };

  // Renderizar pantalla según el paso actual
  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold text-neutral-900">Transferir dinero</h2>
      
      {error && (
        <div className="mb-4 rounded-md bg-danger-50 p-3 text-danger-800">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {step === 'amount' && (
        <form onSubmit={handleSubmitAmount} className="space-y-6">
          <div>
            <label htmlFor="sourceAccountId" className="block text-sm font-medium text-neutral-700">
              Cuenta de origen
            </label>
            <select
              id="sourceAccountId"
              name="sourceAccountId"
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white py-2 px-3 text-neutral-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={transferData.sourceAccountId}
              onChange={handleInputChange}
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.number} - {formatCurrency(Number(account.balance))}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-neutral-700">
              Monto a transferir
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-neutral-500">$</span>
              </div>
              <input
                type="number"
                name="amount"
                id="amount"
                className="block w-full rounded-md border-neutral-300 pl-7 pr-12 focus:border-primary-500 focus:ring-primary-500"
                placeholder="0.00"
                value={transferData.amount}
                onChange={handleInputChange}
                required
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-neutral-500">COP</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-neutral-700">¿Cómo quieres transferir?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {transferMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`flex items-center rounded-xl border-2 p-4 transition-colors ${
                    transferData.destinationType === method.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                  onClick={() => handleSelectTransferMethod(method.id as 'openpay' | 'external')}
                >
                  <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                    {method.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-neutral-900">{method.name}</p>
                    <p className="text-xs text-neutral-500">{method.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="w-full rounded-md bg-primary-600 py-3 px-4 text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Continuar
            </button>
          </div>
        </form>
      )}
      
      {step === 'recipient' && (
        <form onSubmit={handleSubmitRecipient} className="space-y-6">
          {transferData.destinationType === 'openpay' ? (
            <>
              <div className="mb-6 rounded-md bg-primary-50 p-4">
                <p className="text-sm text-primary-800">
                  Vas a transferir <span className="font-semibold">{formatCurrency(parseFloat(transferData.amount), 'COP')}</span>{' '}
                  a una cuenta de OpenPay
                </p>
              </div>
              
              <div>
                <label htmlFor="destinationId" className="block text-sm font-medium text-neutral-700">
                  Número de cuenta o ID del destinatario
                </label>
                <input
                  type="text"
                  name="destinationId"
                  id="destinationId"
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={transferData.destinationId}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-md bg-secondary-50 p-4">
                <p className="text-sm text-secondary-800">
                  Vas a transferir <span className="font-semibold">{formatCurrency(parseFloat(transferData.amount), 'COP')}</span>{' '}
                  a una cuenta bancaria externa
                </p>
              </div>
              
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-neutral-700">
                  Nombre del destinatario
                </label>
                <input
                  type="text"
                  name="recipientName"
                  id="recipientName"
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={transferData.recipientName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="destinationId" className="block text-sm font-medium text-neutral-700">
                  Número de cuenta bancaria
                </label>
                <input
                  type="text"
                  name="destinationId"
                  id="destinationId"
                  className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={transferData.destinationId}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
              Descripción (opcional)
            </label>
            <textarea
              name="description"
              id="description"
              rows={2}
              className="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={transferData.description}
              onChange={handleInputChange}
              placeholder="Ej: Pago de alquiler"
            />
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep('amount')}
              className="rounded-md border border-neutral-300 bg-white py-2 px-4 text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              Atrás
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-600 py-2 px-4 text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Continuar
            </button>
          </div>
        </form>
      )}
      
      {step === 'confirm' && (
        <form onSubmit={handleConfirmTransfer} className="space-y-6">
          <div className="rounded-xl bg-neutral-50 p-6">
            <h3 className="mb-4 text-center text-lg font-medium text-neutral-900">Confirma tu transferencia</h3>
            
            <div className="mb-6 text-center">
              <p className="text-3xl font-bold text-primary-600">
                {formatCurrency(parseFloat(transferData.amount), 'COP')}
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <p className="text-sm text-neutral-500">De</p>
                <p className="text-sm font-medium text-neutral-900">
                  {accounts.find(acc => acc.id === transferData.sourceAccountId)?.number || 'Tu cuenta'}
                </p>
              </div>
              
              <div className="flex justify-between">
                <p className="text-sm text-neutral-500">Para</p>
                <p className="text-sm font-medium text-neutral-900">
                  {transferData.destinationType === 'openpay' 
                    ? `Cuenta OpenPay ${transferData.destinationId}` 
                    : `${transferData.recipientName} - ${transferData.destinationId}`}
                </p>
              </div>
              
              {transferData.description && (
                <div className="flex justify-between">
                  <p className="text-sm text-neutral-500">Descripción</p>
                  <p className="text-sm font-medium text-neutral-900">{transferData.description}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep('recipient')}
              className="rounded-md border border-neutral-300 bg-white py-2 px-4 text-neutral-700 shadow-sm hover:bg-neutral-50"
              disabled={isLoading}
            >
              Atrás
            </button>
            <button
              type="submit"
              className="flex items-center rounded-md bg-primary-600 py-2 px-4 text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                'Confirmar transferencia'
              )}
            </button>
          </div>
        </form>
      )}
      
      {step === 'result' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
            <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h3 className="mb-2 text-xl font-medium text-neutral-900">{successMessage}</h3>
          <p className="mb-6 text-neutral-600">
            Has transferido {formatCurrency(parseFloat(transferData.amount), 'COP')} exitosamente.
          </p>
          
          <div className="rounded-xl bg-neutral-50 p-4 text-left">
            <div className="mb-2 flex justify-between">
              <p className="text-sm text-neutral-500">Monto</p>
              <p className="text-sm font-medium text-neutral-900">
                {formatCurrency(parseFloat(transferData.amount), 'COP')}
              </p>
            </div>
            
            <div className="mb-2 flex justify-between">
              <p className="text-sm text-neutral-500">Destinatario</p>
              <p className="text-sm font-medium text-neutral-900">
                {transferData.destinationType === 'openpay' 
                  ? `Cuenta OpenPay ${transferData.destinationId}` 
                  : transferData.recipientName}
              </p>
            </div>
            
            <div className="flex justify-between">
              <p className="text-sm text-neutral-500">Fecha</p>
              <p className="text-sm font-medium text-neutral-900">
                {new Date().toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={handleNewTransfer}
              className="rounded-md bg-primary-600 py-2 px-4 text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Nueva transferencia
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 