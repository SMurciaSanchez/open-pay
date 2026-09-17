'use client';

import { useRouter } from 'next/navigation';
import { Icons } from '../ui/icons';
import React from 'react';

type QuickAction = {
  id: string;
  title: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export function QuickActions() {
  const router = useRouter();
  
  const actions: QuickAction[] = [
    {
      id: 'send',
      title: 'Enviar',
      color: 'bg-primary-100 text-primary-600',
      icon: <Icons.send className="h-6 w-6" />,
      onClick: () => router.push('/transfers/send')
    },
    {
      id: 'receive',
      title: 'Recibir',
      color: 'bg-success-100 text-success-600',
      icon: <Icons.download className="h-6 w-6" />,
      onClick: () => router.push('/transfers/receive')
    },
    {
      id: 'savings',
      title: 'Ahorros',
      color: 'bg-warning-100 text-warning-600',
      icon: <Icons.wallet className="h-6 w-6" />,
      onClick: () => router.push('/savings')
    },
    {
      id: 'pay-entity',
      title: 'Entidades',
      color: 'bg-indigo-100 text-indigo-600',
      icon: <Icons.receipt className="h-6 w-6" />,
      onClick: () => router.push('/pay-entity')
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className="flex flex-col items-center rounded-xl p-3 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${action.color}`}>
            {action.icon}
          </div>
          <span className="text-center text-sm font-medium text-neutral-700">
            {action.title}
          </span>
        </button>
      ))}
    </div>
  );
} 