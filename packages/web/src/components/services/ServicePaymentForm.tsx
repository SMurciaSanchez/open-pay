'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { servicesApi, ServiceCategory, ServiceProvider, ServicePayment, ServicePaymentRequest } from '@/lib/api/services';
import { formatCurrency } from '@/lib/utils';

interface ServicePaymentFormProps {
  defaultCategory?: ServiceCategory;
  defaultProviderId?: string;
  onSuccess?: (payment: ServicePayment) => void;
}

const paymentFormSchema = z.object({
  providerId: z.string({
    required_error: 'Por favor, selecciona un proveedor',
  }),
  accountNumber: z.string({
    required_error: 'Por favor, ingresa el número de cuenta o referencia',
  }),
  amount: z.coerce.number({
    required_error: 'Por favor, ingresa un monto',
    invalid_type_error: 'Por favor, ingresa un número válido',
  }).min(1, 'Monto inválido — debe ser mayor a 0')
    .refine(val => {
      const decimals = val.toString().split('.')[1];
      return !decimals || decimals.length <= 2;
    }, 'Monto inválido — máximo 2 decimales permitidos'),
  description: z.string().optional(),
  saveAsSubscription: z.boolean().default(false),
  subscriptionName: z.string().optional(),
  subscriptionFrequency: z.enum(['weekly', 'monthly', 'bimonthly', 'quarterly', 'yearly']).optional(),
});

