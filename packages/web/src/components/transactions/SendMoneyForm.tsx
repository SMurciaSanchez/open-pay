'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

interface SendMoneyFormProps {
  onSuccess?: (transactionId: string) => void;
}

interface FormData {
  amount: number;
  recipient: string;
  concept: string;
}

function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function SendMoneyForm({ onSuccess }: SendMoneyFormProps) {
  const { toast } = useToast();

  // La clave se genera una vez por sesión del formulario, no en cada submit
  const idempotencyKey = useRef(generateIdempotencyKey());

  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false); // Bloqueo permanente tras éxito
  const [formData, setFormData] = useState<FormData>({ amount: 0, recipient: '', concept: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? (parseFloat(value) || 0) : value,
    }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (formData.amount <= 0) newErrors.amount = 'Cantidad obligatoria — ingresa un monto mayor a 0';
    if (!formData.recipient.trim()) newErrors.recipient = 'Destinatario obligatorio';
    else if (!formData.recipient.includes('@')) newErrors.recipient = 'Correo electrónico inválido';
    if (!formData.concept.trim()) newErrors.concept = 'Concepto obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Doble protección: si ya está cargando o ya fue enviado, ignorar
    if (isLoading || submitted) return;
    if (!validate()) return;

    // Bloquear inmediatamente antes del request
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Resolver email → Profile.id (UUID inmutable) para ambos lados.
      // Las transferencias deben operar sobre UUIDs, nunca sobre emails
      // que pueden cambiar o tener errores tipográficos.
      const { data: senderProfile, error: senderErr } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', user.id)
        .single();
      if (senderErr || !senderProfile) throw new Error('Perfil de remitente no encontrado');

      const { data: receiverProfile, error: receiverErr } = await supabase
        .from('Profile')
        .select('id')
        .eq('email', formData.recipient)
        .single();
      if (receiverErr || !receiverProfile) throw new Error('Usuario destinatario no encontrado');

      const { data, error } = await supabase.rpc('transfer_funds', {
        p_sender_id:       senderProfile.id,
        p_receiver_id:     receiverProfile.id,
        p_amount:          formData.amount,
        p_description:     formData.concept,
        p_idempotency_key: idempotencyKey.current,
      });

      if (error) throw new Error(error.message);

      // Marcar como enviado (bloqueo permanente del formulario)
      setSubmitted(true);

      toast({
        title: '¡Transferencia exitosa!',
        description: `Enviaste ${formatCurrency(formData.amount)} a ${formData.recipient}`,
      });

      if (onSuccess) onSuccess(data.id);

    } catch (error: any) {
      toast({
        title: 'Error en la transferencia',
        description: error.message || 'No se pudo completar la transferencia.',
        variant: 'destructive',
      });
      // Regenerar la clave solo si falló (para poder reintentar con clave fresca)
      idempotencyKey.current = generateIdempotencyKey();
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white border border-violet-100 p-8 flex flex-col items-center justify-center gap-4 text-center"
        style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.08)' }}
      >
        <div className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', boxShadow: '0 8px 20px rgba(5,150,105,0.3)' }}
        >
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-lg text-slate-900">¡Transferencia enviada!</p>
          <p className="text-sm text-slate-500 mt-0.5">{formatCurrency(formData.amount)} → {formData.recipient}</p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ amount: 0, recipient: '', concept: '' });
            idempotencyKey.current = generateIdempotencyKey();
          }}
          className="mt-1 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          Nueva transferencia →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-violet-100 overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.08)' }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-none">Enviar dinero</h3>
            <p className="text-xs text-slate-400 mt-0.5">Transferencia instantánea y segura</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Amount */}
        <div className="space-y-1.5">
          <label htmlFor="amount" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Monto a enviar
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 font-semibold text-sm">$</span>
            <input
              id="amount" name="amount" type="number" min="0.01" step="0.01"
              placeholder="0.00" value={formData.amount || ''}
              onChange={handleChange} disabled={isLoading}
              className={`w-full h-11 pl-8 pr-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none
                ${errors.amount
                  ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                  : 'border border-violet-200 bg-violet-50/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                }`}
            />
          </div>
          {errors.amount && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{errors.amount}</p>}
        </div>

        {/* Recipient */}
        <div className="space-y-1.5">
          <label htmlFor="recipient" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Correo del destinatario
          </label>
          <input
            id="recipient" name="recipient" type="email"
            placeholder="usuario@ejemplo.com" value={formData.recipient}
            onChange={handleChange} disabled={isLoading}
            className={`w-full h-11 px-3.5 rounded-xl text-sm transition-all duration-200 outline-none
              ${errors.recipient
                ? 'border border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                : 'border border-violet-200 bg-violet-50/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
              }`}
          />
          {errors.recipient && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{errors.recipient}</p>}
        </div>

        {/* Concept */}
        <div className="space-y-1.5">
          <label htmlFor="concept" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Concepto
          </label>
          <textarea
            id="concept" name="concept" rows={2}
            placeholder="Motivo de la transferencia"
            value={formData.concept} onChange={handleChange}
            disabled={isLoading}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm resize-none transition-all duration-200 outline-none
              ${errors.concept
                ? 'border border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                : 'border border-violet-200 bg-violet-50/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
              }`}
          />
          {errors.concept && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{errors.concept}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.4)',
          }}
        >
          {isLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Procesando...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Enviar dinero
            </>
          )}
        </button>
      </form>
    </div>
  );
}
