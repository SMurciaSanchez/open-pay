'use client';

/**
 * Banco y conciliación. La organización sigue pagando desde su banco: aquí el
 * tesorero registra la cuenta, importa el extracto, lo sella y empareja cada
 * pago aprobado con el movimiento que lo respalda.
 *
 * Límite que la pantalla dice: el extracto lo sube la propia organización.
 * Queda sellado y con la huella del archivo, pero OpenPay no lo recibe del banco.
 */
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createBankAccount,
  discardStatement,
  importStatement,
  leerExtracto,
  listBankAccounts,
  listMovements,
  listReconciliations,
  listStatements,
  reconcilePayment,
  sealStatement,
  unreconcilePayment,
  usedMovementIds,
  type BankAccount,
  type BankMovement,
  type BankStatement,
  type Reconciliation,
} from '@/lib/api/bank';
import { listPayments, listVendors, pesos, type OrgRole, type Payment, type Vendor } from '@/lib/api/org';
import { selectClass, useEnvio } from './FundSetupTabs';
import { ErrorNote, Loading, RoleNote } from './ui';

interface Datos {
  cuentas: BankAccount[];
  extractos: BankStatement[];
  movimientos: BankMovement[];
  usados: Set<string>;
  pagos: Payment[];
  proveedores: Vendor[];
  conciliaciones: Reconciliation[];
}

async function cargarTodo(fundId: string, orgId: string): Promise<Datos> {
  const [cuentas, extractos, pagos, proveedores] = await Promise.all([
    listBankAccounts(orgId),
    listStatements(orgId),
    listPayments(fundId),
    listVendors(fundId),
  ]);
  const movimientos = await listMovements(extractos.map((e) => e.id));
  const [usados, conciliaciones] = await Promise.all([
    usedMovementIds(movimientos.map((m) => m.id)),
    listReconciliations(pagos.map((p) => p.id)),
  ]);
  return { cuentas, extractos, movimientos, usados, pagos, proveedores, conciliaciones };
}

const Titulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-semibold text-slate-900">{children}</h3>
);

