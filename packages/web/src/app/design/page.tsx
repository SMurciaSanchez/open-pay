'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Send, Download, CreditCard, Users, Clock, Shield,
  Settings, HelpCircle, Bell, Wallet, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, ShieldCheck, Eye, EyeOff,
  Check, Copy, Loader2, AlertCircle, Star, Heart,
} from 'lucide-react';

// ── Datos del design system ──────────────────────────────────────

const violetPalette = [
  { name: 'violet-50',  hex: '#f5f3ff', text: 'text-gray-800' },
  { name: 'violet-100', hex: '#ede9fe', text: 'text-gray-800' },
  { name: 'violet-200', hex: '#ddd6fe', text: 'text-gray-800' },
  { name: 'violet-300', hex: '#c4b5fd', text: 'text-gray-800' },
  { name: 'violet-400', hex: '#a78bfa', text: 'text-white' },
  { name: 'violet-500', hex: '#8b5cf6', text: 'text-white' },
  { name: 'violet-600', hex: '#7c3aed', text: 'text-white' },
  { name: 'violet-700', hex: '#6d28d9', text: 'text-white' },
  { name: 'violet-800', hex: '#5b21b6', text: 'text-white' },
  { name: 'violet-900', hex: '#4c1d95', text: 'text-white' },
  { name: 'violet-950', hex: '#2e1065', text: 'text-white' },
];

const semanticColors = [
  { name: 'Éxito',       hex: '#10b981', label: 'emerald-500', text: 'text-white', use: 'Ingresos, confirmaciones' },
  { name: 'Error',       hex: '#f43f5e', label: 'rose-500',    text: 'text-white', use: 'Gastos, errores' },
  { name: 'Advertencia', hex: '#f59e0b', label: 'amber-500',   text: 'text-white', use: 'Alertas, pendientes' },
  { name: 'Info',        hex: '#0ea5e9', label: 'sky-500',     text: 'text-white', use: 'Información, servicios' },
];

const gradients = [
  {
    name: 'gradient-violet',
    css: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)',
    use: 'Balance card, botones CTA',
  },
  {
    name: 'gradient-violet-soft',
    css: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6366f1 100%)',
    use: 'Versión suave del primario',
  },
  {
    name: 'gradient-sidebar',
    css: 'linear-gradient(180deg, #1e1b4b 0%, #160f3a 55%, #0c0a24 100%)',
    use: 'Sidebar de navegación',
  },
  {
    name: 'gradient-green',
    css: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
    use: 'Éxito, ingresos',
  },
  {
    name: 'Texto con gradiente',
    css: 'linear-gradient(90deg, #c4b5fd, #a78bfa, #818cf8)',
    use: 'Logo hero, headings especiales',
    isText: true,
  },
];

const animations = [
  { name: 'fade-in-up',    class: 'animate-fade-in-up',    desc: 'Entrada desde abajo' },
  { name: 'fade-in',       class: 'animate-fade-in',       desc: 'Fade simple' },
  { name: 'scale-in',      class: 'animate-scale-in',      desc: 'Zoom desde 92%' },
  { name: 'float',         class: 'animate-float',         desc: 'Flotación suave (4s)' },
  { name: 'glow-pulse',    class: 'animate-glow-pulse',    desc: 'Glow pulsante (3s)' },
  { name: 'shimmer',       class: 'animate-shimmer shimmer-bg', desc: 'Skeleton loading' },
  { name: 'spin-slow',     class: 'animate-spin-slow',     desc: 'Rotación lenta (12s)' },
];

const icons = [
  Zap, Send, Download, CreditCard, Users, Clock, Shield,
  Settings, HelpCircle, Bell, Wallet, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, ShieldCheck, Eye, EyeOff,
  Check, AlertCircle, Star, Heart,
];

const typeScale = [
  { class: 'text-xs',   size: '12px', sample: 'Labels, fechas, metadatos' },
  { class: 'text-sm',   size: '14px', sample: 'Texto de interfaz, inputs' },
  { class: 'text-base', size: '16px', sample: 'Cuerpo de texto general' },
  { class: 'text-lg',   size: '18px', sample: 'Subtítulos de sección' },
  { class: 'text-xl',   size: '20px', sample: 'Títulos de card' },
  { class: 'text-2xl',  size: '24px', sample: 'Títulos de página' },
  { class: 'text-3xl',  size: '30px', sample: 'Balances secundarios' },
  { class: 'text-4xl',  size: '36px', sample: 'Balance principal' },
];

