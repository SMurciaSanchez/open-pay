'use client';

import React, { useState } from 'react';
import { redirect } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi } from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils/formatters';
import { AdminNav } from '@/components/admin/AdminNav';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Download, CreditCard, BarChart2, ShieldCheck, Bell, ClipboardList } from 'lucide-react';
const UsersIcon = Users;
const ClipboardListIcon = ClipboardList;
const ChartBarIcon = BarChart2;
const ShieldCheckIcon = ShieldCheck;
const BellIcon = Bell;
const CreditCardIcon = CreditCard;
import { UserManagement } from '@/components/admin/UserManagement';
import { TransactionMonitoring } from '@/components/admin/TransactionMonitoring';
import { Overview } from '@/components/admin/Overview';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useAuth } from '@/lib/auth';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { DocumentVerificationView } from '@/components/admin/DocumentVerificationView';


export default function AdminDashboard() {
  const { user, loading } = useAuth();

  // Solo redirigir si no hay sesión activa
  if (!loading && !user) {
    redirect('/login');
  }
  // NOTA: La verificación de rol admin se hace a nivel de RLS en Supabase.
  // El panel es accesible para usuarios autenticados; los datos sensibles
  // están protegidos por policies que validan app_metadata.role === 'admin'.

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Panel de Administración</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 w-full">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            <span className="hidden md:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4" />
            <span className="hidden md:inline">Transacciones</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <ClipboardListIcon className="h-4 w-4" />
            <span className="hidden md:inline">Auditoría</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <ChartBarIcon className="h-4 w-4" />
            <span className="hidden md:inline">Reportes</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4" />
            <span className="hidden md:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <BellIcon className="h-4 w-4" />
            <span className="hidden md:inline">Notificaciones</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="pt-6">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="transactions" className="pt-6">
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold">Gestión de Transacciones</h3>
            <p className="text-muted-foreground">
              La gestión de transacciones está en desarrollo. Estará disponible próximamente.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="audit" className="pt-6">
          <AuditLogViewer />
        </TabsContent>
        
        <TabsContent value="reports" className="pt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Usuarios totales</p>
                <p className="text-2xl font-bold mt-1">950</p>
                <p className="text-xs text-green-600 mt-1">+7.4% este mes</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Transacciones (mes)</p>
                <p className="text-2xl font-bold mt-1">260</p>
                <p className="text-xs text-green-600 mt-1">+10.6% vs anterior</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Ingresos (mes)</p>
                <p className="text-2xl font-bold mt-1">$105,000</p>
                <p className="text-xs text-green-600 mt-1">+11.7% vs anterior</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Alertas pendientes</p>
                <p className="text-2xl font-bold mt-1">10</p>
                <p className="text-xs text-amber-600 mt-1">Requieren revisión</p>
              </div>
            </div>
            <Overview />
          </div>
        </TabsContent>
        
        <TabsContent value="security" className="pt-6">
          <DocumentVerificationView />
        </TabsContent>
        
        <TabsContent value="notifications" className="pt-6">
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold">Notificaciones</h3>
            <p className="text-muted-foreground">
              El módulo de notificaciones está en desarrollo. Estará disponible próximamente.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 