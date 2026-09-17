'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock } from 'lucide-react';

export function SecuritySettings() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Configuración de Seguridad</CardTitle>
            </div>
            <Badge variant="secondary">En desarrollo</Badge>
          </div>
          <CardDescription>
            Opciones avanzadas de seguridad disponibles próximamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center text-muted-foreground">
            <Clock className="h-8 w-8 opacity-40" />
            <p className="text-sm max-w-xs">
              Las opciones de 2FA, alertas de inicio de sesión y llaves de seguridad
              estarán disponibles en una próxima versión.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
