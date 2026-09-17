'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ArrowRightLeft, CreditCard, Users, Clock,
  Bell, Settings, HelpCircle, LogOut, Menu, X, ChevronDown,
  User, Shield, Zap, Search, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface DashboardLayoutProps { children: React.ReactNode }

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const mainNavItems: NavItem[] = [
  { title: 'Panel Principal', href: '/dashboard',    icon: LayoutDashboard },
  { title: 'Transferencias',  href: '/transfers',    icon: ArrowRightLeft },
  { title: 'Transacciones',   href: '/transactions', icon: Clock, badge: 3 },
  { title: 'Pagar entidad',   href: '/pay-entity',   icon: Building2 },
  { title: 'Servicios',       href: '/services',     icon: CreditCard },
  { title: 'Contactos',       href: '/contacts',     icon: Users },
];

const bottomNavItems: NavItem[] = [
  { title: 'Configuración', href: '/settings',  icon: Settings },
  { title: 'Seguridad',     href: '/security',  icon: Shield },
  { title: 'Soporte',       href: '/support',   icon: HelpCircle },
  { title: 'Admin',         href: '/admin',     icon: Shield },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('Usuario');
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserName(
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Usuario'
        );
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-violet-50/50">

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] lg:static lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'linear-gradient(180deg, #1e1b4b 0%, #160f3a 55%, #0c0a24 100%)',
          borderRight: '1px solid rgba(139,92,246,0.15)',
        }}
      >
        {/* Logo */}
        <div className="flex h-[70px] shrink-0 items-center justify-between px-5"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.12)' }}
        >
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                boxShadow: '0 6px 20px rgba(124,58,237,0.5)',
              }}
            >
              <Zap className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <p className="text-white font-bold text-base leading-none">OpenPay</p>
              <p className="text-indigo-400 text-[10px] leading-none mt-0.5">Finanzas seguras</p>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg text-indigo-400 hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-auto px-3 py-5 space-y-0.5">
          {mainNavItems.map((navItem, i) => {
            const isActive = pathname === navItem.href;
            return (
              <motion.div
                key={navItem.href}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link
                  href={navItem.href}
                  className={cn('sidebar-item', isActive ? 'sidebar-item-active' : 'sidebar-item-inactive')}
                >
                  <navItem.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="flex-1 text-sm">{navItem.title}</span>
                  {navItem.badge && (
                    <span className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full text-[11px] font-bold px-1.5',
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-violet-500/25 text-violet-300'
                    )}>
                      {navItem.badge}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}

          {/* Divider */}
          <div className="pt-5 pb-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
              Mi cuenta
            </p>
          </div>

          {bottomNavItems.map((navItem, i) => {
            const isActive = pathname === navItem.href;
            return (
              <motion.div
                key={navItem.href}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (mainNavItems.length + i) * 0.05, duration: 0.3 }}
              >
                <Link
                  href={navItem.href}
                  className={cn('sidebar-item', isActive ? 'sidebar-item-active' : 'sidebar-item-inactive')}
                >
                  <navItem.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-sm">{navItem.title}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(139,92,246,0.12)' }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.15)' }}
          >
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
            >
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-indigo-400 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full sidebar-item text-rose-400 hover:text-rose-300 transition-colors"
            style={{ background: 'transparent' }}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Top header */}
        <header
          className="h-[70px] shrink-0 flex items-center gap-4 px-4 md:px-6"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(139,92,246,0.1)',
            boxShadow: '0 1px 15px rgba(124,58,237,0.06)',
          }}
        >
          {/* Mobile menu */}
          <button
            className="p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-violet-200"
            style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)' }}
          >
            <Search className="h-4 w-4 text-violet-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-sm text-slate-600 placeholder-violet-300 outline-none border-none shadow-none p-0 focus:ring-0"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Bell */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-600 ring-2 ring-white" />
            </motion.button>

            {/* Profile dropdown */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 hover:bg-violet-50 transition-colors"
                aria-expanded={isProfileOpen}
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                >
                  {userInitial}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {userName}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', isProfileOpen && 'rotate-180')} />
              </motion.button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl py-2 z-50"
                    style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.15), 0 4px 15px rgba(0,0,0,0.08)', border: '1px solid rgba(139,92,246,0.12)' }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
                      <p className="text-xs text-slate-400">Conectado como</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{userEmail}</p>
                    </div>
                    {[
                      { label: 'Mi perfil',    href: '/settings/profile' },
                      { label: 'Configuración', href: '/settings' },
                      { label: 'Seguridad',    href: '/security' },
                    ].map(({ label, href }) => (
                      <Link
                        key={href}
                        href={href}
                        className="block px-4 py-2 text-sm text-slate-600 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        {label}
                      </Link>
                    ))}
                    <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(139,92,246,0.08)' }}>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 transition-colors"
                        onClick={() => { setIsProfileOpen(false); handleSignOut(); }}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ background: '#f7f5ff' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
