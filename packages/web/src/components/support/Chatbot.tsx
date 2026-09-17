'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  MessageSquare, 
  XCircle, 
  Send, 
  Loader2, 
  ArrowRight,
  ChevronDown,
  CheckCircle,
  Ticket,
  MessageCircle,
  X
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactHumanButton } from './ContactHumanButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supportApi } from '@/lib/api/support';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Define the FAQ data structure
type FAQItemType = {
  question: string;
  answer: string;
  category: string;
};

// Define message type for the chat
type Message = {
  id: string;
  content: string;
  isFromUser: boolean;
  timestamp: Date;
};

// Commonly asked questions with answers
const faqs: FAQItemType[] = [
  {
    question: '¿Cómo puedo enviar dinero?',
    answer: 'Para enviar dinero, ve a la sección "Enviar dinero" en el dashboard, ingresa el correo electrónico del destinatario, la cantidad y el concepto. Después confirma la transacción.',
    category: 'general'
  },
  {
    question: '¿Cómo recargo fondos a mi cuenta?',
    answer: 'Puedes recargar fondos mediante transferencia bancaria SPEI, tarjeta de débito o crédito. Ve a la sección "Recargar" para ver todas las opciones disponibles.',
    category: 'general'
  },
  {
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Para cambiar tu contraseña, ve al menú de "Configuración" > "Seguridad" y selecciona la opción "Cambiar contraseña".',
    category: 'general'
  },
  {
    question: '¿Qué hago si olvidé mi contraseña?',
    answer: 'En la pantalla de inicio de sesión, selecciona la opción "¿Olvidaste tu contraseña?". Recibirás un correo con instrucciones para restablecerla.',
    category: 'general'
  },
  {
    question: '¿Cómo verifico mi identidad?',
    answer: 'Para verificar tu identidad, ve a "Configuración" > "Verificación" y sigue las instrucciones para subir una identificación oficial y completar el proceso.',
    category: 'general'
  },
  {
    question: '¿Es segura mi información?',
    answer: 'OpenPay utiliza encriptación de datos y medidas de seguridad de nivel bancario para proteger tu información personal y financiera. Nunca compartimos tus datos con terceros sin tu consentimiento.',
    category: 'general'
  },
  {
    question: '¿Hay algún límite para las transferencias?',
    answer: 'Los límites de transferencia dependen de tu nivel de verificación. Usuarios verificados pueden transferir hasta $50,000 MXN diarios. Consulta la sección de límites en tu perfil para más detalles.',
    category: 'general'
  },
];

interface ChatbotProps {
  initialMessage?: string;
  showMinimizeButton?: boolean;
  onMinimize?: () => void;
}

