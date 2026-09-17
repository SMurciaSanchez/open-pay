'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { Account } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TransferForm from '@/components/dashboard/TransferForm';

export default function SendMoneyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
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

  const handleTransferComplete = async () => {
    try {
      // Actualizar cuentas después de la transferencia
      const updatedAccounts = await api.getAccounts();
      setAccounts(updatedAccounts);
    } catch (err) {
      console.error('Error al actualizar cuentas:', err);
    }
  };

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
            Necesitas tener al menos una cuenta para poder realizar transferencias.
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
      <div>
        <TransferForm 
          accounts={accounts} 
          onTransferComplete={handleTransferComplete} 
        />
      </div>
    </DashboardLayout>
  );
} 