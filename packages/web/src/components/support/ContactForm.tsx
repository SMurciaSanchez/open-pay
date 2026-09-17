'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

// Define the form validation schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Nombre required — al menos 2 caracteres.',
  }),
  email: z.string().email({
    message: 'Correo required — introduce un correo válido.',
  }),
  subject: z.string().min(1, {
    message: 'Asunto required — selecciona un asunto.',
  }),
  message: z.string().min(10, {
    message: 'Mensaje required — al menos 10 caracteres.',
  }),
});

// Subject options for the contact form
const subjectOptions = [
  { value: 'account', label: 'Cuenta y acceso' },
  { value: 'transactions', label: 'Problemas con transacciones' },
  { value: 'verification', label: 'Verificación de identidad' },
  { value: 'security', label: 'Seguridad' },
  { value: 'bug', label: 'Reportar un error' },
  { value: 'suggestion', label: 'Sugerencia' },
  { value: 'other', label: 'Otro' },
];

export function ContactForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, send data to backend API
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(values),
      // });
      
      // if (!response.ok) throw new Error('Failed to submit');
      
      // Success
      setSubmitStatus('success');
      form.reset();
      
      toast({
        title: '¡Mensaje enviado!',
        description: 'Hemos recibido tu mensaje. Te contactaremos pronto.',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Contáctanos</CardTitle>
        <CardDescription>
          Completa el formulario para contactar a nuestro equipo de soporte.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {submitStatus === 'success' && (
          <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>¡Mensaje enviado con éxito! (success)</AlertTitle>
            <AlertDescription>
              Hemos recibido tu mensaje. Nuestro equipo de soporte se pondrá en contacto contigo pronto.
            </AlertDescription>
          </Alert>
        )}
        
        {submitStatus === 'error' && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Hubo un problema al enviar tu mensaje. Por favor, intenta nuevamente o contacta soporte directamente.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@correo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un asunto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecciona el tema relacionado con tu consulta.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe tu mensaje detallado aquí..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Incluye todos los detalles relevantes para ayudarnos a resolver tu problema.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full md:w-auto" 
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? 'Enviando...' : 'Enviar mensaje'}
            </Button>
          </form>
        </Form>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-4 items-start border-t pt-6">
        <div>
          <h3 className="text-sm font-medium">Contacto directo</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Correo electrónico: soporte@openpay.com<br />
            Teléfono: (800) 123-4567<br />
            Horario: Lunes a viernes, 9:00 AM - 6:00 PM (CST)
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium">Tiempo de respuesta</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Nos esforzamos por responder a todas las consultas dentro de 24 horas hábiles.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
} 