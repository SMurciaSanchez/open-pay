'use client';

import { useState } from 'react';
import SecurityKey from '../security/SecurityKey';

interface Bank {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  name: string;
  accountNumber: string;
  bank: Bank;
}

export default function TransferForm() {
  const [step, setStep] = useState<number>(1);
  const [amount, setAmount] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  
  // Demo data
  const contacts: Contact[] = [
    { id: '1', name: 'Juan Pérez', accountNumber: '1234567890', bank: { id: '1', name: 'BBVA' } },
    { id: '2', name: 'María González', accountNumber: '0987654321', bank: { id: '2', name: 'Santander' } },
    { id: '3', name: 'Carlos López', accountNumber: '5678901234', bank: { id: '3', name: 'Banorte' } },
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and up to 2 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };
  
  const handleNext = () => {
    setStep(step + 1);
  };
  
  const handleBack = () => {
    setStep(step - 1);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowConfirmation(true);
    }, 1500);
  };
  
  const handleSecurityKeyVerified = (verified: boolean) => {
    if (verified) {
      setStep(4); // Move to confirmation step
    } else {
      // Handle invalid security key
      alert('La clave de seguridad es incorrecta. Inténtelo de nuevo.');
    }
  };
  
  const resetForm = () => {
    setStep(1);
    setAmount('');
    setSelectedContact(null);
    setDescription('');
    setShowConfirmation(false);
  };

  if (showConfirmation) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 max-w-md mx-auto">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-medium text-neutral-900">¡Transferencia exitosa!</h3>
          <div className="mt-3 text-sm text-neutral-500">
            <p>Has transferido ${parseFloat(amount).toFixed(2)} a {selectedContact?.name}</p>
            <p className="mt-1">{new Date().toLocaleString()}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={resetForm}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Nueva transferencia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-neutral-900">Enviar dinero</h2>
        <div className="mt-2 flex justify-between items-start">
          {[
            { num: 1, label: 'Destinatario' },
            { num: 2, label: 'Cantidad' },
            { num: 3, label: 'Verificación' },
            { num: 4, label: 'Confirmar' },
          ].map(({ num: stepNumber, label }) => (
            <div key={stepNumber} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    stepNumber === step
                      ? 'bg-primary-600 text-white'
                      : stepNumber < step
                      ? 'bg-primary-200 text-primary-800'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {stepNumber}
                </div>
                <span className="text-xs text-neutral-500">{label}</span>
              </div>
              {stepNumber < 4 && (
                <div
                  className={`h-0.5 w-8 mb-4 ${
                    stepNumber < step ? 'bg-primary-200' : 'bg-neutral-200'
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div>
          <h3 className="text-base font-medium text-neutral-900">Destinatario</h3>
          <div className="mt-4 space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-3 border rounded-md cursor-pointer ${
                  selectedContact?.id === contact.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-neutral-300 hover:border-primary-400'
                }`}
                onClick={() => setSelectedContact(contact)}
              >
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-neutral-500">
                  {contact.bank.name} - {contact.accountNumber}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!selectedContact}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-base font-medium text-neutral-900">Cantidad</h3>
          <div className="mt-4">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-neutral-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                className="block w-full pl-7 pr-12 sm:text-sm border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-neutral-500 sm:text-sm">MXN</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
              Descripción (opcional)
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full sm:text-sm border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="Concepto de pago"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex justify-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md shadow-sm text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Regresar
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!amount || parseFloat(amount) <= 0}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-base font-medium text-neutral-900">Verificación</h3>
          <div className="mt-4">
            <SecurityKey mode="verify" onVerify={handleSecurityKeyVerified} />
          </div>
          <div className="mt-6 flex justify-start">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex justify-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md shadow-sm text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Regresar
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 className="text-base font-medium text-neutral-900">Confirmar transferencia</h3>
          <div className="mt-4 p-4 bg-neutral-50 rounded-md">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Destinatario:</span>
                <span className="text-sm font-medium">{selectedContact?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Banco:</span>
                <span className="text-sm font-medium">{selectedContact?.bank.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Cuenta:</span>
                <span className="text-sm font-medium">{selectedContact?.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">Monto:</span>
                <span className="text-sm font-medium">${parseFloat(amount).toFixed(2)} MXN</span>
              </div>
              {description && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-500">Descripción:</span>
                  <span className="text-sm font-medium">{description}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex justify-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md shadow-sm text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Regresar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        </div>
      )}
    </div>
  );
} 