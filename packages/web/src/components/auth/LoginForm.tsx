'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div
      className="rounded-3xl p-8"
      style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
        <p className="text-indigo-300 text-sm mt-1">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fca5a5' }}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-indigo-200">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl text-white placeholder:text-indigo-400"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(139,92,246,0.3)',
              color: 'white',
            }}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-indigo-200">
              Contraseña
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl pr-10 text-white placeholder:text-indigo-400"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(139,92,246,0.3)',
                color: 'white',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all duration-200 border-0"
          style={{
            background: loading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            boxShadow: loading ? 'none' : '0 8px 25px rgba(124,58,237,0.5)',
          }}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
        <span className="text-xs text-indigo-400 font-medium">¿Nuevo en OpenPay?</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
      </div>

      {/* Register link */}
      <Link
        href="/register"
        className="flex items-center justify-center w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 text-violet-300 hover:text-white"
        style={{ border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.1)' }}
      >
        Crear cuenta gratuita
      </Link>
    </div>
  )
}