export function Chatbot({ 
  initialMessage = "¿En qué puedo ayudarte hoy?",
  showMinimizeButton = true,
  onMinimize
}: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasCreatedTicket, setHasCreatedTicket] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [faqs, setFaqs] = useState<FAQItemType[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const suggestions = [
    "¿Cómo enviar dinero?",
    "Problemas con mi cuenta",
    "¿Cómo verificar mi identidad?",
    "No puedo iniciar sesión"
  ];

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    // Cargar preguntas frecuentes cuando se abre el chatbot
    const loadFAQs = async () => {
      try {
        const faqData = await supportApi.getFAQs();
        setFaqs(faqData);
      } catch (error) {
        console.error('Error cargando FAQs:', error);
      }
    };

    if (open) {
      loadFAQs();
    }
  }, [open]);

  useEffect(() => {
    // Scroll al final de los mensajes
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Inicializar chat con mensaje de bienvenida
    if (initialMessage) {
      setMessages([
        {
          id: crypto.randomUUID(),
          content: initialMessage,
          isFromUser: false,
          timestamp: new Date()
        }
      ]);
    }
  }, [initialMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Añadir mensaje del usuario
    const userMessageId = crypto.randomUUID();
    const userMessage: Message = {
      id: userMessageId,
      content: inputValue,
      isFromUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      // Buscar coincidencia en las FAQs
      const faqMatch = await findFAQMatch(inputValue);
      let responseContent: string;
      
      if (faqMatch) {
        responseContent = faqMatch;
      } else {
        // Si no hay coincidencia, dar una respuesta genérica
        responseContent = "Gracias por tu consulta. Parece que necesitas ayuda con algo específico. " +
          "Si no encuentras la respuesta que buscas, puedes contactar con un agente de soporte humano " +
          "haciendo clic en el botón de abajo.";
      }
      
      // Simular retraso para que parezca una conversación natural
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Añadir respuesta del chatbot
      const botMessage: Message = {
        id: crypto.randomUUID(),
        content: responseContent,
        isFromUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      toast({
        title: "Error",
        description: "No pudimos procesar tu mensaje. Inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      // Enfocar el input después de enviar
      inputRef.current?.focus();
    }
  };

  const findFAQMatch = async (query: string): Promise<string | null> => {
    const normalizedQuery = query.toLowerCase();
    
    // Primero buscar coincidencias exactas en preguntas
    const exactMatch = faqs.find(faq => 
      faq.question.toLowerCase() === normalizedQuery
    );
    if (exactMatch) return exactMatch.answer;

    // Luego buscar coincidencias parciales
    const partialMatches = faqs.filter(faq => {
      const normalizedQuestion = faq.question.toLowerCase();
      // Dividir consulta en palabras clave
      const keywords = normalizedQuery.split(/\s+/);
      // Contar cuántas palabras clave aparecen en la pregunta
      const matchCount = keywords.filter(word => 
        word.length > 3 && normalizedQuestion.includes(word)
      ).length;
      
      // Considerar coincidencia si más del 50% de palabras clave están presentes
      return matchCount > 0 && matchCount / keywords.length > 0.5;
    });

    // Retornar la mejor coincidencia parcial o null si no hay
    return partialMatches.length > 0 ? partialMatches[0].answer : null;
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleTicketCreated = (createdTicketId: string) => {
    setHasCreatedTicket(true);
    setTicketId(createdTicketId);
    
    // Añadir mensaje informativo al chat
    const ticketCreatedMessage: Message = {
      id: crypto.randomUUID(),
      content: `Tu solicitud ha sido registrada con el ID: ${createdTicketId}. Un agente de soporte se pondrá en contacto contigo pronto.`,
      isFromUser: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, ticketCreatedMessage]);
    
    toast({
      title: "Ticket creado",
      description: `Tu solicitud ha sido registrada con el ID: ${createdTicketId}`,
    });
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[90vw] sm:w-[450px] p-0 flex flex-col h-[85vh] sm:h-[600px] rounded-t-lg">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <SheetTitle>Asistente OpenPay</SheetTitle>
            </div>
            {showMinimizeButton && (
              <Button variant="ghost" size="icon" onClick={handleMinimize}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-max max-w-[85%] rounded-lg p-3",
                  message.isFromUser
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div>
                  <p>{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-max max-w-[85%] rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showSuggestions && !isLoading && messages.length === 1 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Preguntas frecuentes:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          {hasCreatedTicket && ticketId ? (
            <CardFooter className="p-4 border-t flex flex-col gap-2">
              <div className="text-sm text-muted-foreground text-center">
                Tu ticket #{ticketId} ha sido creado. Un agente se pondrá en contacto contigo pronto.
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setHasCreatedTicket(false);
                  setTicketId(null);
                }}
              >
                Iniciar nueva conversación
              </Button>
            </CardFooter>
          ) : (
            <>
              <Separator />
              <CardFooter className="p-4 flex flex-col gap-4">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Escribe tu mensaje..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputValue.trim()}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                
                <ContactHumanButton 
                  isExpanded={true}
                  previousMessages={messages}
                  onTicketCreated={handleTicketCreated}
                />
              </CardFooter>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
} 