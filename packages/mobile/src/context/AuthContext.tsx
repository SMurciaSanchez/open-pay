import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { getOrCreateProfile, supabase } from '../lib/supabase';
import { AuthService } from '../services/AuthService';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  isLoading: boolean;
  isSignedIn: boolean;
  user: UserInfo | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
  isBiometricAvailable: () => Promise<boolean>;
  isBiometricEnabled: () => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const authService = AuthService.getInstance();
  const provisionedRef = useRef<string | null>(null);

  useEffect(() => {
    // Garantiza que Profile + Account existan para el user autenticado.
    // getOrCreateProfile es idempotente. Se llama por id único para no repetir
    // en cada refresh de token que emite onAuthStateChange.
    const provision = (s: Session | null) => {
      const uid = s?.user?.id;
      if (!uid || provisionedRef.current === uid) return;
      provisionedRef.current = uid;
      getOrCreateProfile().catch(err => {
        console.error('getOrCreateProfile failed:', err);
        provisionedRef.current = null;
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      provision(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
      provision(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userInfo: UserInfo | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
        email: session.user.email || '',
        avatar: session.user.user_metadata?.avatar_url,
      }
    : null;

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await authService.login({ email, password });
    setIsLoading(false);
    return result;
  };

  const signUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    const result = await authService.register({ name, email, password });
    setIsLoading(false);
    return result;
  };

  const signOut = async () => {
    setIsLoading(true);
    await authService.logout();
    setIsLoading(false);
  };

  const signInWithBiometrics = async () => {
    setIsLoading(true);
    const result = await authService.loginWithBiometric();
    setIsLoading(false);
    return result;
  };

  return (
    <AuthContext.Provider value={{
      isLoading,
      isSignedIn: !!session,
      user: userInfo,
      session,
      signIn,
      signOut,
      signUp,
      signInWithBiometrics,
      isBiometricAvailable: () => authService.isBiometricAvailable(),
      isBiometricEnabled: () => authService.isBiometricEnabled(),
      enableBiometric: () => authService.enableBiometric(),
      disableBiometric: () => authService.disableBiometric(),
    }}>
      {children}
    </AuthContext.Provider>
  );
};
