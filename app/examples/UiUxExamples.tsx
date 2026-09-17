import React, { useState, useEffect, lazy, Suspense } from 'react';
import UserFeedback from '../components/UserFeedback';
import AccessibleDropdown from '../components/AccessibleDropdown';
import analytics from '../services/AnalyticsService';
import { useThrottledState, useDeferredRender, useIntersectionObserver } from '../hooks/useOptimizedRender';

// Lazy loading de componentes pesados
const HeavyComponent = lazy(() => import('./HeavyComponent'));

/**
 * Componente que muestra ejemplos de implementación de las mejoras de UI/UX
 * propuestas en el plan de mejoras.
 */
export const UiUxExamples: React.FC = () => {
  // Estado para los ejemplos
  const [isHeavyComponentVisible, setIsHeavyComponentVisible] = useState(false);
  const [selectedValue, setSelectedValue] = useState('option1');
  
  // 1. Ejemplo de estado throttled para evitar re-renderizados excesivos
  const [searchQuery, setSearchQuery] = useThrottledState('', 500);
  
  // 2. Ejemplo de renderizado diferido para mejorar tiempo inicial de carga
  const shouldRenderHeavy = useDeferredRender(isHeavyComponentVisible, 300);
  
  // 3. Ejemplo de Intersection Observer para lazy loading
  const [lazyRef, isInView] = useIntersectionObserver();
  
  // 4. Tracking de analytics
  useEffect(() => {
    // Inicializar analytics
    analytics.init({
      userId: 'user-123',
      debug: true
    });
    
    // Registrar vista de página
    analytics.trackPageView('UI/UX Examples');
    
    return () => {
      // Ejemplo de registro de evento al salir
      analytics.trackEvent('example_page_exit', {
        timeSpent: Date.now() - performance.now()
      });
    };
  }, []);
  
  // Opciones para el dropdown accesible
  const dropdownOptions = [
    { id: '1', value: 'option1', label: 'Opción 1' },
    { id: '2', value: 'option2', label: 'Opción 2' },
    { id: '3', value: 'option3', label: 'Opción 3' },
    { id: '4', value: 'option4', label: 'Opción 4' },
    { id: '5', value: 'option5', label: 'Opción 5' },
  ];

  // Ejemplo de manejo de errores con tracking
  const handleErrorExample = () => {
    try {
      // Simulación de error
      throw new Error('Ejemplo de error controlado');
    } catch (error) {
      // Registro del error en analytics
      analytics.trackError(
        'example_error',
        error instanceof Error ? error.message : 'Error desconocido',
        error instanceof Error ? error.stack : undefined,
        'UiUxExamples'
      );
      
      // Mostrar al usuario
      alert('Se ha producido un error (controlado para demostración)');
    }
  };

  // Ejemplo de feedback
  const handleFeedbackSubmit = (data: any) => {
    // Registro del feedback en analytics
    analytics.trackFeedback(
      data.rating,
      data.category,
      'comment',
      data.feedback
    );
    
    console.log('Feedback enviado:', data);
    alert('¡Gracias por tu feedback!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Ejemplos de Mejoras UI/UX</h1>
      
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">1. Optimización de Renderizado</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="mb-4">Búsqueda throttled (limitada a una actualización cada 500ms):</p>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-4 py-2"
            placeholder="Escribe para buscar..."
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Campo de búsqueda con throttle"
          />
          <p className="text-sm text-gray-500 mt-2">
            Valor actual: "{searchQuery}" 
            <br />
            <span className="italic">
              (El estado se actualiza con límite de frecuencia para evitar renderizados excesivos)
            </span>
          </p>
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">2. Accesibilidad Mejorada</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="mb-4">Dropdown completamente accesible:</p>
          <AccessibleDropdown
            id="example-dropdown"
            label="Selecciona una opción"
            options={dropdownOptions}
            value={selectedValue}
            onChange={setSelectedValue}
            required={true}
          />
          <p className="text-sm text-gray-500 mt-4">
            Prueba a navegar con el teclado (Tab, Flechas, Enter, Escape)
            <br />
            Cumple con WCAG 2.1 y funciona con lectores de pantalla
          </p>
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">3. Lazy Loading de Componentes</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="mb-4">Carga diferida de componentes pesados:</p>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setIsHeavyComponentVisible(v => !v)}
          >
            {isHeavyComponentVisible ? 'Ocultar' : 'Mostrar'} componente pesado
          </button>
          
          {isHeavyComponentVisible && shouldRenderHeavy && (
            <div className="mt-4 border border-gray-200 rounded p-4">
              <Suspense fallback={<div>Cargando componente...</div>}>
                <HeavyComponent />
              </Suspense>
            </div>
          )}
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">4. Detector de Visibilidad</h2>
        <div 
          ref={lazyRef as React.RefObject<HTMLDivElement>} 
          className="bg-white shadow rounded-lg p-6 mt-10"
        >
          <p className="mb-4">
            {isInView 
              ? '✅ Este componente está visible en la ventana' 
              : '❌ Este componente no está visible en la ventana (scrollea para verlo)'}
          </p>
          <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
            {isInView && (
              <div className="text-center animate__animated animate__fadeIn">
                <p className="text-lg font-bold">¡Contenido cargado cuando es visible!</p>
                <p className="text-sm text-gray-500">
                  Útil para imágenes, iframes y contenido pesado
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">5. Captura de Eventos y Errores</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="mb-4">Manejo de errores con tracking:</p>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={handleErrorExample}
          >
            Simular error
          </button>
          <p className="text-sm text-gray-500 mt-2">
            (El error se registrará en analytics antes de mostrar al usuario)
          </p>
        </div>
      </section>
      
      {/* Componente de feedback */}
      <UserFeedback
        onSubmit={handleFeedbackSubmit}
        onClose={() => console.log('Feedback cerrado')}
      />
      
      <p className="text-center text-gray-500 text-sm mt-10">
        © 2025 OpenPay. Todos los derechos reservados.
      </p>
    </div>
  );
};

// Archivo stub para el componente pesado (en realidad estaría en su propio archivo)
const HeavyComponent = () => (
  <div>
    <p>Este componente simula una carga pesada.</p>
    <p>En un escenario real, podría ser una tabla de datos, un gráfico complejo, o un editor.</p>
  </div>
);

export default UiUxExamples; 