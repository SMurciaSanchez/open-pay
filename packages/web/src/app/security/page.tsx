'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/toaster';

import TwoFactorAuthentication from '@/components/security/TwoFactorAuthentication';
import BiometricAuthentication from '@/components/security/BiometricAuthentication';
import ChangePasswordCard from '@/components/security/ChangePasswordCard';

export default function SecurityPage() {
  return (
    <div className="container max-w-3xl py-8">
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Seguridad</h2>
        <p className="text-muted-foreground">
          Administra la seguridad de tu cuenta
        </p>
      </div>
      <Separator className="my-6" />

      <Tabs defaultValue="password" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="password">Contraseña</TabsTrigger>
          <TabsTrigger value="2fa">2FA</TabsTrigger>
          <TabsTrigger value="biometric">Biometría</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4">
          <ChangePasswordCard />
        </TabsContent>

        <TabsContent value="2fa" className="space-y-4">
          <TwoFactorAuthentication />
        </TabsContent>

        <TabsContent value="biometric" className="space-y-4">
          <BiometricAuthentication />
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
