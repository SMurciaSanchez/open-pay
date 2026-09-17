import { supabase } from '../supabase';

// Tipos
export interface AuthError {
  message: string;
  status?: number;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any | null;
  session: any | null;
  error: AuthError | null;
}

// Funciones de autenticación
export const signUp = async ({ email, password }: UserCredentials): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message,
          status: error.status || 400
        }
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error: any) {
    return {
      user: null,
      session: null,
      error: {
        message: error.message || 'Error desconocido durante el registro',
        status: 500
      }
    };
  }
};

export const signIn = async ({ email, password }: UserCredentials): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: {
          message: error.message,
          status: error.status || 400
        }
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error: any) {
    return {
      user: null,
      session: null,
      error: {
        message: error.message || 'Error desconocido durante el inicio de sesión',
        status: 500
      }
    };
  }
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status || 400
        }
      };
    }

    return { error: null };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Error desconocido al cerrar sesión',
        status: 500
      }
    };
  }
};

export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status || 400
        }
      };
    }

    return { error: null };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Error al enviar el correo de recuperación',
        status: 500
      }
    };
  }
};

export const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    
    if (error) {
      return {
        error: {
          message: error.message,
          status: error.status || 400
        }
      };
    }

    return { error: null };
  } catch (error: any) {
    return {
      error: {
        message: error.message || 'Error al actualizar la contraseña',
        status: 500
      }
    };
  }
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
};

// Hook para escuchar cambios en la autenticación
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}; 