'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { LifeBuoy } from 'lucide-react';
import { supportApi, CreateTicketParams } from '@/lib/api/support';
import { useAuth } from '@/hooks/use-auth';

// Tipos para las propiedades del componente
interface ContactHumanButtonProps {
  isExpanded?: boolean;
  previousMessages?: Array<{ content: string; isFromUser: boolean }>;
  onTicketCreated?: (ticketId: string) => void;
}

// Tipos para el formulario
interface TicketFormValues {
  subject: string;
  category: string;
  message: string;
  includeConversation: boolean;
}

/**
 * Componente que permite a los usuarios contactar con un agente humano desde el chatbot
 */
export function ContactHumanButton({
  isExpanded = false,
  previousMessages = [],
  onTicketCreated
}: ContactHumanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Configurar react-hook-form
  const form = useForm<TicketFormValues>({
    defaultValues: {
      subject: '',
      category: 'general',
      message: '',
      includeConversation: true
    }
  });

  // Abrir el diálogo
  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  // Cerrar el diálogo
  const handleCloseDialog = () => {
    setIsOpen(false);
    form.reset();
  };

  // Enviar el formulario
  const onSubmit = async (data: TicketFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para contactar a soporte",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar el contenido del mensaje inicial
      let initialMessage = data.message;
      
      // Añadir el historial de conversación si se seleccionó
      if (data.includeConversation && previousMessages.length > 0) {
        initialMessage += "\n\n--- Historial de conversación ---\n";
        previousMessages.forEach((msg, index) => {
          initialMessage += `\n${msg.isFromUser ? 'Usuario' : 'Chatbot'}: ${msg.content}`;
        });
      }

      // Crear el ticket
      const ticketParams: CreateTicketParams = {
        userId: user.id,
        subject: data.subject,
        category: data.category,
        priority: 'medium',
        initialMessage
      };

      const ticket = await supportApi.createTicket(ticketParams);
      
      // Notificar que el ticket fue creado
      toast({
        title: "Ticket creado",
        description: `Tu solicitud ha sido registrada con el ID: ${ticket.id}`,
      });
      
      // Cerrar el diálogo
      handleCloseDialog();
      
      // Ejecutar callback si existe
      if (onTicketCreated) {
        onTicketCreated(ticket.id);
      }
    } catch (error) {
      console.error('Error al crear ticket:', error);
      toast({
        title: "Error",
        description: "No pudimos procesar tu solicitud. Inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant={isExpanded ? "default" : "outline"}
        size={isExpanded ? "default" : "sm"}
        onClick={handleOpenDialog}
        className={isExpanded ? "w-full justify-start gap-2" : ""}
      >
        <LifeBuoy className="h-4 w-4" />
        {isExpanded && <span>Contactar a un agente</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Contactar a un agente de soporte</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                rules={{ required: "Este campo es requerido" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Escribe un asunto para tu consulta" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="account">Cuenta</SelectItem>
                        <SelectItem value="payments">Pagos</SelectItem>
                        <SelectItem value="transfers">Transferencias</SelectItem>
                        <SelectItem value="security">Seguridad</SelectItem>
                        <SelectItem value="technical">Soporte técnico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                rules={{ required: "Este campo es requerido" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe tu problema o consulta en detalle" 
                        rows={4} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {previousMessages.length > 0 && (
                <FormField
                  control={form.control}
                  name="includeConversation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0">
                        <FormLabel>Incluir historial de conversación</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
} 