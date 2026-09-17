'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BalanceChart() {
  return (
    <Card>
      <CardHeader><CardTitle>Historial de balance</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Gráfica de balance disponible próximamente.</p>
      </CardContent>
    </Card>
  );
}
