'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface DashboardLayoutProps {
  user: User;
  children: ReactNode;
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Leemos el usuario de Supabase Auth para verificar app_metadata (firmado por el server,
  // no manipulable por el cliente a diferencia de user_metadata).
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.app_metadata?.role === 'admin';

  const navigation = [
    { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
    { name: 'Transacciones', href: '/dashboard/transactions', icon: TransactionIcon },
    { name: 'Servicios', href: '/services', icon: ServicesIcon },
    { name: 'Soporte', href: '/support', icon: SupportIcon },
    { name: 'Perfil', href: '/dashboard/profile', icon: ProfileIcon },
    ...(isAdmin ? [{ name: 'Admin', href: '/admin', icon: AdminIcon }] : []),
  ];
  
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 z-50 w-full border-t border-neutral-200 bg-white lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center p-2 ${
                  isActive ? 'text-primary-600' : 'text-neutral-500 hover:text-primary-600'
                }`}
              >
                <item.icon className={`h-6 w-6 ${isActive ? 'text-primary-600' : 'text-neutral-500'}`} />
                <span className="mt-1 text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-20 lg:overflow-y-auto lg:bg-white lg:pb-4">
        <div className="flex h-16 shrink-0 items-center justify-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
            OP
          </Link>
        </div>
        <nav className="mt-8">
          <ul role="list" className="flex flex-col items-center space-y-10">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center group rounded-md p-2 ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                  >
                    <item.icon
                      className={`h-6 w-6 ${
                        isActive ? 'text-primary-600' : 'text-neutral-500 group-hover:text-primary-600'
                      }`}
                    />
                    <span className="mt-2 text-xs font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <main className="lg:pl-20">
        <div className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6 lg:px-8 lg:py-10">
          {/* Header with avatar and welcome message */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">¡Bienvenido de nuevo!</p>
              <h1 className="text-2xl font-bold text-neutral-900">
                {user.fullName}
              </h1>
            </div>
            
            <div className="flex items-center">
              <button
                type="button"
                className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                aria-label="Notificaciones"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
              </button>
              <Link
                href="/dashboard/profile"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-100 ring-2 ring-white"
              >
                {/* If we had an avatar image: <img src={user.avatar} alt={user.name} /> */}
                <span className="text-base font-medium text-primary-700">
                  {user.fullName?.charAt(0) || ''}
                </span>
              </Link>
            </div>
          </div>
          
          {/* Page content */}
          {children}
        </div>
      </main>
    </div>
  );
}

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function TransactionIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function ServicesIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
} 