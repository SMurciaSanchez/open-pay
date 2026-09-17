'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Clock, AlertTriangle } from 'lucide-react';
import { SIMULATION_MODE } from '@/lib/biometrics';

export function BiometricAuthentication() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Autenticación Biométrica
          <Badge variant="secondary">Próximamente</Badge>
        </CardTitle>
        <CardDescription>
          Accede con huella digital o reconocimiento facial
        </CardDescription>
      </CardHeader>
      <CardContent>
        {SIMULATION_MODE && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Modo demo</strong> — requiere validación servidor en producción (backend FIDO2/WebAuthn).
            </span>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-muted-foreground">
          <Clock className="h-10 w-10 opacity-40" />
          <p className="font-medium">Función en desarrollo</p>
          <p className="text-sm max-w-xs">
            La autenticación biométrica (WebAuthn) estará disponible en una próxima versión.
            Por ahora tu cuenta está protegida con correo y contraseña.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default BiometricAuthentication;
