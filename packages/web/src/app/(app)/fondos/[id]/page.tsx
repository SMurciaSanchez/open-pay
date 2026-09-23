'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetsTab, ContractsTab, VendorsTab } from '@/components/org/FundSetupTabs';
import { ErrorNote, Loading, PageHeader, RoleBadge } from '@/components/org/ui';
import { getFund, pesos, type Fund, type MyOrganization } from '@/lib/api/org';

export default function FondoPage() {
  const { id } = useParams<{ id: string }>();
  const [fondo, setFondo] = useState<(Fund & { organization: MyOrganization }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFund(id).then(setFondo).catch((e) => setError((e as Error).message));
  }, [id]);

  const esConfig = fondo?.organization.role === 'CONFIGURATOR';

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-5xl mx-auto space-y-6">
      <Link href="/organizacion" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> {fondo?.organization.name ?? 'Organización'}
      </Link>

      <ErrorNote>{error}</ErrorNote>
      {!fondo && !error && <Loading />}

      {fondo && (
        <>
          <PageHeader
            icon={Wallet}
            title={fondo.name}
            subtitle={`${pesos(fondo.totalAmount)} · desde ${fondo.startsOn}${fondo.endsOn ? ` hasta ${fondo.endsOn}` : ''}`}
          >
            <RoleBadge role={fondo.organization.role} />
          </PageHeader>
          <p className="text-slate-600">{fondo.purpose}</p>

          <Tabs defaultValue="rubros">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="rubros">Rubros</TabsTrigger>
              <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
              <TabsTrigger value="contratos">Contratos</TabsTrigger>
            </TabsList>
            <TabsContent value="rubros" className="pt-4">
              <BudgetsTab fundId={fondo.id} canEdit={esConfig} />
            </TabsContent>
            <TabsContent value="proveedores" className="pt-4">
              <VendorsTab fundId={fondo.id} canEdit={esConfig} />
            </TabsContent>
            <TabsContent value="contratos" className="pt-4">
              <ContractsTab fundId={fondo.id} canEdit={esConfig} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
