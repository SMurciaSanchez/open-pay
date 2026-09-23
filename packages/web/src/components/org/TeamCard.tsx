'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addMember,
  orgMembers,
  revokeMember,
  ROLE_HINT,
  ROLE_LABEL,
  type Member,
  type MyOrganization,
  type OrgRole,
} from '@/lib/api/org';
import { ErrorNote, Loading, RoleBadge, RoleNote } from './ui';

const ROLES: OrgRole[] = ['CONFIGURATOR', 'TREASURER', 'APPROVER', 'LEGAL_REP'];

export function TeamCard({ org }: { org: MyOrganization }) {
  const [miembros, setMiembros] = useState<Member[] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('CONFIGURATOR');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const esRep = org.role === 'LEGAL_REP';

  const cargar = useCallback(async () => {
    try {
      setMiembros(await orgMembers(org.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [org.id]);

  useEffect(() => {
    setMiembros(null);
    cargar();
  }, [cargar]);

  const invitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      await addMember(org.id, email, role);
      setEmail('');
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const sacar = async (m: Member) => {
    setError(null);
    try {
      await revokeMember(m.id);
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const vigentes = miembros?.filter((m) => !m.revokedAt) ?? [];
  const faltan = ROLES.filter((r) => !vigentes.some((m) => m.role === r));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-500" /> Equipo
        </CardTitle>
        <CardDescription>
          Cada persona tiene un solo rol. Quien registra un pago no puede aprobarlo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {miembros === null && !error && <Loading />}

        {miembros && (
          <ul className="divide-y rounded-md border">
            {miembros.map((m) => (
              <li
                key={m.id}
                className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${
                  m.revokedAt ? 'opacity-50' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{m.fullName}</p>
                  <p className="text-sm text-slate-500 truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.revokedAt ? (
                    <span className="text-xs text-slate-500">Retirado</span>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                  {esRep && !m.revokedAt && m.role !== 'LEGAL_REP' && (
                    <Button variant="ghost" size="sm" onClick={() => sacar(m)}>
                      Retirar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {miembros && faltan.length > 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
            Falta: {faltan.map((r) => ROLE_LABEL[r]).join(', ')}. Sin esos roles no se completa el
            ciclo de un pago.
          </p>
        )}

        {esRep ? (
          <form onSubmit={invitar} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Correo de la persona</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Rol</Label>
              <select
                id="inv-role"
                value={role}
                onChange={(e) => setRole(e.target.value as OrgRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={ocupado}>
              Agregar
            </Button>
            <p className="text-xs text-slate-500 sm:col-span-3">
              {ROLE_HINT[role]}. La persona tiene que haber creado su cuenta en OpenPay antes.
            </p>
          </form>
        ) : (
          <RoleNote>Solo el representante legal agrega o retira personas.</RoleNote>
        )}

        <ErrorNote>{error}</ErrorNote>
      </CardContent>
    </Card>
  );
}
