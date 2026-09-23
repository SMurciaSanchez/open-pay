'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOrganization, KIND_LABEL, type OrgKind } from '@/lib/api/org';
import { ErrorNote } from './ui';

export function CreateOrganization({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [kind, setKind] = useState<OrgKind>('FOUNDATION');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      onCreated(await createOrganization(name, nit, kind));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear una organización</CardTitle>
        <CardDescription>
          Quedarás como <strong>representante legal</strong>: armas el equipo, pero no configuras
          fondos ni apruebas pagos. Esos son roles de otras personas, para que nadie controle el
          ciclo completo del dinero.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="org-name">Nombre</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-nit">NIT (opcional)</Label>
            <Input id="org-nit" value={nit} onChange={(e) => setNit(e.target.value)} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-kind">Tipo</Label>
            <select
              id="org-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as OrgKind)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(KIND_LABEL) as OrgKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Creando…' : 'Crear organización'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
