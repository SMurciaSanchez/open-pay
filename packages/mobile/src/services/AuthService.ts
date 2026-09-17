import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  public async register(data: RegisterData): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.name } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  public async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  public async isBiometricAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return LocalAuthentication.isEnrolledAsync();
  }

  public async isBiometricEnabled(): Promise<boolean> {
    const val = await AsyncStorage.getItem('biometric_enabled');
    return val === 'true';
  }

  public async enableBiometric(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.refresh_token) return false;
      await SecureStore.setItemAsync('openpay_biometric_token', session.refresh_token);
      await AsyncStorage.setItem('biometric_enabled', 'true');
      return true;
    } catch {
      return false;
    }
  }

  public async disableBiometric(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync('openpay_biometric_token');
      await AsyncStorage.removeItem('biometric_enabled');
      return true;
    } catch {
      return false;
    }
  }

  public async loginWithBiometric(): Promise<{ success: boolean; error?: string }> {
    const isEnabled = await this.isBiometricEnabled();
    if (!isEnabled) return { success: false, error: 'Biometría no habilitada' };

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Inicia sesión con biometría',
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar contraseña',
    });

    if (!result.success) return { success: false, error: 'Autenticación biométrica fallida' };

    const refreshToken = await SecureStore.getItemAsync('openpay_biometric_token');
    if (!refreshToken) return { success: false, error: 'Token no encontrado' };

    const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) return { success: false, error: error.message };

    return { success: true };
  }
}
