'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

// El panel anterior mostraba usuarios, cifras y alertas inventadas.
// Queda congelado (docs/PLAN_OPENPAY_ZK.md §6) hasta que existan datos reales
// y un modelo de acceso para administradores que respete la política de datos.
export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/dashboard');
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) return null;

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administración
          </CardTitle>
          <CardDescription>Todavía no hay panel de administración dentro de la app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Por ahora la administración se hace desde el panel de Supabase, donde cada acción queda
            registrada por la plataforma.
          </p>
          <p className="text-muted-foreground">
            Cuando se construya, este panel solo mostrará agregados y, para ver datos individuales,
            pedirá una llave de acceso con propósito y fecha de vencimiento, como exige la política de datos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
