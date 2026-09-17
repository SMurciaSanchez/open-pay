import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Definición de los colores principales
const colors = {
  primary: '#3B82F6', // Azul OpenPay
  primaryDark: '#1D4ED8',
  primaryLight: '#93C5FD',
  secondary: '#10B981', // Verde para acciones positivas
  secondaryDark: '#047857',
  secondaryLight: '#6EE7B7',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
  disabled: '#9CA3AF',
};

// Extensión del tema por defecto de Material Design 3
export const theme: MD3Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryLight,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: colors.text,
    outline: colors.border,
  },
  // Personalizar bordes redondeados
  roundness: 8,
};

// Exportar colores para uso en la aplicación
export const appColors = {
  ...colors,
  primaryGradient: [colors.primary, colors.primaryDark],
  secondaryGradient: [colors.secondary, colors.secondaryDark],
};

// Espaciado consistente
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Tamaños de texto
export const textSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

// Estilos para sombras
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
}; 