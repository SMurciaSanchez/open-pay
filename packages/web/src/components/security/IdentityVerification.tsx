'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock } from 'lucide-react';

export default function IdentityVerification() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Verificación de Identidad
          <Badge variant="secondary">Próximamente</Badge>
        </CardTitle>
        <CardDescription>
          Tus documentos son datos restringidos: solo se pedirán cuando haya para qué usarlos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center text-muted-foreground">
          <Clock className="h-10 w-10 opacity-40" />
          <p className="font-medium">Función en desarrollo</p>
          <p className="text-sm max-w-sm">
            La verificación de identidad (KYC) todavía no existe. OpenPay no te pedirá fotos ni números de
            documento hasta tener un proceso real, con revisión legal y almacenamiento cifrado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
