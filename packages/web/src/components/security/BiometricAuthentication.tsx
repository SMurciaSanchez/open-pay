'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Clock } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
          <Clock className="h-10 w-10 opacity-40" />
          <p className="font-medium">Función en desarrollo</p>
          <p className="max-w-sm text-sm">
            La autenticación biométrica (WebAuthn) estará disponible en una próxima versión: falta
            la parte del servidor que verifica la huella, sin la cual el navegador puede decir
            &quot;sí&quot; sin que nadie lo compruebe. Por ahora tu cuenta está protegida con correo
            y contraseña.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default BiometricAuthentication;
