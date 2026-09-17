import { useCallback, useRef, useState, useEffect, DependencyList } from 'react';

/**
 * Hook personalizado para optimizar el renderizado de componentes con datos que cambian frecuentemente.
 * Limita la frecuencia de actualizaciones para evitar demasiados re-renderizados.
 * 
 * @param initialValue Valor inicial
 * @param throttleMs Tiempo mínimo entre actualizaciones en milisegundos (predeterminado: 200ms)
 * @returns [valor actual, función para actualizar el valor]
 */
export function useThrottledState<T>(initialValue: T, throttleMs: number = 200): [T, (newValue: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const lastUpdateRef = useRef<number>(0);
  const pendingValueRef = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateValue = useCallback((newValue: T) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= throttleMs) {
      // Si ha pasado suficiente tiempo, actualizar inmediatamente
      setValue(newValue);
      lastUpdateRef.current = now;
      pendingValueRef.current = null;
    } else {
      // Guardar el valor para aplicarlo después
      pendingValueRef.current = newValue;

      // Si no hay un timeout pendiente, crear uno
      if (timeoutRef.current === null) {
        timeoutRef.current = setTimeout(() => {
          if (pendingValueRef.current !== null) {
            setValue(pendingValueRef.current);
            lastUpdateRef.current = Date.now();
            pendingValueRef.current = null;
          }
          timeoutRef.current = null;
        }, throttleMs - timeSinceLastUpdate);
      }
    }
  }, [throttleMs]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, updateValue];
}

/**
 * Hook personalizado para memoizar un valor computacionalmente costoso con un tiempo de caducidad.
 * Similar a useMemo, pero el valor se recalculará después de un tiempo específico.
 * 
 * @param factory Función que calcula el valor
 * @param dependencies Lista de dependencias para recalcular el valor
 * @param expirationMs Tiempo en milisegundos hasta que el valor caduque (predeterminado: 60000ms = 1min)
 * @returns Valor memoizado
 */
export function useMemoWithExpiration<T>(
  factory: () => T,
  dependencies: DependencyList,
  expirationMs: number = 60000
): T {
  const valueRef = useRef<T | null>(null);
  const lastCalculatedRef = useRef<number>(0);
  const depsRef = useRef<DependencyList | null>(null);

  // Verificar si las dependencias han cambiado
  const depsChanged = depsRef.current === null || 
    dependencies.length !== depsRef.current.length ||
    dependencies.some((dep, i) => dep !== (depsRef.current as DependencyList)[i]);

  // Verificar si ha expirado el tiempo
  const isExpired = Date.now() - lastCalculatedRef.current > expirationMs;

  // Recalcular si las dependencias cambiaron o si expiró
  if (valueRef.current === null || depsChanged || isExpired) {
    valueRef.current = factory();
    lastCalculatedRef.current = Date.now();
    depsRef.current = dependencies;
  }

  return valueRef.current;
}

/**
 * Hook personalizado para retrasar la renderización de componentes pesados hasta que sean necesarios.
 * Útil para mejorar el tiempo de carga inicial y reducir el tiempo hasta interactivo.
 * 
 * @param shouldRender Condición que determina si el componente debe renderizarse
 * @param delayMs Retraso adicional después de que shouldRender sea true (predeterminado: 0ms)
 * @returns Boolean indicando si el componente debe renderizarse
 */
export function useDeferredRender(shouldRender: boolean, delayMs: number = 0): boolean {
  const [render, setRender] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (shouldRender && !render) {
      if (delayMs > 0) {
        timeoutRef.current = setTimeout(() => {
          setRender(true);
        }, delayMs);
      } else {
        setRender(true);
      }
    } else if (!shouldRender && render) {
      setRender(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [shouldRender, delayMs, render]);

  return render;
}

/**
 * Hook personalizado para detectar cuando un elemento es visible en el viewport.
 * Útil para implementar lazy loading de imágenes y componentes.
 * 
 * @param options Opciones para el IntersectionObserver
 * @returns [ref a asignar al elemento, boolean indicando si es visible]
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = { threshold: 0.1 }
): [React.RefObject<HTMLElement>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [elementRef, isVisible];
}

/**
 * Hook personalizado para medir el rendimiento de un componente.
 * Registra el tiempo de renderizado y los re-renderizados.
 * 
 * @param componentName Nombre del componente para identificación
 * @param enabled Si está habilitado el seguimiento (predeterminado: true)
 */
export function useRenderPerformance(componentName: string, enabled: boolean = true): void {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    const renderTime = performance.now() - startTimeRef.current;

    // Solo registrar después del montaje inicial y re-renderizados
    if (renderCountRef.current > 1) {
      console.log(
        `[Performance] ${componentName} re-rendered (count: ${renderCountRef.current - 1}, time: ${renderTime.toFixed(2)}ms)`
      );
    }

    return () => {
      startTimeRef.current = performance.now();
    };
  });

  // Registrar tiempo de montaje
  useEffect(() => {
    if (!enabled) return;

    const mountTime = performance.now() - startTimeRef.current;
    console.log(`[Performance] ${componentName} mounted in ${mountTime.toFixed(2)}ms`);

    return () => {
      console.log(`[Performance] ${componentName} unmounted (total renders: ${renderCountRef.current})`);
    };
  }, [componentName, enabled]);
}

export default {
  useThrottledState,
  useMemoWithExpiration,
  useDeferredRender,
  useIntersectionObserver,
  useRenderPerformance
}; 