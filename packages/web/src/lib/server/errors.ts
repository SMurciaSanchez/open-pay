/**
 * Qué parte de un error se le puede mostrar a quien hizo la petición.
 *
 * Los mensajes que escribimos nosotros en las funciones de la base (RAISE
 * EXCEPTION, código P0001) explican una regla del negocio y pasan tal cual.
 * Todo lo demás —nombres de tablas y columnas, direcciones internas, la URL del
 * nodo con su clave— se queda en el registro del servidor.
 */

export interface PublicError {
  mensaje: string;
  status: number;
}

const SIN_PERMISO: PublicError = { mensaje: 'Tu rol no permite hacer esto.', status: 403 };

export function publicDbError(error: { code?: string | null; message: string }): PublicError {
  const { code, message } = error;
  if (/JWT/i.test(message)) {
    return { mensaje: 'La sesión no es válida. Vuelve a iniciar sesión.', status: 401 };
  }
  if (code === '42501' || /row-level security|permission denied/i.test(message)) return SIN_PERMISO;
  if (code === 'P0001') {
    return /^No autorizado$/i.test(message.trim()) ? SIN_PERMISO : { mensaje: message, status: 400 };
  }
  return { mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.', status: 500 };
}

/** Lo que se dice de un fallo al hablar con la cadena. Nunca la dirección del nodo. */
export function publicChainMessage(error: { shortMessage?: string; message?: string }): string {
  const corto = error.shortMessage;
  if (corto && !/https?:|wss?:/i.test(corto)) return `No se pudo anclar en la cadena: ${corto}`;
  return 'No se pudo anclar en la cadena. Inténtalo de nuevo en unos minutos.';
}