// ── Componente swatch de color ───────────────────────────────────
function ColorSwatch({ name, hex, text }: { name: string; hex: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={copy}
      className="group rounded-xl overflow-hidden text-left w-full"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
    >
      <div className="h-14" style={{ background: hex }} />
      <div className="bg-white px-2.5 py-2 border border-t-0 border-gray-100 rounded-b-xl">
        <p className="text-[11px] font-semibold text-gray-700">{name}</p>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 font-mono">{hex}</p>
          {copied
            ? <Check className="h-3 w-3 text-emerald-500" />
            : <Copy className="h-3 w-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
          }
        </div>
      </div>
    </motion.button>
  );
}

// ── Sección con título ───────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #8b5cf6, #6d28d9)' }} />
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ── Página principal ─────────────────────────────────────────────
export default function DesignPage() {
  const [replayKey, setReplayKey] = useState(0);

  const navItems = [
    'Colores', 'Gradientes', 'Glassmorphism', 'Tipografía',
    'Animaciones', 'Botones', 'Cards', 'Badges', 'Iconos',
  ];

  return (
    <div className="min-h-screen bg-violet-50/50">
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(139,92,246,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
          >
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 leading-none text-sm">OpenPay</p>
            <p className="text-[10px] text-violet-500 font-medium">Design System</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
          {navItems.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors whitespace-nowrap"
            >
              {item}
            </a>
          ))}
        </nav>
        <a
          href="/dashboard"
          className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          ← Volver al app
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold"
          >
            <span style={{
              background: 'linear-gradient(90deg, #7c3aed, #6d28d9, #4f46e5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              OpenPay Design System
            </span>
          </motion.h1>
          <p className="text-slate-500 text-lg">
            Violet Premium · Next.js 15 · Tailwind CSS · Framer Motion
          </p>
        </div>

        {/* ── COLORES ───────────────────────────────────────────── */}
        <Section id="colores" title="Paleta de colores">
          <div>
            <p className="text-sm text-slate-500 mb-4">
              <strong className="text-violet-600">Color primario: Violet</strong> — Haz clic en cualquier swatch para copiar el hex.
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
              {violetPalette.map(c => (
                <ColorSwatch key={c.name} {...c} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Colores semánticos</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {semanticColors.map(c => (
                <div key={c.name} className="rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <div className="h-16 flex items-center justify-center" style={{ background: c.hex }}>
                    <span className="text-white font-bold text-sm">{c.name}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-t-0 border-gray-100 rounded-b-xl">
                    <p className="text-[11px] font-mono text-gray-500">{c.hex}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── GRADIENTES ────────────────────────────────────────── */}
        <Section id="gradientes" title="Gradientes">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gradients.map(g => (
              <div key={g.name} className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                {g.isText ? (
                  <div className="h-20 flex items-center justify-center bg-gray-900">
                    <span
                      className="text-3xl font-bold"
                      style={{
                        background: g.css,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      OpenPay
                    </span>
                  </div>
                ) : (
                  <div className="h-20" style={{ background: g.css }} />
                )}
                <div className="bg-white p-3 border border-t-0 border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">.{g.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{g.use}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── GLASSMORPHISM ─────────────────────────────────────── */}
        <Section id="glassmorphism" title="Glassmorphism & Glow">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* .glass */}
            <div className="relative rounded-2xl p-5 overflow-hidden" style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              minHeight: 140,
            }}>
              <div className="glass rounded-xl p-4 relative z-10">
                <p className="text-white font-semibold text-sm">.glass</p>
                <p className="text-indigo-200 text-xs mt-1">Sobre fondos oscuros · backdrop-blur(20px)</p>
                <p className="text-white text-xs font-mono mt-2">bg: rgba(255,255,255,0.08)</p>
              </div>
            </div>

            {/* .glass-light */}
            <div className="relative rounded-2xl p-5 overflow-hidden bg-violet-100">
              <div className="glass-light rounded-xl p-4 relative z-10">
                <p className="text-slate-800 font-semibold text-sm">.glass-light</p>
                <p className="text-slate-500 text-xs mt-1">Header, panels claros · backdrop-blur(16px)</p>
                <p className="text-slate-600 text-xs font-mono mt-2">bg: rgba(255,255,255,0.7)</p>
              </div>
            </div>

            {/* Glow effects */}
            <div className="bg-white rounded-2xl p-5 space-y-3">
              <p className="text-slate-700 font-semibold text-sm">Glow effects</p>
              <div
                className="rounded-xl p-3 text-center text-sm font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 0 30px rgba(124,58,237,0.45), 0 0 60px rgba(124,58,237,0.15)',
                }}
              >
                .glow-violet
              </div>
              <div
                className="rounded-xl p-3 text-center text-sm font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #059669, #0891b2)',
                  boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                }}
              >
                .glow-emerald
              </div>
            </div>
          </div>
        </Section>

        {/* ── TIPOGRAFÍA ────────────────────────────────────────── */}
        <Section id="tipografía" title="Tipografía">
          <div className="bg-white rounded-2xl border border-violet-100 overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(124,58,237,0.06)' }}>
            {typeScale.map((t, i) => (
              <div key={t.class} className={`flex items-baseline gap-4 px-5 py-3 ${i < typeScale.length - 1 ? 'border-b border-violet-50' : ''}`}>
                <span className="text-[11px] font-mono text-violet-400 w-20 shrink-0">{t.class}</span>
                <span className="text-[11px] text-slate-400 w-10 shrink-0">{t.size}</span>
                <span className={`${t.class} font-semibold text-slate-900 leading-tight`}>{t.sample}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Inter (sans)', cls: 'font-sans', sample: 'Texto de interfaz' },
              { label: 'Poppins', cls: 'font-poppins', sample: 'Títulos y headings' },
              { label: 'JetBrains Mono', cls: 'font-mono', sample: '**** 3456 · $12,520' },
            ].map(f => (
              <div key={f.label} className="bg-white rounded-2xl border border-violet-100 p-4">
                <p className="text-xs text-violet-500 font-medium mb-2">{f.label}</p>
                <p className={`${f.cls} text-lg text-slate-800 font-semibold`}>{f.sample}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── ANIMACIONES ───────────────────────────────────────── */}
        <Section id="animaciones" title="Animaciones">
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="text-xs rounded-xl border-violet-200 text-violet-600 hover:bg-violet-50"
              onClick={() => setReplayKey(k => k + 1)}
            >
              ↺ Repetir todas
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {animations.map(anim => (
              <div key={`${anim.name}-${replayKey}`} className="bg-white rounded-2xl border border-violet-100 p-4 flex flex-col items-center gap-3 overflow-hidden">
                <div
                  className={`h-10 w-10 rounded-xl ${anim.class} flex items-center justify-center`}
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
                >
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-700">{anim.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{anim.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Framer Motion */}
          <div className="bg-white rounded-2xl border border-violet-100 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Framer Motion — Stagger + Hover</p>
            <motion.div
              key={replayKey}
              className="grid grid-cols-4 gap-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
            >
              {['Enviar', 'Recargar', 'Servicios', 'Contactos'].map((label, i) => (
                <motion.div
                  key={label}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -4, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-violet-100 cursor-pointer"
                  style={{ boxShadow: '0 2px 8px rgba(124,58,237,0.06)' }}
                >
                  <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-violet-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>

        {/* ── BOTONES ───────────────────────────────────────────── */}
        <Section id="botones" title="Botones">
          <div className="bg-white rounded-2xl border border-violet-100 p-6 space-y-5">
            <div className="flex flex-wrap gap-3 items-center">
              <button className="btn-primary">Botón primario</button>
              <button className="btn-ghost">Botón ghost</button>
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructivo</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button disabled className="rounded-xl">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
              </Button>
              <Button
                className="rounded-xl text-white font-semibold border-0"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 8px 25px rgba(124,58,237,0.4)',
                }}
              >
                <Send className="mr-2 h-4 w-4" /> Enviar dinero
              </Button>
              <Button
                className="rounded-xl font-semibold border-0"
                style={{ background: 'rgba(255,255,255,0.95)', color: '#7c3aed', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              >
                <Download className="mr-2 h-4 w-4" /> Recargar
              </Button>
            </div>
          </div>
        </Section>

        {/* ── CARDS ─────────────────────────────────────────────── */}
        <Section id="cards" title="Cards y sombras">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: '.card-shadow',        cls: 'card-shadow' },
              { label: '.card-shadow-md',     cls: 'card-shadow-md' },
              { label: '.card-shadow-violet', cls: 'card-shadow-violet' },
            ].map(c => (
              <div key={c.label} className={`bg-white rounded-2xl p-5 border border-violet-100 ${c.cls}`}>
                <p className="text-xs font-mono text-violet-500">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">$12,520.35</p>
                <p className="text-xs text-slate-400 mt-1">Saldo disponible</p>
              </div>
            ))}
          </div>

          {/* Quick action cards */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">.quick-action</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Enviar',    icon: Send,       bg: 'bg-violet-100', color: 'text-violet-600' },
                { label: 'Recargar', icon: Download,   bg: 'bg-emerald-100', color: 'text-emerald-600' },
                { label: 'Servicios', icon: CreditCard, bg: 'bg-sky-100',     color: 'text-sky-600' },
                { label: 'Contactos', icon: Users,      bg: 'bg-amber-100',   color: 'text-amber-600' },
              ].map(a => (
                <motion.div
                  key={a.label}
                  whileHover={{ y: -3 }}
                  className="quick-action"
                >
                  <div className={`quick-action-icon ${a.bg}`}>
                    <a.icon className={`h-5 w-5 ${a.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{a.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Balance card */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3">Balance card (gradient-violet)</p>
            <div
              className="rounded-3xl p-6 text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4f46e5 100%)',
                boxShadow: '0 20px 60px rgba(124,58,237,0.4)',
              }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-violet-200" />
                <p className="text-sm text-violet-200">Saldo disponible</p>
              </div>
              <p className="text-4xl font-bold">$12,520.35</p>
              <p className="text-violet-300 text-sm mt-1 font-mono">MXN · **** 3456</p>
              <div className="flex gap-3 mt-5">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#7c3aed' }}
                >
                  <Send className="h-4 w-4" /> Enviar
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                >
                  <Download className="h-4 w-4" /> Recargar
                </button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BADGES ────────────────────────────────────────────── */}
        <Section id="badges" title="Badges y estados">
          <div className="bg-white rounded-2xl border border-violet-100 p-5 flex flex-wrap gap-3 items-center">
            <span className="stat-up">+12.5%</span>
            <span className="stat-down">-3.2%</span>
            <span className="stat-up">+4 esta semana</span>
            <Badge>Default</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">Verificada</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pendiente</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">Bloqueada</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En línea
            </span>
          </div>
        </Section>

        {/* ── ICONOS ────────────────────────────────────────────── */}
        <Section id="iconos" title="Iconografía (Lucide React)">
          <div className="bg-white rounded-2xl border border-violet-100 p-5">
            <div className="grid grid-cols-8 sm:grid-cols-11 gap-3">
              {icons.map((Icon, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.2, y: -2 }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-violet-50 cursor-pointer transition-colors"
                  title={Icon.displayName}
                >
                  <Icon className="h-5 w-5 text-violet-600" />
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Todos los íconos son de <strong>lucide-react</strong>. Tamaños típicos: <code className="bg-slate-100 px-1 rounded">h-4 w-4</code> (botones), <code className="bg-slate-100 px-1 rounded">h-5 w-5</code> (nav), <code className="bg-slate-100 px-1 rounded">h-6 w-6</code> (hero).
            </p>
          </div>
        </Section>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-violet-100">
          <p className="text-xs text-slate-400">
            OpenPay Design System · Violet Premium · 2025
          </p>
          <p className="text-xs text-violet-400 mt-1 font-mono">
            globals.css · tailwind.config.js · framer-motion ^12
          </p>
        </footer>

      </div>
    </div>
  );
}
