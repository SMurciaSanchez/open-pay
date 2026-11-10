'use client';

/**
 * Panel Principal: de un vistazo, en qué organizaciones y fondos trabaja quien
 * entró y qué está esperando por su rol. No muestra saldo ni billetera: OpenPay
 * no guarda dinero, registra y prueba el que la organización mueve en su banco.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  listFunds,
  listPayments,
  mensajeDeError,
  myOrganizations,
  pesos,
  type Fund,
  type MyOrganization,
  type OrgRole,
  type Payment,
} from '@/lib/api/org';
import { ErrorNote, Loading, PageHeader, RoleBadge } from '@/components/org/ui';

interface FondoConPagos {
  fondo: Fund;
  pagos: Payment[];
}

interface OrganizacionConFondos {
  org: MyOrganization;
  fondos: FondoConPagos[];
}

async function cargar(): Promise<OrganizacionConFondos[]> {
  const orgs = await myOrganizations();
  return Promise.all(
    orgs.map(async (org) => {
      const fondos = await listFunds(org.id);
      return {
        org,
        fondos: await Promise.all(fondos.map(async (fondo) => ({ fondo, pagos: await listPayments(fondo.id) }))),
      };
    }),
  );
}

const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Lo que espera por esta persona en un fondo, según su rol. */
function pendiente(role: OrgRole, pagos: Payment[]): string | null {
  const borradores = pagos.filter((p) => p.status === 'DRAFT').length;
  const sinConciliar = pagos.filter((p) => p.status === 'APPROVED').length;
  if (role === 'APPROVER' && borradores > 0) {
    return `${cuantos(borradores, 'pago espera', 'pagos esperan')} tu decisión`;
  }
  if (role === 'TREASURER' && sinConciliar > 0) {
    return `${cuantos(sinConciliar, 'pago aprobado', 'pagos aprobados')} sin conciliar con el banco`;
  }
  return null;
}

function resumen(pagos: Payment[]): string {
  if (pagos.length === 0) return 'Sin pagos registrados todavía';
  const por = (estado: Payment['status']) => pagos.filter((p) => p.status === estado).length;
  const partes = [
    por('DRAFT') > 0 && cuantos(por('DRAFT'), 'por decidir', 'por decidir'),
    por('APPROVED') > 0 && cuantos(por('APPROVED'), 'aprobado', 'aprobados'),
    por('RECONCILED') > 0 && cuantos(por('RECONCILED'), 'conciliado', 'conciliados'),
    por('REJECTED') > 0 && cuantos(por('REJECTED'), 'rechazado', 'rechazados'),
  ].filter(Boolean);
  return `Pagos: ${partes.join(' · ')}`;
}

export default function DashboardPage() {
  const [datos, setDatos] = useState<OrganizacionConFondos[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargar()
      .then(setDatos)
      .catch((e) => setError(mensajeDeError(e)));
  }, []);

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Panel Principal"
        subtitle="Tus organizaciones, sus fondos y lo que espera por ti."
      />

      <ErrorNote>{error}</ErrorNote>
      {!datos && !error && <Loading />}

      {datos && datos.length === 0 && (
        <div className="rounded-xl border bg-white p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Todavía no estás en ninguna organización</h2>
          <p className="text-sm text-slate-600">
            Crea la tuya para registrar un fondo, o pídele al representante legal de una que ya existe
            que te sume al equipo con el correo de esta cuenta.
          </p>
          <Button asChild>
            <Link href="/organizacion">Crear una organización</Link>
          </Button>
        </div>
      )}

      {datos?.map(({ org, fondos }) => (
        <section key={org.id} className="rounded-xl border bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className="h-5 w-5 shrink-0 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 truncate">{org.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Tu rol:</span>
              <RoleBadge role={org.role} />
            </div>
          </div>

          {fondos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Esta organización todavía no tiene fondos.{' '}
              <Link href="/organizacion" className="text-indigo-700 underline">
                Ir a la organización
              </Link>
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {fondos.map(({ fondo, pagos }) => {
                const espera = pendiente(org.role, pagos);
                return (
                  <li key={fondo.id}>
                    <Link
                      href={`/fondos/${fondo.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 truncate">{fondo.name}</p>
                        <p className="text-sm text-slate-500">
                          {pesos(fondo.totalAmount)} · {resumen(pagos)}
                        </p>
                        {espera && <p className="mt-1 text-sm font-medium text-amber-700">{espera}</p>}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}

      <div className="rounded-xl border bg-white p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-semibold text-slate-900">Verificar una prueba</h2>
            <p className="text-sm text-slate-600">
              Cualquiera puede comprobar, sin cuenta, que los pagos de un lote cumplieron las reglas.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/verificar">Abrir el verificador</Link>
        </Button>
      </div>
    </div>
  );
}
