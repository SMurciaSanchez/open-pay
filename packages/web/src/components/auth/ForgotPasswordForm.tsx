'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, MailCheck } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    // No se distingue entre "existe" y "no existe": decirlo permitiría averiguar
    // quién tiene cuenta en OpenPay probando correos (ver docs/MODELO_AMENAZA.md).
    // Solo se muestran errores que no revelan nada, como el límite de envíos.
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <MailCheck className="h-6 w-6 text-emerald-600" />
          <h2 className="text-xl font-bold">Revisa tu correo</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Si <span className="font-medium text-foreground">{email}</span> tiene una cuenta en
          OpenPay, le acabamos de enviar un enlace para elegir una contraseña nueva. El enlace
          vence en una hora y sirve una sola vez.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          ¿No llegó? Mira en spam antes de volver a pedirlo.
        </p>
        <Link
          href="/login"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold transition-colors hover:bg-accent"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Restablecer contraseña</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Te enviamos un enlace al correo con el que te registraste.
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
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            className="h-11"
          />
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar enlace'
          )}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold transition-colors hover:bg-accent"
      >
        Volver a iniciar sesión
      </Link>
    </div>
  )
}
