'use client';

/**
 * Pagos de un fondo. El tesorero los registra como borrador y el aprobador los
 * aprueba o rechaza: son dos personas distintas y la base lo hace cumplir
 * (`decide_payment`). Aquí solo se muestra a cada rol lo que le toca.
 */
import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createPayment,
  decidePayment,
  listBudgets,
  listContracts,
  listPayments,
  listVendors,
  PAYMENT_STATUS_LABEL,
  pesos,
  type Budget,
  type Contract,
  type OrgRole,
  type Payment,
  type PaymentStatus,
  type Vendor,
} from '@/lib/api/org';
import { selectClass, useEnvio, useLista } from './FundSetupTabs';
import { ErrorNote, Loading, RoleNote } from './ui';

const STATUS_CLASS: Record<PaymentStatus, string> = {
  DRAFT: 'border-amber-300 bg-amber-50 text-amber-800',
  APPROVED: 'border-blue-300 bg-blue-50 text-blue-800',
  REJECTED: 'border-slate-300 bg-slate-50 text-slate-600',
  RECONCILED: 'border-emerald-300 bg-emerald-50 text-emerald-800',
};

/** Lo que ya cuenta contra el presupuesto: aprobado o conciliado. */
const cuenta = (p: Payment) => p.status === 'APPROVED' || p.status === 'RECONCILED';

export function PaymentsTab({ fundId, role }: { fundId: string; role: OrgRole }) {
  const cargarPagos = useCallback(() => listPayments(fundId), [fundId]);
  const cargarRubros = useCallback(() => listBudgets(fundId), [fundId]);
  const cargarProveedores = useCallback(() => listVendors(fundId), [fundId]);
  const cargarContratos = useCallback(() => listContracts(fundId), [fundId]);

  const { items: pagos, error, setError, recargar } = useLista<Payment>(cargarPagos);
  const { items: rubros } = useLista<Budget>(cargarRubros);
  const { items: proveedores } = useLista<Vendor>(cargarProveedores);
  const { items: contratos } = useLista<Contract>(cargarContratos);
  const { ocupado, enviar } = useEnvio(setError);

  const [budgetId, setBudgetId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [contractId, setContractId] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');

  const esTesorero = role === 'TREASURER';
  const esAprobador = role === 'APPROVER';

  const vigentes = proveedores?.filter((v) => !v.revokedAt) ?? [];
  const rubroElegido = budgetId || rubros?.[0]?.id || '';
  const proveedorElegido = vendorId || vigentes[0]?.id || '';
  const contratosDelRubro = contratos?.filter((c) => c.budgetId === rubroElegido) ?? [];

  const nombreRubro = (id: string) => rubros?.find((b) => b.id === id)?.category ?? '—';
  const nombreProveedor = (id: string) => proveedores?.find((v) => v.id === id)?.legalName ?? '—';
  const objetoContrato = (id: string | null) => contratos?.find((c) => c.id === id)?.object;

  const comprometido = (rubroId: string) =>
    (pagos ?? []).filter((p) => p.budgetId === rubroId && cuenta(p)).reduce((s, p) => s + Number(p.amount), 0);

  const listo = pagos && rubros && proveedores && contratos;
  const faltaConfigurar = listo && (rubros.length === 0 || vigentes.length === 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        El tesorero registra el pago y el aprobador lo decide: nunca la misma persona. Un pago
        aprobado cuenta contra el presupuesto de su rubro; la fecha de pago la pone el extracto del
        banco al conciliar.
      </p>

      {!listo && !error && <Loading />}

      {listo && rubros.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {rubros.map((b) => {
            const usado = comprometido(b.id);
            return (
              <li key={b.id} className="rounded-md border px-4 py-3 text-sm">
                <p className="font-medium text-slate-900">{b.category}</p>
                <p className="text-slate-600">
                  {pesos(usado)} aprobados de {pesos(b.amount)} · quedan {pesos(Number(b.amount) - usado)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {listo && pagos.length === 0 && <p className="text-sm text-slate-500">Sin pagos todavía.</p>}

      {listo && pagos.length > 0 && (
        <ul className="divide-y rounded-md border">
          {pagos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{p.concept}</p>
                <p className="text-sm text-slate-500">
                  {nombreProveedor(p.vendorId)} · {nombreRubro(p.budgetId)}
                  {objetoContrato(p.contractId) && ` · ${objetoContrato(p.contractId)}`}
                </p>
                <p className="text-xs text-slate-400">
                  Registrado el {p.createdAt.slice(0, 10)}
                  {p.decidedAt && ` · decidido el ${p.decidedAt.slice(0, 10)}`}
                  {p.paidOn && ` · pagado el ${p.paidOn}`}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <span className="text-slate-800">{pesos(p.amount)}</span>
                <Badge variant="outline" className={`whitespace-nowrap ${STATUS_CLASS[p.status]}`}>
                  {PAYMENT_STATUS_LABEL[p.status]}
                </Badge>
                {esAprobador && p.status === 'DRAFT' && (
                  <>
                    <Button
                      size="sm"
                      disabled={ocupado}
                      onClick={() => enviar(async () => {
                        await decidePayment(p.id, true);
                        await recargar();
                      })}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={ocupado}
                      onClick={() => enviar(async () => {
                        await decidePayment(p.id, false);
                        await recargar();
                      })}
                    >
                      Rechazar
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {esTesorero && faltaConfigurar && (
        <RoleNote>
          Para registrar un pago hacen falta al menos un rubro y un proveedor autorizado. Los crea el
          configurador.
        </RoleNote>
      )}

      {esTesorero && listo && !faltaConfigurar && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(async () => {
              await createPayment({
                fundId,
                budgetId: rubroElegido,
                vendorId: proveedorElegido,
                contractId: contractId || null,
                amount: Number(amount),
                concept: concept.trim(),
              });
              setAmount('');
              setConcept('');
              setContractId('');
              await recargar();
            });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-concept">Concepto</Label>
            <Input id="p-concept" value={concept} onChange={(e) => setConcept(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-budget">Rubro</Label>
            <select
              id="p-budget"
              className={selectClass}
              value={rubroElegido}
              onChange={(e) => {
                setBudgetId(e.target.value);
                setContractId('');
              }}
            >
              {rubros.map((b) => (
                <option key={b.id} value={b.id}>{b.category}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-vendor">Proveedor autorizado</Label>
            <select id="p-vendor" className={selectClass} value={proveedorElegido} onChange={(e) => setVendorId(e.target.value)}>
              {vigentes.map((v) => (
                <option key={v.id} value={v.id}>{v.legalName} · NIT {v.nit}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-contract">Contrato (opcional)</Label>
            <select id="p-contract" className={selectClass} value={contractId} onChange={(e) => setContractId(e.target.value)}>
              <option value="">Sin contrato</option>
              {contratosDelRubro.map((c) => (
                <option key={c.id} value={c.id}>{c.object}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-amount">Monto (pesos)</Label>
            <Input id="p-amount" type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={ocupado}>Registrar pago</Button>
          </div>
        </form>
      )}

      {!esTesorero && !esAprobador && (
        <RoleNote>Los pagos los registra el tesorero y los decide el aprobador.</RoleNote>
      )}
      {esAprobador && <RoleNote>Como aprobador decides los pagos; no los registras.</RoleNote>}
      {esTesorero && <RoleNote>Como tesorero registras los pagos; no los apruebas.</RoleNote>}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
