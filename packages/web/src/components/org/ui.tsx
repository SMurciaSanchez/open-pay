'use client';

import type { ComponentType, ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABEL, type OrgRole } from '@/lib/api/org';

/** Encabezado de sección, igual al de las demás pantallas con sesión. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function RoleBadge({ role }: { role: OrgRole }) {
  return (
    <Badge variant="outline" className="whitespace-nowrap">
      {ROLE_LABEL[role]}
    </Badge>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-2 text-sm text-red-600" role="alert">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-500 py-6">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </p>
  );
}

/** Explica por qué no aparece un botón, en vez de esconderlo sin más. */
export function RoleNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-500">{children}</p>;
}