export function ServicePaymentForm({
  defaultCategory,
  defaultProviderId,
  onSuccess
}: ServicePaymentFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<{ value: ServiceCategory; label: string }[]>([
    { value: 'mobile_recharge', label: 'Recarga de celular' },
    { value: 'utilities', label: 'Servicios públicos' },
    { value: 'internet', label: 'Internet y telefonía' },
    { value: 'tv', label: 'Televisión' },
    { value: 'government', label: 'Gobierno' },
    { value: 'education', label: 'Educación' },
    { value: 'donations', label: 'Donaciones' },
    { value: 'other', label: 'Otros' }
  ]);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | undefined>(defaultCategory);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [payment, setPayment] = useState<ServicePayment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      providerId: defaultProviderId || '',
      accountNumber: '',
      amount: 0,
      description: '',
      saveAsSubscription: false,
      subscriptionName: '',
      subscriptionFrequency: 'monthly',
    },
  });

  // Watch saveAsSubscription to conditionally show subscription fields
  const saveAsSubscription = form.watch('saveAsSubscription');
  const providerId = form.watch('providerId');

  // Load providers on category change
  useEffect(() => {
    if (!selectedCategory) return;
    
    const loadProviders = async () => {
      try {
        const providersData = await servicesApi.getProviders(selectedCategory);
        setProviders(providersData);
      } catch (error) {
        console.error('Error loading providers:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los proveedores de servicios',
          variant: 'destructive',
        });
      }
    };
    
    loadProviders();
  }, [selectedCategory, toast]);

  // Load provider details when provider changes
  useEffect(() => {
    if (!providerId) {
      setSelectedProvider(null);
      return;
    }
    
    const loadProviderDetails = async () => {
      try {
        const provider = await servicesApi.getProviderById(providerId);
        setSelectedProvider(provider);
        
        // If this provider offers fixed amounts, set the first one as default
        if (provider?.fixedAmounts?.length) {
          form.setValue('amount', provider.fixedAmounts[0]);
        } else if (provider?.minAmount) {
          form.setValue('amount', provider.minAmount);
        }
      } catch (error) {
        console.error('Error loading provider details:', error);
      }
    };
    
    loadProviderDetails();
  }, [providerId, form]);

  const handleCategoryChange = (category: ServiceCategory) => {
    setSelectedCategory(category);
    form.setValue('providerId', ''); // Reset provider when category changes
  };

  const onSubmit = async (data: z.infer<typeof paymentFormSchema>) => {
    setIsLoading(true);
    setError(null);
    setPayment(null);
    
    try {
      // Make the payment
      const paymentResult = await servicesApi.makePayment(data as ServicePaymentRequest);
      setPayment(paymentResult);

      // Redirect to payment-success page
      router.push('/services/payment-success');

      // Create subscription if requested
      if (data.saveAsSubscription && data.subscriptionName && data.subscriptionFrequency) {
        try {
          await servicesApi.createSubscription({
            name: data.subscriptionName,
            providerId: data.providerId,
            accountNumber: data.accountNumber,
            amount: data.amount,
            description: data.description,
            frequency: data.subscriptionFrequency,
          });
          
          toast({
            title: 'Suscripción creada',
            description: 'Se ha creado la suscripción para pagos recurrentes',
          });
        } catch (error) {
          console.error('Error creating subscription:', error);
          toast({
            title: 'Error en suscripción',
            description: 'El pago se realizó, pero no se pudo crear la suscripción',
            variant: 'default',
          });
        }
      }
      
      toast({
        title: 'Pago exitoso',
        description: `Se ha realizado el pago de ${formatCurrency(data.amount)} a ${selectedProvider?.name}`,
        variant: 'success',
      });
      
      if (onSuccess) {
        onSuccess(paymentResult);
      }
    } catch (error) {
      console.error('Error making payment:', error);
      setError('No se pudo procesar el pago. Por favor, intenta nuevamente.');
      
      toast({
        title: 'Error en el pago',
        description: 'No se pudo procesar el pago. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (payment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-green-600">
            <CheckCircle className="mr-2 h-5 w-5" />
            Pago realizado con éxito
          </CardTitle>
          <CardDescription>
            Tu pago ha sido procesado correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Transacción completada</AlertTitle>
            <AlertDescription>
              El pago ha sido procesado correctamente. Guarda tu número de referencia.
            </AlertDescription>
          </Alert>
          
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Proveedor</span>
              <span className="font-medium">{payment.providerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Número de cuenta</span>
              <span className="font-medium">{payment.accountNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monto</span>
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fecha</span>
              <span className="font-medium">{new Date(payment.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Número de referencia</span>
              <span className="font-medium">{payment.referenceNumber}</span>
            </div>
            {payment.description && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Descripción</span>
                <span className="font-medium">{payment.description}</span>
              </div>
            )}
          </div>
          
          {payment.receiptUrl && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => window.open(payment.receiptUrl, '_blank')}>
                Descargar comprobante
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setPayment(null)}>
            Realizar otro pago
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Volver al dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pago de servicios</CardTitle>
        <CardDescription>
          Paga tus servicios y recarga tu celular de forma rápida y segura
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue={selectedCategory || "mobile_recharge"} onValueChange={(value) => handleCategoryChange(value as ServiceCategory)}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="mobile_recharge">Celular</TabsTrigger>
            <TabsTrigger value="utilities">Servicios</TabsTrigger>
            <TabsTrigger value="internet">Internet</TabsTrigger>
            <TabsTrigger value="other">Otros</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mobile_recharge">
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Recarga de celular</AlertTitle>
              <AlertDescription>
                Selecciona tu operador, ingresa el número y el monto a recargar.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="utilities">
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Servicios públicos</AlertTitle>
              <AlertDescription>
                Paga tus servicios de luz, agua y gas.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="internet">
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Internet y telefonía</AlertTitle>
              <AlertDescription>
                Paga tus servicios de internet y telefonía fija.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="other">
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Otros servicios</AlertTitle>
              <AlertDescription>
                Paga otros servicios como TV, educación, gobierno y más.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de cuenta o referencia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={selectedProvider?.accountNumberExample || "Número de cuenta"}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    {selectedProvider?.accountNumberFormat && (
                      <FormDescription>
                        Formato: {selectedProvider.accountNumberFormat}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    {selectedProvider?.fixedAmounts ? (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedProvider.fixedAmounts.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant={field.value === amount ? "default" : "outline"}
                            className="w-full"
                            onClick={() => form.setValue('amount', amount)}
                            disabled={isLoading}
                          >
                            {formatCurrency(amount)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <FormControl>
                          <Input
                            type="number"
                            min={selectedProvider?.minAmount || 0}
                            max={selectedProvider?.maxAmount}
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </div>
                    )}
                    {selectedProvider && (
                      <FormDescription>
                        {selectedProvider.minAmount && selectedProvider.maxAmount 
                          ? `Monto mínimo: ${formatCurrency(selectedProvider.minAmount)} - Monto máximo: ${formatCurrency(selectedProvider.maxAmount)}`
                          : selectedProvider.minAmount 
                            ? `Monto mínimo: ${formatCurrency(selectedProvider.minAmount)}`
                            : selectedProvider.maxAmount 
                              ? `Monto máximo: ${formatCurrency(selectedProvider.maxAmount)}`
                              : ''}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Agrega una descripción o referencia para este pago"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="saveAsSubscription"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Guardar como pago recurrente</FormLabel>
                      <FormDescription>
                        Programa este pago para que se realice automáticamente de forma periódica
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {saveAsSubscription && (
                <div className="space-y-4 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name="subscriptionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la suscripción</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Pago de luz mensual"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="subscriptionFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frecuencia de pago</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona la frecuencia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensual</SelectItem>
                            <SelectItem value="bimonthly">Bimestral</SelectItem>
                            <SelectItem value="quarterly">Trimestral</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Realizar pago
                  </>
                )}
              </Button>
            </form>
          </Form>
        </Tabs>
      </CardContent>
    </Card>
  );
} 