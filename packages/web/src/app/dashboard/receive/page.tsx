'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { Account } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import QRTransfer from '@/components/dashboard/QRTransfer';

export default function ReceiveMoneyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        setIsLoading(true);
        
        // Cargar perfil del usuario
        const userProfile = await api.getProfile();
        setUser(userProfile);
        
        // Cargar cuentas del usuario
        const userAccounts = await api.getAccounts();
        setAccounts(userAccounts);
        
        // Seleccionar primera cuenta por defecto
        if (userAccounts.length > 0) {
          setSelectedAccountId(userAccounts[0].id);
        }
      } catch (err) {
        console.error('Error al cargar datos del usuario:', err);
        setError('No se pudieron cargar tus datos. Por favor, intenta nuevamente.');
        
        // Si no está autenticado, redirigir al login
        if ((err as any).status === 401) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUserData();
  }, [router]);

  // Obtener la cuenta seleccionada
  const selectedAccount = accounts.find(account => account.id === selectedAccountId);

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mb-4 inline-block rounded-full bg-primary-100 p-4">
            <svg className="h-8 w-8 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-lg font-medium text-neutral-900">Cargando tus cuentas...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de error
  if (error || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-danger-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mb-4 text-xl font-bold text-neutral-900">Ha ocurrido un problema</h2>
          <p className="text-neutral-600">{error || 'No se pudo cargar tu información'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  // Si no hay cuentas disponibles
  if (accounts.length === 0) {
    return (
      <DashboardLayout user={user}>
        <div className="rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-primary-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-medium text-neutral-900">No tienes cuentas disponibles</h2>
          <p className="mb-6 text-neutral-600">
            Necesitas tener al menos una cuenta para poder recibir transferencias.
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Volver al inicio
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Selector de cuenta */}
        {accounts.length > 1 && (
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-medium text-neutral-900">Selecciona la cuenta para recibir dinero</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={`flex items-center rounded-xl border-2 p-4 transition-colors ${
                    selectedAccountId === account.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                  onClick={() => setSelectedAccountId(account.id)}
                >
                  <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                    <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-neutral-900">
                      {account.type} {account.number.slice(-4)}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(account.balance)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Componente QR */}
        {selectedAccount && <QRTransfer account={selectedAccount} />}
        
        {/* Opciones adicionales */}
        <div className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-medium text-neutral-900">Otras formas de recibir dinero</h2>
          
          <div className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4 hover:border-primary-300 hover:bg-primary-50">
              <div className="flex items-center">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-success-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">Enlace de pago</h3>
                  <p className="text-sm text-neutral-500">Genera y comparte un enlace para que otros te envíen dinero</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-neutral-200 p-4 hover:border-primary-300 hover:bg-primary-50">
              <div className="flex items-center">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-warning-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-warning-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-neutral-900">Cobro programado</h3>
                  <p className="text-sm text-neutral-500">Configura cobros recurrentes para pagos periódicos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 