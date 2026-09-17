import { LoginForm } from '@/components/auth/LoginForm'
import { ShieldCheck, Zap, TrendingUp, Lock, Sparkles } from 'lucide-react'

const features = [
  { icon: ShieldCheck, text: 'Cifrado bancario de extremo a extremo' },
  { icon: Lock,        text: 'Autenticación en dos factores (2FA)' },
  { icon: TrendingUp,  text: 'Monitoreo de fraude en tiempo real' },
  { icon: Sparkles,    text: 'Transferencias instantáneas y seguras' },
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex gradient-mesh-violet relative overflow-hidden">

      {/* ── Animated orbs ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full opacity-30 animate-orb-1"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full opacity-20 animate-orb-2"
        style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[40%] left-[35%] h-[300px] w-[300px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
      />

      {/* ── LEFT PANEL — branding ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 animate-fade-in">
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 8px 25px rgba(124,58,237,0.5)' }}
          >
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">OpenPay</span>
        </div>

        {/* Hero copy */}
        <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-xs font-semibold">Disponible 24/7 · Regulado y seguro</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Tu dinero,<br />
              <span style={{
                background: 'linear-gradient(90deg, #c4b5fd, #a78bfa, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                sin límites.
              </span>
            </h1>
            <p className="text-indigo-300 mt-4 text-lg leading-relaxed max-w-md">
              La plataforma financiera moderna que te da control total sobre tus finanzas personales.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex items-center gap-3 animate-fade-in-up"
                style={{ animationDelay: `${0.2 + i * 0.08}s` }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  <Icon className="h-4 w-4 text-violet-300" />
                </div>
                <span className="text-indigo-200 text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Mock balance card */}
          <div
            className="glass rounded-2xl p-5 max-w-xs animate-float"
            style={{ animationDelay: '0.5s' }}
          >
            <p className="text-indigo-300 text-xs font-medium mb-1">Saldo disponible</p>
            <p className="text-white text-3xl font-bold">$24,850.00</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-emerald-400 text-xs font-semibold">+18.5% este mes</span>
            </div>
            <div className="mt-3 flex gap-2">
              {['**** 3420', '**** 7891'].map(card => (
                <span
                  key={card}
                  className="glass rounded-lg px-2.5 py-1 text-[11px] text-indigo-300 font-mono"
                >
                  {card}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-indigo-500 text-xs animate-fade-in" style={{ animationDelay: '0.6s' }}>
          © 2025 OpenPay · Todos los derechos reservados
        </p>
      </div>

      {/* ── RIGHT PANEL — form ────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 py-12 relative z-10">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10 animate-fade-in">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
          >
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold">OpenPay</span>
        </div>

        <div className="w-full max-w-[420px] animate-scale-in" style={{ animationDelay: '0.15s' }}>
          <LoginForm />
        </div>
      </div>

    </div>
  )
}
