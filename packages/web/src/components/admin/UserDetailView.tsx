'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  FileText,
  Lock,
  Unlock,
  ExternalLink
} from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { BlockUserDialog } from './BlockUserDialog';

interface UserDetailViewProps {
  userId: string;
  onBack: () => void;
}

export function UserDetailView({ userId, onBack }: UserDetailViewProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    try {
      const userData = await adminApi.getUserById(userId);
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const handleBlockUser = async (
    userId: string,
    reason: string,
    duration: 'temporary' | 'permanent',
    durationDays?: number,
    notifyUser = true,
    comments?: string
  ) => {
    try {
      await adminApi.blockUser({
        userId,
        reason,
        permanent: duration === 'permanent',
        durationDays: durationDays || 0,
        notifyUser,
        comments
      });
      
      // Refresh user data after block
      fetchUserDetails();
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const handleUnblockUser = async () => {
    try {
      await adminApi.unblockUser({ 
        userId,
        adminId: 'current-admin-id',
        adminName: 'Administrador',
        reason: 'Desbloqueo manual',
        notifyUser: true
      });
      
      // Refresh user data after unblock
      fetchUserDetails();
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  if (isLoading || !user) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <CardTitle>Cargando detalles de usuario...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="space-x-2">
            {user.status === 'blocked' ? (
              <Button 
                variant="outline" 
                className="text-green-600"
                onClick={handleUnblockUser}
              >
                <Unlock className="mr-2 h-4 w-4" />
                Desbloquear Usuario
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="text-red-600"
                onClick={() => setIsBlockDialogOpen(true)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Bloquear Usuario
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
            <TabsTrigger value="verification">Verificación</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Información de Usuario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Estado:</dt>
                      <dd>
                        {user.status === 'active' && <Badge className="bg-green-500">Activo</Badge>}
                        {user.status === 'inactive' && <Badge variant="outline">Inactivo</Badge>}
                        {user.status === 'blocked' && <Badge variant="destructive">Bloqueado</Badge>}
                        {user.status === 'suspended' && <Badge variant="destructive">Suspendido</Badge>}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Rol:</dt>
                      <dd>
                        {user.role === 'admin' ? (
                          <Badge className="bg-purple-500">
                            <Shield className="h-3 w-3 mr-1" />
                            Administrador
                          </Badge>
                        ) : 'Usuario'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Fecha de registro:</dt>
                      <dd className="text-sm">{formatDate(user.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Último acceso:</dt>
                      <dd className="text-sm">{user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}</dd>
                    </div>
                    {user.blockedUntil && (
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-muted-foreground">Bloqueado hasta:</dt>
                        <dd className="text-sm">{formatDate(user.blockedUntil)}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Información Financiera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Saldo de cuenta:</dt>
                      <dd className="text-sm font-medium">{formatCurrency(user.accountBalance || 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Total transacciones:</dt>
                      <dd className="text-sm">{user.transactionCount || 0}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-muted-foreground">Puntuación de riesgo:</dt>
                      <dd className="text-sm">
                        {user.riskScore !== undefined ? (
                          <span className={`font-medium ${user.riskScore > 70 ? 'text-red-500' : user.riskScore > 40 ? 'text-amber-500' : 'text-green-500'}`}>
                            {user.riskScore}/100
                          </span>
                        ) : 'No disponible'}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="activity" className="pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Actividad Reciente
                </CardTitle>
                <CardDescription>
                  Historial de acciones y transacciones del usuario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  El usuario ha realizado {user.transactionCount || 0} transacciones.
                  Para ver el detalle completo, por favor consulte el módulo de transacciones.
                </p>
                <div className="flex justify-center py-6">
                  <Button variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Transacciones
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verification" className="pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Estado de Verificación
                </CardTitle>
                <CardDescription>
                  Información sobre la verificación de identidad del usuario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={user.verified ? "bg-green-500" : "bg-amber-500"}>
                      {user.verified ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Verificado</>
                      ) : (
                        <><AlertCircle className="h-3 w-3 mr-1" /> No Verificado</>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Documentos Verificados</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Documento de Identidad: 
                        <Badge variant={user.verified ? "default" : "outline"}>
                          {user.verified ? "Verificado" : "Pendiente"}
                        </Badge>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Datos Bancarios: 
                        <Badge variant={user.verified ? "default" : "outline"}>
                          {user.verified ? "Verificado" : "Pendiente"}
                        </Badge>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Block User Dialog */}
      <BlockUserDialog
        open={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        user={user}
        onBlock={handleBlockUser}
        currentAdminId="current-admin-id"
        currentAdminName="Administrador"
      />
    </Card>
  );
} 