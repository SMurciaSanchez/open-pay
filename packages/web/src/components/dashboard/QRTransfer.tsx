'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type QRTransferProps = {
  account: Account;
};

export default function QRTransfer({ account }: QRTransferProps) {
  const [tab, setTab] = useState<'myQR' | 'scanQR'>('myQR');
  const [qrValue, setQrValue] = useState('');
  const [showFullAccount, setShowFullAccount] = useState(false);
  
  // Generar datos para el QR
  useEffect(() => {
    if (!account) return;
    
    // En una implementación real, esto podría incluir un token temporal por seguridad
    const qrData = {
      accountId: account.id,
      accountNumber: account.number,
      type: 'openpay-transfer',
      timestamp: Date.now(),
    };
    
    setQrValue(JSON.stringify(qrData));
  }, [account]);

  return (
    <div className="rounded-xl bg-white p-6 shadow-md">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Transferencia con QR</h2>
      </div>
      
      {/* Pestañas */}
      <div className="mb-6 flex rounded-lg bg-neutral-100 p-1">
        <button
          onClick={() => setTab('myQR')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === 'myQR'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-neutral-600 hover:text-primary-600'
          }`}
        >
          Mi código QR
        </button>
        <button
          onClick={() => setTab('scanQR')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === 'scanQR'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-neutral-600 hover:text-primary-600'
          }`}
        >
          Escanear QR
        </button>
      </div>
      
      {tab === 'myQR' ? (
        <div className="text-center">
          <div className="mb-4">
            <p className="text-sm text-neutral-500">Comparte este código para recibir dinero</p>
          </div>
          
          <div className="mb-6 flex justify-center">
            {/* QR Code (simulado) */}
            <div className="relative">
              <div className="h-64 w-64 rounded-xl bg-white p-4 shadow-md">
                <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-neutral-300">
                  {/* En una implementación real, aquí se usaría una biblioteca de QR como qrcode.react */}
                  <div className="h-48 w-48 overflow-hidden rounded-lg bg-neutral-900 p-2">
                    <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-1">
                      {/* Simulación visual de un código QR */}
                      {Array.from({ length: 49 }).map((_, index) => {
                        // Generar patrón visual pseudo-aleatorio pero consistente
                        const shouldFill = 
                          // Esquinas siempre llenas para simular los cuadrados de anclaje del QR
                          (index < 7 && (index < 3 || index > 3)) || 
                          (index > 41 && (index < 45 || index > 45)) || 
                          (index % 7 < 3 && Math.floor(index / 7) < 3) ||
                          (index % 7 > 3 && Math.floor(index / 7) < 3) ||
                          (index % 7 < 3 && Math.floor(index / 7) > 3) ||
                          // Patrón semi-aleatorio pero consistente para el resto
                          ((index * 13) % 17 < 8 && index % 3 !== 0);
                          
                        return (
                          <div
                            key={index}
                            className={`${shouldFill ? 'bg-white' : 'bg-transparent'} rounded-sm`}
                          ></div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Logo de OpenPay superpuesto en el centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md">
                  <span className="text-lg font-bold text-primary-600">OP</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl bg-neutral-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">Cuenta</p>
              <button 
                onClick={() => setShowFullAccount(!showFullAccount)}
                className="text-xs font-medium text-primary-600"
              >
                {showFullAccount ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="font-mono text-neutral-900">
              {showFullAccount 
                ? account.number 
                : account.number.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 •••• •••• $4')}
            </p>
          </div>
          
          <div className="mt-4">
            <button 
              className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              onClick={() => navigator.clipboard.writeText(account.number)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
              </svg>
              Copiar número de cuenta
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-4">
            <p className="text-sm text-neutral-500">Escanea un código QR para transferir dinero</p>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            {/* En una implementación real, aquí se usaría la cámara y un detector de QR */}
            <div className="mb-6 h-64 w-64 rounded-xl bg-neutral-900 p-4">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-2 h-10 w-10 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <p className="text-sm text-white">Cámara no disponible en el navegador</p>
              </div>
            </div>
            
            <div className="mb-4 rounded-xl bg-primary-50 p-4 text-center">
              <p className="text-sm text-primary-700">
                En la aplicación móvil podrás escanear códigos QR para transferir dinero rápidamente.
              </p>
            </div>
            
            <button 
              className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
              onClick={() => alert('Esta funcionalidad está disponible en la app móvil')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
              </svg>
              Descargar la app
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 