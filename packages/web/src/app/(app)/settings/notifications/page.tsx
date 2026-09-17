'use client';

import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { Toaster } from '@/components/ui/toaster';

export default function NotificationsPage() {
  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus preferencias de notificaciones y alertas.
        </p>
      </div>
      
      <NotificationsSettings />
      
      <Toaster />
    </div>
  );
} 