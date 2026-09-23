'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createFund, listFunds, pesos, type Fund, type MyOrganization } from '@/lib/api/org';
import { ErrorNote, Loading, RoleNote } from './ui';

export function FundsCard({ org }: { org: MyOrganization }) {
  const [fondos, setFondos] = useState<Fund[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const puedeCrear = org.role === 'CONFIGURATOR';

  const cargar = useCallback(async () => {
    try {
      setFondos(await listFunds(org.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [org.id]);

  useEffect(() => {
    setFondos(null);
    cargar();
  }, [cargar]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-500" /> Fondos
          </CardTitle>
          <CardDescription>El dinero ajeno que administra la organización.</CardDescription>
        </div>
        {puedeCrear && !abierto && <Button onClick={() => setAbierto(true)}>Nuevo fondo</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {abierto && (
          <NewFundForm
            orgId={org.id}
            onDone={async () => {
              setAbierto(false);
              await cargar();
            }}
            onCancel={() => setAbierto(false)}
          />
        )}

        {fondos === null && !error && <Loading />}
        {fondos && fondos.length === 0 && (
          <p className="text-sm text-slate-500">Todavía no hay fondos.</p>
        )}
        {fondos && fondos.length > 0 && (
          <ul className="divide-y rounded-md border">
            {fondos.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/fondos/${f.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{f.name}</p>
                    <p className="text-sm text-slate-500 truncate">{f.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-slate-700">{pesos(f.totalAmount)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!puedeCrear && <RoleNote>Los fondos los crea el configurador.</RoleNote>}
        <ErrorNote>{error}</ErrorNote>
      </CardContent>
    </Card>
  );
}

function NewFundForm({
  orgId,
  onDone,
  onCancel,
}: {
  orgId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [total, setTotal] = useState('');
  const [isTotalPublic, setIsTotalPublic] = useState(true);
  const [startsOn, setStartsOn] = useState(hoy);
  const [endsOn, setEndsOn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await createFund({
        organizationId: orgId,
        name,
        purpose,
        totalAmount: Number(total),
        isTotalPublic,
        startsOn,
        endsOn: endsOn || null,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="grid gap-4 rounded-md border bg-slate-50 p-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="f-name">Nombre del fondo</Label>
        <Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="f-purpose">Propósito (público)</Label>
        <Textarea id="f-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} required rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-total">Monto total (pesos)</Label>
        <Input
          id="f-total"
          type="number"
          min={1}
          step={1}
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:self-end sm:pb-2">
        <input type="checkbox" checked={isTotalPublic} onChange={(e) => setIsTotalPublic(e.target.checked)} />
        Publicar el monto total (redondeado a millones)
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="f-start">Empieza</Label>
        <Input id="f-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-end">Termina (opcional)</Label>
        <Input id="f-end" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
      </div>
      <p className="text-xs text-slate-500 sm:col-span-2">
        El fondo nace con dos reglas públicas: solo se paga a proveedores autorizados y ningún rubro
        supera su presupuesto. Son las que se prueban en /verificar.
      </p>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear fondo'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      <div className="sm:col-span-2">
        <ErrorNote>{error}</ErrorNote>
      </div>
    </form>
  );
}
