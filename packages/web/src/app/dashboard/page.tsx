'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SendMoneyForm } from '@/components/transactions/SendMoneyForm';
import { TransactionsList } from '@/components/transactions/TransactionsList';
import { Toaster } from '@/components/ui/toaster';
import api, { Account } from '@/lib/api';
import {
  Send, Download, CreditCard, Users,
  TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownLeft, ShieldCheck, Wallet, Eye, EyeOff,
} from 'lucide-react';

// ── Variantes de animación ─────────────────────────────────────
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

// ── Quick actions ──────────────────────────────────────────────
const quickActions = [
  { label: 'Enviar',     href: '/dashboard/send',    icon: Send,     bg: 'bg-violet-100',  color: 'text-violet-600' },
  { label: 'Recargar',   href: '/dashboard/receive',  icon: Download, bg: 'bg-emerald-100', color: 'text-emerald-600' },
  { label: 'Servicios',  href: '/services',           icon: CreditCard, bg: 'bg-sky-100',   color: 'text-sky-600' },
  { label: 'Contactos',  href: '/contacts',           icon: Users,    bg: 'bg-amber-100',   color: 'text-amber-600' },
];

// ── Stat cards ─────────────────────────────────────────────────
const stats = [
  { label: 'Ingresos del mes',  value: '$45,200', change: '+12.5%', up: true,  icon: TrendingUp,   bg: 'bg-emerald-50', color: 'text-emerald-600' },
  { label: 'Gastos del mes',    value: '$12,380', change: '-3.2%',  up: false, icon: TrendingDown, bg: 'bg-rose-50',    color: 'text-rose-500' },
  { label: 'Transferencias',    value: '24',      change: '+4 esta semana', up: true, icon: ArrowUpRight, bg: 'bg-violet-50', color: 'text-violet-600' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    api.getAccounts().then(accounts => {
      if (accounts.length > 0) setAccount(accounts[0]);
    }).catch(() => {});
  }, []);

  const balance = account?.balance ?? 0;
  const displayBalance = showBalance
    ? balance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '••••••••';

  return (
    <motion.div
      className="px-5 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto space-y-5"
      initial="hidden"
      animate="show"
      variants={container}
    >

      {/* ── HERO BALANCE CARD ────────────────────────────────── */}
      <motion.div variants={item} className="relative rounded-3xl overflow-hidden text-white noise" style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4f46e5 100%)',
        boxShadow: '0 20px 60px rgba(124, 58, 237, 0.4), 0 4px 20px rgba(79, 70, 229, 0.3)',
      }}>
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-56 w-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
        <div className="pointer-events-none absolute top-6 right-1/3 h-24 w-24 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #c4b5fd, transparent 70%)' }} />

        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Balance info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-violet-200" />
                <p className="text-sm text-violet-200 font-medium">Saldo disponible</p>
                <button
                  onClick={() => setShowBalance(v => !v)}
                  className="ml-1 text-violet-300 hover:text-white transition-colors"
                  aria-label="Mostrar/ocultar saldo"
                >
                  {showBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              <motion.h2
                key={displayBalance}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-4xl lg:text-5xl font-bold tracking-tight mt-1"
              >
                {showBalance && '$'}{displayBalance}
              </motion.h2>
              <p className="text-violet-300 text-sm mt-1.5 font-mono">
                MXN · {account?.number ?? '**** ****'}
              </p>

              <div className="flex items-center gap-5 mt-6">
                <div>
                  <div className="flex items-center gap-1 text-violet-300 text-xs mb-0.5">
                    <ArrowDownLeft className="h-3.5 w-3.5" /> Ingresos
                  </div>
                  <p className="text-white font-semibold text-sm">+$45,200</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <div className="flex items-center gap-1 text-violet-300 text-xs mb-0.5">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Gastos
                  </div>
                  <p className="text-white font-semibold text-sm">-$12,380</p>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <div className="flex items-center gap-1 text-violet-300 text-xs mb-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Cuenta
                  </div>
                  <p className="text-white font-semibold text-sm">Verificada</p>
                </div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex gap-3 shrink-0">
              <Button
                onClick={() => router.push('/dashboard/send')}
                className="font-semibold rounded-xl shadow-lg border-0 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#7c3aed', boxShadow: '0 8px 25px rgba(0,0,0,0.2)' }}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar dinero
              </Button>
              <Button
                onClick={() => router.push('/dashboard/receive')}
                className="font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 border-0"
                style={{ background: 'rgba(255,255,255,0.12)', color: 'white', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                variant="ghost"
              >
                <Download className="mr-2 h-4 w-4" />
                Recargar
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── QUICK ACTIONS ────────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-4 gap-3">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.href}
            onClick={() => router.push(action.href)}
            className="quick-action"
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <div className={`quick-action-icon ${action.bg}`}>
              <action.icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <span className="text-xs font-semibold text-slate-600 group-hover:text-violet-600 transition-colors">
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── STAT CARDS ───────────────────────────────────────── */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-violet-100 p-5 cursor-default"
            style={{ boxShadow: '0 2px 12px rgba(124,58,237,0.06)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1.5">{stat.value}</p>
                <span className={`mt-2 inline-block ${stat.up ? 'stat-up' : 'stat-down'}`}>
                  {stat.change}
                </span>
              </div>
              <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── TRANSACTIONS + SEND FORM ─────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TransactionsList limit={7} />
        </div>
        <div>
          <SendMoneyForm onSuccess={() => router.refresh()} />
        </div>
      </motion.div>

      <Toaster />
    </motion.div>
  );
}
