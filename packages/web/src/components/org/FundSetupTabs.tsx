'use client';

/**
 * Lo que arma el configurador en un fondo: rubros (con su presupuesto),
 * contratos y proveedores autorizados. Los tres son la base de las reglas que
 * prueba el circuito: la lista de proveedores es el conjunto autorizado, y el
 * presupuesto de cada rubro es el tope.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createBudget,
  createContract,
  createVendor,
  listBudgets,
  listContracts,
  listVendors,
  pesos,
  revokeVendor,
  type Budget,
  type Contract,
  type Vendor,
} from '@/lib/api/org';
import { ErrorNote, Loading, RoleNote } from './ui';

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

function useLista<T>(cargar: () => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recargar = useCallback(async () => {
    try {
      setItems(await cargar());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [cargar]);
  useEffect(() => {
    recargar();
  }, [recargar]);
  return { items, error, setError, recargar };
}

/** Envuelve un envío de formulario: error visible y botón ocupado. */
function useEnvio(setError: (e: string | null) => void) {
  const [ocupado, setOcupado] = useState(false);
  const enviar = async (f: () => Promise<void>) => {
    setError(null);
    setOcupado(true);
    try {
      await f();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };
  return { ocupado, enviar };
}

// ── Rubros ─────────────────────────────────────────────────────

export function BudgetsTab({ fundId, canEdit }: { fundId: string; canEdit: boolean }) {
  const cargar = useCallback(() => listBudgets(fundId), [fundId]);
  const { items, error, setError, recargar } = useLista<Budget>(cargar);
  const { ocupado, enviar } = useEnvio(setError);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Cada rubro tiene un presupuesto. Es el tope que se prueba: los pagos de un rubro en un mes no
        lo superan.
      </p>
      {items === null && !error && <Loading />}
      {items && items.length === 0 && <p className="text-sm text-slate-500">Sin rubros todavía.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y rounded-md border">
          {items.map((b) => (
            <li key={b.id} className="flex justify-between gap-3 px-4 py-3">
              <span className="font-medium text-slate-900">{b.category}</span>
              <span className="text-slate-700">{pesos(b.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(async () => {
              await createBudget(fundId, category.trim(), Number(amount));
              setCategory('');
              setAmount('');
              await recargar();
            });
          }}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="b-cat">Rubro</Label>
            <Input id="b-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="p. ej. Salud" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-amount">Presupuesto (pesos)</Label>
            <Input id="b-amount" type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <Button type="submit" disabled={ocupado}>Agregar rubro</Button>
        </form>
      ) : (
        <RoleNote>Los rubros los crea el configurador.</RoleNote>
      )}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

// ── Contratos ──────────────────────────────────────────────────

export function ContractsTab({ fundId, canEdit }: { fundId: string; canEdit: boolean }) {
  const cargarContratos = useCallback(() => listContracts(fundId), [fundId]);
  const cargarRubros = useCallback(() => listBudgets(fundId), [fundId]);
  const { items, error, setError, recargar } = useLista<Contract>(cargarContratos);
  const { items: rubros } = useLista<Budget>(cargarRubros);
  const { ocupado, enviar } = useEnvio(setError);
  const [budgetId, setBudgetId] = useState('');
  const [object, setObject] = useState('');
  const [value, setValue] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [secopUrl, setSecopUrl] = useState('');
  const [signedOn, setSignedOn] = useState('');

  const rubro = (id: string) => rubros?.find((b) => b.id === id)?.category ?? '—';

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Un contrato es privado salvo que ya sea público en SECOP II; en ese caso se enlaza.
      </p>
      {items === null && !error && <Loading />}
      {items && items.length === 0 && <p className="text-sm text-slate-500">Sin contratos todavía.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y rounded-md border">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{c.object}</p>
                <p className="text-sm text-slate-500">
                  {rubro(c.budgetId)}
                  {c.signedOn && ` · firmado ${c.signedOn}`}
                  {c.isPublic && c.secopUrl && (
                    <>
                      {' · '}
                      <a href={c.secopUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        SECOP II
                      </a>
                    </>
                  )}
                </p>
              </div>
              <span className="text-slate-700">{pesos(c.value)}</span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && rubros && rubros.length === 0 && (
        <RoleNote>Primero crea un rubro: todo contrato pertenece a uno.</RoleNote>
      )}
      {canEdit && rubros && rubros.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(async () => {
              await createContract({
                fundId,
                budgetId: budgetId || rubros[0].id,
                object: object.trim(),
                value: Number(value),
                isPublic,
                secopUrl: isPublic ? secopUrl.trim() : null,
                signedOn: signedOn || null,
              });
              setObject('');
              setValue('');
              setSecopUrl('');
              setIsPublic(false);
              await recargar();
            });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-object">Objeto del contrato</Label>
            <Input id="c-object" value={object} onChange={(e) => setObject(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-budget">Rubro</Label>
            <select id="c-budget" className={selectClass} value={budgetId || rubros[0].id} onChange={(e) => setBudgetId(e.target.value)}>
              {rubros.map((b) => (
                <option key={b.id} value={b.id}>{b.category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-value">Valor (pesos)</Label>
            <Input id="c-value" type="number" min={1} step={1} value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-signed">Firmado el (opcional)</Label>
            <Input id="c-signed" type="date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:self-end sm:pb-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Ya es público en SECOP II
          </label>
          {isPublic && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-secop">Enlace de SECOP II</Label>
              <Input id="c-secop" type="url" value={secopUrl} onChange={(e) => setSecopUrl(e.target.value)} required />
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={ocupado}>Agregar contrato</Button>
          </div>
        </form>
      )}
      {!canEdit && <RoleNote>Los contratos los registra el configurador.</RoleNote>}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

// ── Proveedores autorizados ────────────────────────────────────

export function VendorsTab({ fundId, canEdit }: { fundId: string; canEdit: boolean }) {
  const cargar = useCallback(() => listVendors(fundId), [fundId]);
  const { items, error, setError, recargar } = useLista<Vendor>(cargar);
  const { ocupado, enviar } = useEnvio(setError);
  const [legalName, setLegalName] = useState('');
  const [nit, setNit] = useState('');

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        La lista de proveedores autorizados es el conjunto que se ancla en la cadena. Un proveedor se
        retira, no se borra, y el cambio queda visible como una lista nueva.
      </p>
      {items === null && !error && <Loading />}
      {items && items.length === 0 && <p className="text-sm text-slate-500">Sin proveedores todavía.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y rounded-md border">
          {items.map((v) => (
            <li key={v.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${v.revokedAt ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{v.legalName}</p>
                <p className="text-sm text-slate-500">NIT {v.nit}</p>
              </div>
              {v.revokedAt ? (
                <span className="text-xs text-slate-500">Retirado</span>
              ) : (
                canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={ocupado}
                    onClick={() => enviar(async () => {
                      await revokeVendor(v.id);
                      await recargar();
                    })}
                  >
                    Retirar
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(async () => {
              await createVendor(fundId, legalName.trim(), nit.trim());
              setLegalName('');
              setNit('');
              await recargar();
            });
          }}
          className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="v-name">Razón social</Label>
            <Input id="v-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-nit">NIT</Label>
            <Input id="v-nit" value={nit} onChange={(e) => setNit(e.target.value)} required />
          </div>
          <Button type="submit" disabled={ocupado}>Autorizar</Button>
        </form>
      ) : (
        <RoleNote>Los proveedores los autoriza el configurador.</RoleNote>
      )}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
