/**
 * Servicio de Analytics para OpenPay
 * 
 * Este servicio proporciona funciones para registrar eventos de usuario y métricas
 * para analizar el comportamiento y la experiencia del usuario.
 */

export interface AnalyticsEvent {
  eventName: string;
  timestamp: string;
  userId?: string;
  sessionId: string;
  properties?: Record<string, any>;
}

export interface PageViewEvent extends AnalyticsEvent {
  eventName: 'page_view';
  properties: {
    pageName: string;
    pageUrl: string;
    referrer?: string;
    loadTime?: number;
  };
}

export interface UserActionEvent extends AnalyticsEvent {
  eventName: 'user_action';
  properties: {
    actionType: 'click' | 'submit' | 'view' | 'select';
    elementId?: string;
    elementType?: string;
    actionValue?: string;
  };
}

export interface PerformanceEvent extends AnalyticsEvent {
  eventName: 'performance';
  properties: {
    metricName: string;
    value: number;
    unit: 'ms' | 'count' | 'percentage';
  };
}

export interface FeedbackEvent extends AnalyticsEvent {
  eventName: 'feedback';
  properties: {
    rating: number;
    category: string;
    feedbackType: 'rating' | 'comment' | 'report';
    feedbackText?: string;
  };
}

export interface ErrorEvent extends AnalyticsEvent {
  eventName: 'error';
  properties: {
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    componentName?: string;
  };
}

class AnalyticsService {
  private apiEndpoint: string;
  private sessionId: string;
  private initialized: boolean = false;
  private userId?: string;
  private buffer: AnalyticsEvent[] = [];
  private flushInterval?: number;
  private debugMode: boolean = false;

  constructor(apiEndpoint: string = '/api/analytics') {
    this.apiEndpoint = apiEndpoint;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Inicializa el servicio de analytics
   */
  public init(config: {
    userId?: string;
    flushIntervalMs?: number;
    debug?: boolean;
  } = {}): void {
    const { userId, flushIntervalMs = 10000, debug = false } = config;
    
    if (this.initialized) {
      return;
    }

    this.userId = userId;
    this.debugMode = debug;
    
    // Configurar envío de eventos en lotes
    if (flushIntervalMs > 0) {
      this.flushInterval = window.setInterval(() => {
        this.flush();
      }, flushIntervalMs);
    }

    // Registrar eventos de rendimiento
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.trackPerformanceMetrics();
    }

    // Registrar evento de sesión iniciada
    this.trackEvent('session_start', {
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    this.initialized = true;
    this.log('Analytics service initialized');
  }

  /**
   * Registra un evento genérico
   */
  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      eventName,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      properties
    };

    this.buffer.push(event);
    this.log(`Event tracked: ${eventName}`, properties);

    // Si el buffer tiene demasiados eventos, hacer flush
    if (this.buffer.length >= 20) {
      this.flush();
    }
  }

  /**
   * Registra una vista de página
   */
  public trackPageView(pageName: string, pageUrl: string = window.location.href): void {
    const loadTime = performance.now();
    
    this.trackEvent('page_view', {
      pageName,
      pageUrl,
      referrer: document.referrer,
      loadTime: Math.round(loadTime)
    });
  }

  /**
   * Registra interacciones del usuario
   */
  public trackUserAction(
    actionType: 'click' | 'submit' | 'view' | 'select',
    elementId?: string,
    elementType?: string,
    actionValue?: string
  ): void {
    this.trackEvent('user_action', {
      actionType,
      elementId,
      elementType,
      actionValue
    });
  }

  /**
   * Registra feedback del usuario
   */
  public trackFeedback(
    rating: number,
    category: string,
    feedbackType: 'rating' | 'comment' | 'report' = 'rating',
    feedbackText?: string
  ): void {
    this.trackEvent('feedback', {
      rating,
      category,
      feedbackType,
      feedbackText
    });
  }

  /**
   * Registra errores de la aplicación
   */
  public trackError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string,
    componentName?: string
  ): void {
    this.trackEvent('error', {
      errorType,
      errorMessage,
      stackTrace,
      componentName
    });
  }

  /**
   * Registra métricas de rendimiento
   */
  private trackPerformanceMetrics(): void {
    // Registrar métricas de carga de página
    window.addEventListener('load', () => {
      if (performance && performance.timing) {
        const { timing } = performance;
        
        // Tiempo de carga del documento
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        this.trackEvent('performance', {
          metricName: 'page_load_time',
          value: loadTime,
          unit: 'ms'
        });
        
        // Tiempo hasta interactivo
        const timeToInteractive = timing.domInteractive - timing.navigationStart;
        this.trackEvent('performance', {
          metricName: 'time_to_interactive',
          value: timeToInteractive,
          unit: 'ms'
        });
      }
    });

    // Registrar métricas de Core Web Vitals si están disponibles
    if ('web-vitals' in window) {
      // Nota: Se necesita importar la librería web-vitals para usar estos métodos
      // Esto es solo un ejemplo de cómo se integraría
      try {
        // @ts-ignore - Solo una demostración, en realidad requiere la librería
        import('web-vitals').then(({ getCLS, getFID, getLCP }) => {
          getCLS(({ value }) => {
            this.trackEvent('performance', {
              metricName: 'cumulative_layout_shift',
              value,
              unit: 'count'
            });
          });
          
          getFID(({ value }) => {
            this.trackEvent('performance', {
              metricName: 'first_input_delay',
              value,
              unit: 'ms'
            });
          });
          
          getLCP(({ value }) => {
            this.trackEvent('performance', {
              metricName: 'largest_contentful_paint',
              value,
              unit: 'ms'
            });
          });
        });
      } catch (err) {
        this.log('Error loading web-vitals', err);
      }
    }
  }

  /**
   * Envía todos los eventos acumulados al servidor
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    try {
      this.log(`Flushing ${events.length} events`);
      
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events }),
        // Si el usuario abandona la página, intentar enviar de todos modos
        keepalive: true
      });
    } catch (error) {
      this.log('Error flushing events', error);
      // Volver a añadir eventos al buffer para intentar más tarde
      this.buffer = [...events, ...this.buffer];
    }
  }

  /**
   * Genera un ID de sesión único
   */
  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, 
            v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Registra mensajes de depuración si está habilitado
   */
  private log(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[Analytics] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Libera recursos al cerrar la aplicación
   */
  public dispose(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
    this.initialized = false;
  }
}

// Exportar una instancia única
export const analyticsService = new AnalyticsService();

export default analyticsService; 