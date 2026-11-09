'use client';

/**
 * Lotes: lo que sale del fondo hacia la cadena.
 *
 * Dos cosas se anclan, y de ninguna sale un dato personal: la raíz de la lista
 * de proveedores autorizados y, por cada rubro y mes cerrado, la raíz de sus
 * pagos conciliados. Con esas dos raíces y el presupuesto del rubro se genera
 * la prueba que cualquiera verifica en /verificar.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  anchorVendors,
  batchedPaymentIds,
  closeBatch,
  hex32,
  listBatches,
  listVendorSets,
  type Batch,
  type VendorSet,
} from '@/lib/api/batch';
import { listBudgets, listPayments, listVendors, type Budget, type OrgRole, type Payment, type Vendor } from '@/lib/api/org';
import { EXPLORER } from '@/lib/zk/registry';
import { useEnvio } from './FundSetupTabs';
import { ErrorNote, Loading, RoleNote } from './ui';

interface Datos {
  listas: VendorSet[];
  lotes: Batch[];
  rubros: Budget[];
  proveedores: Vendor[];
  pagos: Payment[];
  enLote: Set<string>;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** '2026-11-01' → 'noviembre de 2026' */
const nombreMes = (inicio: string) => `${MESES[Number(inicio.slice(5, 7)) - 1]} de ${inicio.slice(0, 4)}`;

/** Primer día del mes siguiente: desde cuándo se puede cerrar el lote. */
function mesSiguiente(inicio: string): string {
  const [a, m] = inicio.split('-').map(Number);
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);
}

const corto = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

function Tx({ hash }: { hash: string | null }) {
  if (!hash) return null;
  if (!EXPLORER) return <span className="break-all">{hash}</span>;
  return (
    <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
      ver la transacción
    </a>
  );
}

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold text-slate-900">{children}</h3>
);

