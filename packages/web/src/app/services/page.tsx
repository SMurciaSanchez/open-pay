'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServicePaymentForm } from '@/components/services/ServicePaymentForm';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/ui/icons';


export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('payment');

  return (
    <div className="px-5 py-6 lg:px-8 lg:py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <span className="text-violet-600 text-lg">⚡</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pago de Servicios</h1>
          <p className="text-slate-500 text-sm">Paga tus servicios de manera rápida y segura.</p>
        </div>
      </div>

      <Tabs defaultValue="payment" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full md:w-[400px] mb-8">
          <TabsTrigger value="payment">Pago</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="payment">
          <ServicePaymentForm />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                Visualiza tus pagos de servicios realizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="rounded-full bg-muted p-6">
                  <Icons.clock className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No hay pagos recientes</h3>
                <p className="text-muted-foreground max-w-md">
                  Cuando realices pagos de servicios, aparecerán aquí para que puedas
                  consultarlos fácilmente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 