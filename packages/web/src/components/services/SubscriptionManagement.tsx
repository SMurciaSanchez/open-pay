'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { servicesApi, ServiceSubscription as Subscription } from '@/lib/api/services';
import { formatCurrency } from '@/lib/utils';
import { CalendarDays, Clock, CreditCard, MoreVertical, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SubscriptionManagement() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editedAmount, setEditedAmount] = useState<number>(0);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await servicesApi.getSubscriptions();
      setSubscriptions(result);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError('No se pudieron cargar las suscripciones. Intenta nuevamente más tarde.');
      
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las suscripciones',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleEditClick = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setEditedAmount(subscription.amount);
  };

  const handleSaveEdit = async () => {
    if (!editingSubscription) return;
    
    try {
      // TODO: add updateSubscription to servicesApi
      // Update local state
      setSubscriptions(subscriptions.map(sub => 
        sub.id === editingSubscription.id ? { ...sub, amount: editedAmount } : sub
      ));
      
      toast({
        title: 'Suscripción actualizada',
        description: 'Se ha actualizado el monto de la suscripción',
      });
      
      setEditingSubscription(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la suscripción',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await servicesApi.deleteSubscription(id);
      
      // Update local state
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
      
      toast({
        title: 'Suscripción eliminada',
        description: 'Se ha eliminado la suscripción correctamente',
      });
      
      setConfirmingDeleteId(null);
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la suscripción',
        variant: 'destructive',
      });
    }
  };

  const handlePayNow = async (subscription: Subscription) => {
    try {
      const payment = await servicesApi.makePayment({
        providerId: subscription.providerId,
        accountNumber: subscription.accountNumber,
        amount: subscription.amount,
        description: `Pago manual de suscripción: ${subscription.name}`,
      });
      
      toast({
        title: 'Pago exitoso',
        description: `Se ha realizado el pago de ${formatCurrency(subscription.amount)} a ${subscription.providerName}`,
        variant: 'success',
      });
      
      // Refresh subscriptions to get updated next payment date
      fetchSubscriptions();
    } catch (error) {
      console.error('Error making payment:', error);
      toast({
        title: 'Error en el pago',
        description: 'No se pudo procesar el pago. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (nextPaymentDate: string) => {
    const nextDate = new Date(nextPaymentDate);
    const today = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return <Badge variant="destructive" className="ml-2">Pago pendiente</Badge>;
    } else if (diffDays <= 3) {
      return <Badge variant="secondary" className="ml-2">Próximo a vencer</Badge>;
    } else {
      return <Badge variant="outline" className="ml-2">Activa</Badge>;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      bimonthly: 'Bimestral',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const renderSubscriptionsList = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (subscriptions.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay suscripciones</AlertTitle>
          <AlertDescription>
            No tienes suscripciones activas. Puedes crear una al realizar un pago de servicios y marcando la opción "Guardar como pago recurrente".
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableCaption>Lista de tus suscripciones y pagos programados</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Próximo pago</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell className="font-medium">
                  {subscription.name}
                  {getStatusBadge(subscription.nextPaymentDate)}
                </TableCell>
                <TableCell>{subscription.providerName}</TableCell>
                <TableCell>{getFrequencyLabel(subscription.frequency)}</TableCell>
                <TableCell>{formatCurrency(subscription.amount)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    {new Date(subscription.nextPaymentDate).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePayNow(subscription)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Pagar ahora</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditClick(subscription)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Editar monto</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setConfirmingDeleteId(subscription.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Eliminar</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscripciones y pagos recurrentes</CardTitle>
        <CardDescription>
          Administra tus pagos recurrentes y suscripciones de servicios
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderSubscriptionsList()}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={fetchSubscriptions}>
          Actualizar
        </Button>
        <Button onClick={() => window.location.href = '/services'}>
          Pagar un nuevo servicio
        </Button>
      </CardFooter>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar suscripción</DialogTitle>
            <DialogDescription>
              Actualiza el monto de pago para esta suscripción
            </DialogDescription>
          </DialogHeader>
          
          {editingSubscription && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nombre</Label>
                <div className="col-span-3">
                  <Input id="name" value={editingSubscription.name} disabled />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="provider" className="text-right">Proveedor</Label>
                <div className="col-span-3">
                  <Input id="provider" value={editingSubscription.providerName} disabled />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Monto</Label>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input 
                      id="amount" 
                      type="number"
                      className="pl-8"
                      value={editedAmount} 
                      onChange={(e) => setEditedAmount(parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubscription(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmingDeleteId} onOpenChange={(open) => !open && setConfirmingDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta suscripción? No se realizarán más pagos automáticos.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDeleteId(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmingDeleteId && handleConfirmDelete(confirmingDeleteId)}
            >
              Eliminar suscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 