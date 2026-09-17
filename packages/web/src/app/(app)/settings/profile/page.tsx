'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordChange } from '@/components/settings/PasswordChange';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { ActivityHistory } from '@/components/settings/ActivityHistory';
import { Toaster } from '@/components/ui/toaster';

export default function ProfileSettingsPage() {
  return (
    <div className="container py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Perfil y cuenta</h1>
        <p className="text-muted-foreground mt-2">
          Administra tu información personal y preferencias de cuenta.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="info">Información personal</TabsTrigger>
              <TabsTrigger value="password">Contraseña</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-6">
              <ProfileForm />
            </TabsContent>
            
            <TabsContent value="password" className="space-y-6">
              <PasswordChange />
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <ActivityHistory />
        </div>
      </div>
      
      <Toaster />
    </div>
  );
} 