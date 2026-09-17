'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

type LinkState = 'checking' | 'valid' | 'invalid'

export function ResetPasswordForm() {
  const router = useRouter()
  const [linkState, setLinkState] = useState<LinkState>('checking')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // El enlace del correo llega con los tokens en el fragmento de la URL.
  // El cliente de Supabase los canjea solo (detectSessionInUrl) y emite
  // PASSWORD_RECOVERY; si el enlace venció, llega error_description en su lugar.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const urlError = hash.get('error_description')
    if (urlError) {
      setLinkError(urlError)
      setLinkState('invalid')
      return
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setLinkState('valid')
      }
    })

    // Por si la sesión de recuperación ya quedó establecida antes de suscribirse.
    supabase.auth.getSession().then(({ data }) => {
      setLinkState(prev => (prev === 'valid' ? prev : data.session ? 'valid' : 'invalid'))
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1800)
  }

  if (linkState === 'checking') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-8 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Comprobando el enlace...
      </div>
    )
  }

  if (linkState === 'invalid') {
    return (
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold">El enlace no sirve</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {linkError
            ? `El correo respondió: ${linkError}`
            : 'Este enlace ya venció o ya se usó. Cada enlace dura una hora y sirve una sola vez.'}
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Pedir un enlace nuevo
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <h2 className="text-xl font-bold">Contraseña cambiada</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ya quedó lista. Te estamos llevando a tu panel.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Elige una contraseña nueva</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mínimo 8 caracteres. Al guardarla quedas con la sesión iniciada.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="Repite la contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar contraseña'
          )}
        </Button>
      </form>
    </div>
  )
}
