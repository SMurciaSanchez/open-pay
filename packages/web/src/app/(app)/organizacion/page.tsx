'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { CreateOrganization } from '@/components/org/CreateOrganization';
import { FundsCard } from '@/components/org/FundsCard';
import { TeamCard } from '@/components/org/TeamCard';
import { ErrorNote, Loading, PageHeader, RoleBadge } from '@/components/org/ui';
import { KIND_LABEL, myOrganizations, type MyOrganization } from '@/lib/api/org';

const CLAVE_ORG = 'openpay.org';

export default function OrganizacionPage() {
  const [orgs, setOrgs] = useState<MyOrganization[] | null>(null);
  const [actual, setActual] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (preferida?: string) => {
    try {
      const lista = await myOrganizations();
      setOrgs(lista);
      let guardada: string | null = null;
      try {
        guardada = localStorage.getItem(CLAVE_ORG);
      } catch {
        // sin almacenamiento: se usa la primera
      }
      const elegida =
        lista.find((o) => o.id === preferida) ??
        lista.find((o) => o.id === guardada) ??
        lista[0];
      setActual(elegida?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegir = (id: string) => {
    setActual(id);
    try {
      localStorage.setItem(CLAVE_ORG, id);
    } catch {
      // no pasa nada si no se puede recordar
    }
  };

  const org = orgs?.find((o) => o.id === actual);

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={Building2}
        title={org?.name ?? 'Organización'}
        subtitle={
          org
            ? [KIND_LABEL[org.kind], org.nit && `NIT ${org.nit}`].filter(Boolean).join(' · ')
            : 'La organización que administra dinero ajeno'
        }
      >
        {org && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Tu rol:</span>
            <RoleBadge role={org.role} />
          </div>
        )}
      </PageHeader>

      <ErrorNote>{error}</ErrorNote>

      {orgs === null && !error && <Loading />}

      {orgs && orgs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => elegir(o.id)}
              className={`rounded-full border px-3 py-1 text-sm ${
                o.id === actual
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}

      {orgs && orgs.length === 0 && <CreateOrganization onCreated={(id) => cargar(id)} />}

      {org && (
        <>
          <FundsCard org={org} />
          <TeamCard org={org} />
          <details className="text-sm text-slate-500">
            <summary className="cursor-pointer">¿Crear otra organización?</summary>
            <div className="mt-3">
              <CreateOrganization onCreated={(id) => cargar(id)} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