export function BatchesTab({ fundId, role }: { fundId: string; role: OrgRole }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ocupado, enviar } = useEnvio(setError);
  const esTesorero = role === 'TREASURER';

  const recargar = useCallback(async () => {
    try {
      const [listas, lotes, rubros, proveedores, pagos] = await Promise.all([
        listVendorSets(fundId),
        listBatches(fundId),
        listBudgets(fundId),
        listVendors(fundId),
        listPayments(fundId),
      ]);
      const enLote = await batchedPaymentIds(pagos.map((p) => p.id));
      setDatos({ listas, lotes, rubros, proveedores, pagos, enLote });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [fundId]);
  useEffect(() => {
    recargar();
  }, [recargar]);

  if (!datos) {
    return (
      <div className="space-y-4">
        {!error && <Loading />}
        <ErrorNote>{error}</ErrorNote>
      </div>
    );
  }

  const accion = (f: () => Promise<unknown>) =>
    enviar(async () => {
      await f();
      await recargar();
    });

  // ── Lista de proveedores: ¿la vigente es la que está anclada? ──
  const vigentes = datos.proveedores.filter((v) => !v.revokedAt).map((v) => v.id).sort();
  const anclada = datos.listas.find((l) => l.status === 'ANCHORED');
  const alDia = !!anclada && anclada.vendorIds.slice().sort().join() === vigentes.join();

  // ── Meses con pagos conciliados que todavía no están en un lote ──
  const hoy = new Date().toISOString().slice(0, 10);
  const pendientes = new Map<string, { budgetId: string; inicio: string; n: number }>();
  for (const p of datos.pagos) {
    if (p.status !== 'RECONCILED' || !p.paidOn || datos.enLote.has(p.id)) continue;
    const inicio = p.paidOn.slice(0, 8) + '01';
    const clave = `${p.budgetId}|${inicio}`;
    const previo = pendientes.get(clave);
    pendientes.set(clave, { budgetId: p.budgetId, inicio, n: (previo?.n ?? 0) + 1 });
  }
  const porCerrar = [...pendientes.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const rubro = (id: string | null) => datos.rubros.find((b) => b.id === id)?.category ?? '—';

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        A la cadena solo suben huellas: la de la lista de proveedores autorizados y, por cada rubro
        y mes cerrado, la de sus pagos conciliados. Ningún nombre, monto ni fecha individual sale
        de la base. Lo anclado no se puede cambiar después.
      </p>

      <section className="space-y-3">
        <Titulo>Lista de proveedores autorizados</Titulo>
        {vigentes.length === 0 ? (
          <p className="text-sm text-slate-500">El fondo todavía no tiene proveedores autorizados.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3">
            <div className="min-w-0 text-sm">
              {alDia && anclada ? (
                <>
                  <p className="font-medium text-slate-900">
                    La lista vigente ({vigentes.length}) está anclada desde el {anclada.anchoredAt?.slice(0, 10)}
                  </p>
                  <p className="text-slate-500">
                    Huella {corto(hex32(anclada.root))} · <Tx hash={anclada.txHash} />
                  </p>
                </>
              ) : anclada ? (
                <p className="font-medium text-amber-800">
                  La lista cambió desde el último anclaje ({anclada.anchoredAt?.slice(0, 10)}). Hay que
                  anclar la nueva antes de cerrar un lote.
                </p>
              ) : (
                <p className="font-medium text-slate-900">
                  La lista vigente ({vigentes.length}) todavía no está anclada.
                </p>
              )}
            </div>
            {esTesorero && !alDia && (
              <Button size="sm" disabled={ocupado} onClick={() => accion(() => anchorVendors(fundId))}>
                {ocupado ? 'Anclando…' : 'Anclar lista'}
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <Titulo>Meses por cerrar</Titulo>
        {porCerrar.length === 0 && (
          <p className="text-sm text-slate-500">No hay pagos conciliados esperando lote.</p>
        )}
        {porCerrar.length > 0 && (
          <ul className="divide-y rounded-md border">
            {porCerrar.map((m) => {
              const desde = mesSiguiente(m.inicio);
              const cerrado = hoy >= desde;
              return (
                <li key={`${m.budgetId}|${m.inicio}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {rubro(m.budgetId)} · {nombreMes(m.inicio)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {m.n} {m.n === 1 ? 'pago conciliado' : 'pagos conciliados'}
                      {!cerrado && ` · el mes sigue abierto: el lote se puede cerrar desde el ${desde}`}
                    </p>
                  </div>
                  {esTesorero && cerrado && (
                    <Button size="sm" disabled={ocupado} onClick={() => accion(() => closeBatch(m.budgetId, m.inicio))}>
                      {ocupado ? 'Anclando…' : 'Cerrar y anclar lote'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <RoleNote>
          Un lote lleva todos los pagos conciliados del rubro en el mes, sin excepción, y solo se
          cierra cuando el mes terminó.
        </RoleNote>
      </section>

      <section className="space-y-3">
        <Titulo>Lotes</Titulo>
        {datos.lotes.length === 0 && <p className="text-sm text-slate-500">Sin lotes todavía.</p>}
        {datos.lotes.length > 0 && (
          <ul className="divide-y rounded-md border">
            {datos.lotes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {rubro(l.budgetId)} · {nombreMes(l.periodStart)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Huella {corto(hex32(l.root))}
                    {l.txHash && <> · <Tx hash={l.txHash} /></>}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={l.status === 'ANCHORED'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 text-amber-800'}
                  >
                    {l.status === 'ANCHORED' ? 'Anclado' : 'Sin anclar'}
                  </Badge>
                  {l.proved ? (
                    <Link href={`/verificar?lote=${l.id}`} className="text-sm text-blue-600 underline">
                      Ver la prueba
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-500">Prueba pendiente</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!esTesorero && <RoleNote>Anclar la lista y cerrar lotes lo hace el tesorero.</RoleNote>}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}