export function ReconciliationTab({ fundId, orgId, role }: { fundId: string; orgId: string; role: OrgRole }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ocupado, enviar } = useEnvio(setError);
  const esTesorero = role === 'TREASURER';

  const recargar = useCallback(async () => {
    try {
      setDatos(await cargarTodo(fundId, orgId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [fundId, orgId]);
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

  const accion = (f: () => Promise<void>) =>
    enviar(async () => {
      await f();
      await recargar();
    });

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Un pago aprobado solo cuenta como hecho cuando un movimiento del extracto lo respalda: mismo
        monto, salida de dinero y fecha igual o posterior a la aprobación. El extracto lo sube la
        organización; queda sellado y con la huella del archivo para que un auditor lo compare con
        el original del banco.
      </p>

      {esTesorero && <Cuentas datos={datos} orgId={orgId} ocupado={ocupado} accion={accion} />}
      <Extractos datos={datos} orgId={orgId} esTesorero={esTesorero} ocupado={ocupado} accion={accion} setError={setError} />
      <Conciliar datos={datos} esTesorero={esTesorero} ocupado={ocupado} accion={accion} />

      {!esTesorero && <RoleNote>El extracto lo importa y la conciliación la hace el tesorero.</RoleNote>}
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

type Accion = (f: () => Promise<void>) => Promise<void>;

// ── Cuentas ────────────────────────────────────────────────────

function Cuentas({ datos, orgId, ocupado, accion }: { datos: Datos; orgId: string; ocupado: boolean; accion: Accion }) {
  const [bankName, setBankName] = useState('');
  const [alias, setAlias] = useState('');
  const [number, setNumber] = useState('');

  return (
    <section className="space-y-3">
      <Titulo>Cuenta bancaria</Titulo>
      {datos.cuentas.length === 0 && (
        <p className="text-sm text-slate-500">Registra la cuenta desde la que paga la organización.</p>
      )}
      {datos.cuentas.length > 0 && (
        <ul className="divide-y rounded-md border">
          {datos.cuentas.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <p className="font-medium text-slate-900">{c.alias}</p>
              <p className="text-sm text-slate-500">{c.bankName} · termina en {c.last4}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          accion(async () => {
            await createBankAccount(orgId, bankName.trim(), alias.trim(), number);
            setBankName('');
            setAlias('');
            setNumber('');
          });
        }}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <Label htmlFor="ba-bank">Banco</Label>
          <Input id="ba-bank" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-alias">Nombre de la cuenta</Label>
          <Input id="ba-alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="p. ej. Ahorros fondo salud" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-number">Número</Label>
          <Input id="ba-number" inputMode="numeric" autoComplete="off" value={number} onChange={(e) => setNumber(e.target.value)} required />
        </div>
        <Button type="submit" disabled={ocupado}>Registrar cuenta</Button>
      </form>
      <RoleNote>El número se guarda cifrado; en pantalla solo se ven los últimos cuatro dígitos.</RoleNote>
    </section>
  );
}

// ── Extractos ──────────────────────────────────────────────────

function Extractos({
  datos, orgId, esTesorero, ocupado, accion, setError,
}: {
  datos: Datos; orgId: string; esTesorero: boolean; ocupado: boolean; accion: Accion;
  setError: (e: string | null) => void;
}) {
  const [bankAccountId, setBankAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [opening, setOpening] = useState('');
  const [closing, setClosing] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [resumen, setResumen] = useState<{ n: number; neto: number } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const cuentaElegida = bankAccountId || datos.cuentas[0]?.id || '';
  const cuenta = (id: string) => datos.cuentas.find((c) => c.id === id);
  const movsDe = (id: string) => datos.movimientos.filter((m) => m.statementId === id);

  const elegirArchivo = async (f: File | null) => {
    setFile(f);
    setResumen(null);
    setError(null);
    if (!f) return;
    try {
      const { movimientos, neto } = await leerExtracto(f);
      setResumen({ n: movimientos.length, neto });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const esperado = opening !== '' && closing !== '' ? Number(closing) - Number(opening) : null;
  const cuadra = resumen && esperado !== null ? Math.round((resumen.neto - esperado) * 100) === 0 : null;

  return (
    <section className="space-y-3">
      <Titulo>Extractos</Titulo>
      {datos.extractos.length === 0 && <p className="text-sm text-slate-500">Sin extractos todavía.</p>}
      {datos.extractos.length > 0 && (
        <ul className="divide-y rounded-md border">
          {datos.extractos.map((e) => {
            const movs = movsDe(e.id);
            const c = cuenta(e.bankAccountId);
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {e.periodStart} a {e.periodEnd}
                    {c && <span className="font-normal text-slate-500"> · {c.alias}</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {movs.length} movimientos · saldo {pesos(e.openingBalance)} → {pesos(e.closingBalance)}
                  </p>
                  <p className="text-xs text-slate-400 break-all">
                    Huella del archivo: {e.fileSha256.replace(/^\\x/, '')}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={e.status === 'SEALED'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-amber-300 bg-amber-50 text-amber-800'}
                  >
                    {e.status === 'SEALED' ? 'Sellado' : 'Borrador'}
                  </Badge>
                  {esTesorero && e.status === 'IMPORTING' && (
                    <>
                      <Button size="sm" disabled={ocupado} onClick={() => accion(() => sealStatement(e.id))}>
                        Sellar
                      </Button>
                      <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => accion(() => discardStatement(e.id))}>
                        Descartar
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {esTesorero && datos.cuentas.length === 0 && (
        <RoleNote>Para importar un extracto primero registra la cuenta bancaria.</RoleNote>
      )}

      {esTesorero && datos.cuentas.length > 0 && (
        <form
          key={formKey}
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            accion(async () => {
              await importStatement({
                organizationId: orgId,
                bankAccountId: cuentaElegida,
                periodStart,
                periodEnd,
                openingBalance: Number(opening),
                closingBalance: Number(closing),
                file,
              });
              setFile(null);
              setResumen(null);
              setOpening('');
              setClosing('');
              setPeriodStart('');
              setPeriodEnd('');
              setFormKey((k) => k + 1);
            });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="st-account">Cuenta</Label>
            <select id="st-account" className={selectClass} value={cuentaElegida} onChange={(e) => setBankAccountId(e.target.value)}>
              {datos.cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.alias} · {c.bankName} · {c.last4}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-start">Desde</Label>
            <Input id="st-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-end">Hasta</Label>
            <Input id="st-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-opening">Saldo inicial (pesos)</Label>
            <Input id="st-opening" type="number" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-closing">Saldo final (pesos)</Label>
            <Input id="st-closing" type="number" step="0.01" value={closing} onChange={(e) => setClosing(e.target.value)} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="st-file">Archivo CSV del extracto</Label>
            <Input id="st-file" type="file" accept=".csv,text/csv" onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)} required />
            <RoleNote>
              Columnas: fecha, referencia, descripcion, debito, credito (o una sola columna valor con
              signo). Separador coma o punto y coma.
            </RoleNote>
          </div>
          {resumen && (
            <p className={`text-sm sm:col-span-2 ${cuadra === false ? 'text-amber-700' : 'text-slate-600'}`}>
              El archivo trae {resumen.n} movimientos que suman {pesos(resumen.neto)} al saldo.
              {cuadra === true && ' Cuadra con los saldos.'}
              {cuadra === false && ` Los saldos exigen ${pesos(esperado ?? 0)}: así no se podrá sellar.`}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={ocupado || !file}>Importar como borrador</Button>
          </div>
        </form>
      )}
    </section>
  );
}

// ── Conciliar ──────────────────────────────────────────────────

function Conciliar({ datos, esTesorero, ocupado, accion }: { datos: Datos; esTesorero: boolean; ocupado: boolean; accion: Accion }) {
  const [deshaciendo, setDeshaciendo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const sellados = new Set(datos.extractos.filter((e) => e.status === 'SEALED').map((e) => e.id));
  const proveedor = (id: string) => datos.proveedores.find((v) => v.id === id)?.legalName ?? '—';
  const movimiento = (id: string) => datos.movimientos.find((m) => m.id === id);

  const candidatos = (p: Payment) =>
    datos.movimientos.filter(
      (m) =>
        sellados.has(m.statementId) &&
        m.direction === 'DEBIT' &&
        Number(m.amount) === Number(p.amount) &&
        !datos.usados.has(m.id) &&
        (!p.decidedAt || m.postedOn >= p.decidedAt.slice(0, 10)),
    );

  const porConciliar = datos.pagos.filter((p) => p.status === 'APPROVED');
  const conciliados = datos.pagos.filter((p) => p.status === 'RECONCILED');

  return (
    <section className="space-y-3">
      <Titulo>Conciliación</Titulo>

      {porConciliar.length === 0 && conciliados.length === 0 && (
        <p className="text-sm text-slate-500">No hay pagos aprobados todavía.</p>
      )}

      {porConciliar.length > 0 && (
        <ul className="divide-y rounded-md border">
          {porConciliar.map((p) => {
            const opciones = candidatos(p);
            return (
              <li key={p.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{p.concept}</p>
                    <p className="text-sm text-slate-500">
                      {proveedor(p.vendorId)} · aprobado el {p.decidedAt?.slice(0, 10)}
                    </p>
                  </div>
                  <span className="ml-auto text-slate-800">{pesos(p.amount)}</span>
                </div>
                {opciones.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Ningún movimiento de un extracto sellado coincide: tiene que ser una salida por el
                    mismo monto, sin usar, con fecha igual o posterior a la aprobación.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {opciones.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-700">
                          Salida del {m.postedOn} · ref. {m.bankReference} · {pesos(m.amount)}
                        </span>
                        {esTesorero && (
                          <Button size="sm" disabled={ocupado} onClick={() => accion(() => reconcilePayment(p.id, m.id))}>
                            Conciliar
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {conciliados.length > 0 && (
        <ul className="divide-y rounded-md border">
          {conciliados.map((p) => {
            const rec = datos.conciliaciones.find((r) => r.paymentId === p.id);
            const m = rec && movimiento(rec.movementId);
            return (
              <li key={p.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{p.concept}</p>
                    <p className="text-sm text-slate-500">
                      {proveedor(p.vendorId)} · pagado el {p.paidOn}
                      {m && ` · ref. ${m.bankReference}`}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <span className="text-slate-800">{pesos(p.amount)}</span>
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      Conciliado
                    </Badge>
                    {esTesorero && rec && deshaciendo !== rec.id && (
                      <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => { setDeshaciendo(rec.id); setMotivo(''); }}>
                        Deshacer
                      </Button>
                    )}
                  </div>
                </div>
                {esTesorero && rec && deshaciendo === rec.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      accion(async () => {
                        await unreconcilePayment(rec.id, motivo.trim());
                        setDeshaciendo(null);
                      });
                    }}
                    className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor={`motivo-${rec.id}`}>Por qué se deshace (queda registrado)</Label>
                      <Input id={`motivo-${rec.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} minLength={10} required />
                    </div>
                    <Button type="submit" size="sm" disabled={ocupado}>Deshacer conciliación</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDeshaciendo(null)}>Cancelar</Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
