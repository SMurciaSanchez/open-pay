function uuidv4() { return crypto.randomUUID(); }

// Tipos de datos para la API de soporte
export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  lastAgentId?: string;
  lastAgentName?: string;
};

export type SupportTicketMessage = {
  id: string;
  ticketId: string;
  content: string;
  isFromUser: boolean;
  agentId?: string;
  agentName?: string;
  timestamp: Date;
};

export type CreateTicketParams = {
  userId: string;
  subject: string;
  category: string;
  priority?: 'low' | 'medium' | 'high';
  initialMessage?: string;
};

export type AddMessageParams = {
  ticketId: string;
  content: string;
  isFromUser: boolean;
  agentId?: string;
  agentName?: string;
};

// Datos de ejemplo para FAQs
const mockFAQs: FAQItem[] = [
  {
    id: '1',
    question: '¿Cómo puedo enviar dinero?',
    answer: 'Para enviar dinero, ve a la sección "Enviar dinero" en el dashboard, ingresa el correo electrónico del destinatario, la cantidad y el concepto. Después confirma la transacción.',
    category: 'transfers'
  },
  {
    id: '2',
    question: '¿Cómo recargo fondos a mi cuenta?',
    answer: 'Puedes recargar fondos mediante transferencia bancaria SPEI, tarjeta de débito o crédito. Ve a la sección "Recargar" para ver todas las opciones disponibles.',
    category: 'deposits'
  },
  {
    id: '3',
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Para cambiar tu contraseña, ve al menú de "Configuración" > "Seguridad" y selecciona la opción "Cambiar contraseña".',
    category: 'security'
  },
  {
    id: '4',
    question: '¿Qué hago si olvidé mi contraseña?',
    answer: 'En la pantalla de inicio de sesión, selecciona la opción "¿Olvidaste tu contraseña?". Recibirás un correo con instrucciones para restablecerla.',
    category: 'security'
  },
  {
    id: '5',
    question: '¿Cómo verifico mi identidad?',
    answer: 'Para verificar tu identidad, ve a "Configuración" > "Verificación" y sigue las instrucciones para subir una identificación oficial y completar el proceso.',
    category: 'verification'
  },
  {
    id: '6',
    question: '¿Es segura mi información?',
    answer: 'OpenPay utiliza encriptación de datos y medidas de seguridad de nivel bancario para proteger tu información personal y financiera. Nunca compartimos tus datos con terceros sin tu consentimiento.',
    category: 'security'
  },
  {
    id: '7',
    question: '¿Hay algún límite para las transferencias?',
    answer: 'Los límites de transferencia dependen de tu nivel de verificación. Usuarios verificados pueden transferir hasta $50,000 MXN diarios. Consulta la sección de límites en tu perfil para más detalles.',
    category: 'transfers'
  },
  {
    id: '8',
    question: 'No puedo iniciar sesión en mi cuenta',
    answer: 'Verifica que estás usando el correo electrónico y contraseña correctos. Si sigues teniendo problemas, intenta restablecer tu contraseña o contacta a soporte para asistencia.',
    category: 'account'
  },
  {
    id: '9',
    question: '¿Cómo veo mi historial de transacciones?',
    answer: 'Tu historial de transacciones está disponible en la sección "Transacciones" del dashboard principal. Puedes filtrar por fecha, tipo de transacción y buscar transacciones específicas.',
    category: 'transactions'
  },
  {
    id: '10',
    question: '¿Cómo reporto una transacción sospechosa?',
    answer: 'Si detectas una transacción que no reconoces, ve a la sección "Transacciones", localiza la transacción, selecciona "Reportar" y sigue las instrucciones. También puedes contactar directamente a soporte.',
    category: 'security'
  }
];

// Datos de ejemplo para tickets
let mockTickets: SupportTicket[] = [];
let mockMessages: SupportTicketMessage[] = [];

// API de soporte
export const supportApi = {
  // Obtener FAQs
  getFAQs: async (): Promise<FAQItem[]> => {
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockFAQs;
  },

  // Buscar FAQs por categoría
  getFAQsByCategory: async (category: string): Promise<FAQItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockFAQs.filter(faq => faq.category === category);
  },

  // Buscar FAQs por texto
  searchFAQs: async (query: string): Promise<FAQItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const normalizedQuery = query.toLowerCase();
    return mockFAQs.filter(
      faq => 
        faq.question.toLowerCase().includes(normalizedQuery) || 
        faq.answer.toLowerCase().includes(normalizedQuery)
    );
  },

  // Crear un nuevo ticket de soporte
  createTicket: async (params: CreateTicketParams): Promise<SupportTicket> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const ticketId = uuidv4();
    const now = new Date();
    
    const newTicket: SupportTicket = {
      id: ticketId,
      userId: params.userId,
      subject: params.subject,
      category: params.category,
      status: 'open',
      priority: params.priority || 'medium',
      createdAt: now,
      updatedAt: now,
    };
    
    mockTickets.push(newTicket);
    
    // Si hay un mensaje inicial, añadirlo
    if (params.initialMessage) {
      mockMessages.push({
        id: uuidv4(),
        ticketId,
        content: params.initialMessage,
        isFromUser: true,
        timestamp: now
      });
    }
    
    return newTicket;
  },

  // Añadir un mensaje a un ticket
  addMessage: async (params: AddMessageParams): Promise<SupportTicketMessage> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const ticket = mockTickets.find(t => t.id === params.ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    // Actualizar el ticket
    ticket.updatedAt = new Date();
    if (!params.isFromUser && params.agentId) {
      ticket.lastAgentId = params.agentId;
      ticket.lastAgentName = params.agentName;
      ticket.status = 'in_progress';
    }
    
    // Crear el mensaje
    const newMessage: SupportTicketMessage = {
      id: uuidv4(),
      ticketId: params.ticketId,
      content: params.content,
      isFromUser: params.isFromUser,
      agentId: params.agentId,
      agentName: params.agentName,
      timestamp: new Date()
    };
    
    mockMessages.push(newMessage);
    
    return newMessage;
  },

  // Obtener un ticket por ID
  getTicket: async (ticketId: string): Promise<SupportTicket | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockTickets.find(t => t.id === ticketId) || null;
  },

  // Obtener tickets de un usuario
  getUserTickets: async (userId: string): Promise<SupportTicket[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockTickets.filter(t => t.userId === userId);
  },

  // Obtener mensajes de un ticket
  getTicketMessages: async (ticketId: string): Promise<SupportTicketMessage[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockMessages.filter(m => m.ticketId === ticketId);
  },

  // Actualizar el estado de un ticket
  updateTicketStatus: async (ticketId: string, status: 'open' | 'in_progress' | 'closed'): Promise<SupportTicket> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    ticket.status = status;
    ticket.updatedAt = new Date();
    
    return ticket;
  },

  // Actualizar la prioridad de un ticket
  updateTicketPriority: async (ticketId: string, priority: 'low' | 'medium' | 'high'): Promise<SupportTicket> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    
    ticket.priority = priority;
    ticket.updatedAt = new Date();
    
    return ticket;
  }
}; 