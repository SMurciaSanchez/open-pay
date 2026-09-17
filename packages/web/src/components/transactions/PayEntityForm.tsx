'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import {
  CATEGORY_LABELS,
  EntityCategory,
  EntityReceiver,
  listEntities,
  payToEntity,
} from '@/lib/api/entities';
import { formatCurrency } from '@/lib/utils';

interface PayEntityFormProps {
  onSuccess?: (transactionId: string) => void;
}

type CategoryFilter = 'ALL' | EntityCategory;

const CATEGORY_ORDER: CategoryFilter[] = [
  'ALL', 'TAX', 'SOCIAL', 'DONATION', 'UTILITIES', 'TELECOM', 'OTHER',
];

export function PayEntityForm({ onSuccess }: PayEntityFormProps) {
  const { toast } = useToast();
  const [loadingList, setLoadingList] = useState(true);
  const [entities, setEntities] = useState<EntityReceiver[]>([]);
  const [selected, setSelected] = useState<EntityReceiver | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [search, setSearch] = useState('');

  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; description?: string; entity?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittedEntity = useRef<EntityReceiver | null>(null);
  const submittedAmount = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        setLoadingList(true);
        const list = await listEntities();
        setEntities(list);
      } catch (e: any) {
        toast({
          title: 'Error',
          description: e.message || 'No se pudieron cargar las entidades',
          variant: 'destructive',
        });
      } finally {
        setLoadingList(false);
      }
    })();
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entities.filter(e => {
      const matchCat = category === 'ALL' || e.category === category;
      const matchSearch = !q
        || e.name.toLowerCase().includes(q)
        || e.entityCode.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [entities, category, search]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!selected) newErrors.entity = 'Selecciona una entidad';
    if (amount <= 0) newErrors.amount = 'Ingresa un monto mayor a 0';
    if (!description.trim()) newErrors.description = 'Agrega un concepto';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || submitted) return;
    if (!validate() || !selected) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { data: senderProfile, error: senderErr } = await supabase
        .from('Profile')
        .select('id')
        .eq('userId', user.id)
        .single();
      if (senderErr || !senderProfile) throw new Error('Perfil no encontrado');

      const result = await payToEntity({
        senderId: senderProfile.id,
        entityCode: selected.entityCode,
        amount,
        description: description.trim(),
      });

      submittedEntity.current = selected;
      submittedAmount.current = amount;
      setSubmitted(true);

      toast({
        title: '¡Pago enviado!',
        description: `Pagaste ${formatCurrency(amount)} a ${selected.name}`,
      });

      if (onSuccess) onSuccess(result.id);
    } catch (error: any) {
      toast({
        title: 'Error en el pago',
        description: error.message || 'No se pudo procesar el pago.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted && submittedEntity.current) {
    return (
      <div className="rounded-2xl bg-white border border-indigo-100 p-8 flex flex-col items-center justify-center gap-4 text-center"
        style={{ boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}
      >
        <div className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 20px rgba(79,70,229,0.3)' }}
        >
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-lg text-slate-900">¡Pago enviado!</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {formatCurrency(submittedAmount.current)} → {submittedEntity.current.name}
          </p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setSelected(null);
            setAmount(0);
            setDescription('');
          }}
          className="mt-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Nuevo pago →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-indigo-100 overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(79,70,229,0.08)' }}
    >
      <div className="px-6 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(79,70,229,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 12px rgba(79,70,229,0.35)' }}
          >
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-none">Pagar a una entidad</h3>
            <p className="text-xs text-slate-400 mt-0.5">Impuestos, servicios, donaciones y más</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_ORDER.map(cat => {
            const active = category === cat;
            const label = cat === 'ALL' ? 'Todas' : CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm border border-indigo-200 bg-indigo-50/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        {/* Entity list */}
        <div className="max-h-72 overflow-y-auto rounded-xl border border-indigo-100">
          {loadingList ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No hay entidades que coincidan con tu búsqueda
            </div>
          ) : (
            <ul className="divide-y divide-indigo-50">
              {filtered.map(entity => {
                const active = selected?.id === entity.id;
                return (
                  <li key={entity.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(entity);
                        setErrors(prev => ({ ...prev, entity: undefined }));
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        active ? 'bg-indigo-50' : 'hover:bg-indigo-50/50'
                      }`}
                    >
                      {entity.logoUrl ? (
                        <img src={entity.logoUrl} alt={entity.name} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-indigo-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-800 truncate">{entity.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {CATEGORY_LABELS[entity.category]} · {entity.entityCode}
                        </p>
                      </div>
                      {active && (
                        <span className="shrink-0 h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {errors.entity && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{errors.entity}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label htmlFor="pe-amount" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Monto a pagar
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400 font-semibold text-sm">$</span>
              <input
                id="pe-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount || ''}
                onChange={(e) => {
                  setAmount(parseFloat(e.target.value) || 0);
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
                }}
                disabled={isLoading}
                className={`w-full h-11 pl-8 pr-3 rounded-xl text-sm font-medium transition-all duration-200 outline-none
                  ${errors.amount
                    ? 'border border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                    : 'border border-indigo-200 bg-indigo-50/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                  }`}
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{errors.amount}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="pe-desc" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Concepto / referencia
            </label>
            <textarea
              id="pe-desc"
              rows={2}
              placeholder="Ej.: Predial 2026, factura agua #123…"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
              }}
              disabled={isLoading}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm resize-none transition-all duration-200 outline-none
                ${errors.description
                  ? 'border border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                  : 'border border-indigo-200 bg-indigo-50/40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
                }`}
            />
            {errors.description && <p className="text-xs text-red-500 flex items-center gap-1"><span>⚠</span>{errors.description}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 6px 20px rgba(79,70,229,0.4)',
            }}
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando…
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                Pagar {selected ? `a ${selected.name}` : 'entidad'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
