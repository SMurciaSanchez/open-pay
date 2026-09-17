'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Clock } from 'lucide-react';

export function TwoFactorAuthentication() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <div>
            <CardTitle className="flex items-center gap-2">
              Autenticación de Dos Factores
              <Badge variant="secondary">Próximamente</Badge>
            </CardTitle>
            <CardDescription>
              Añade una capa adicional de seguridad a tu cuenta
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-muted-foreground">
          <Clock className="h-10 w-10 opacity-40" />
          <p className="font-medium">Función en desarrollo</p>
          <p className="text-sm max-w-sm">
            El segundo factor de autenticación (TOTP / app autenticadora) estará disponible
            en una próxima versión. Supabase Auth ya soporta MFA — solo falta activarlo en el backend.
          </p>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Tu cuenta ya está protegida con contraseña segura y RLS a nivel de base de datos.
        </p>
      </CardFooter>
    </Card>
  );
}

export default TwoFactorAuthentication;
