# Guía de Inicio Rápido - App Móvil OpenPay

Esta guía proporciona los pasos esenciales para comenzar a desarrollar la aplicación móvil OpenPay de forma inmediata.

## 1. Preparación Inicial (5-10 minutos)

```bash
# Navegar al directorio del proyecto
cd packages/mobile

# Instalar dependencias
npm install
```

## 2. Configuración de React Native (15-20 minutos)

### Android
```bash
# Asegúrate de tener ANDROID_HOME configurado correctamente
echo $ANDROID_HOME

# Iniciar el emulador de Android desde la línea de comandos
emulator -avd [nombre_del_avd]

# O desde Android Studio > AVD Manager > Play
```

### iOS (solo macOS)
```bash
# Navegar al directorio de iOS e instalar pods
cd ios && pod install && cd ..

# Abrir el proyecto en Xcode
open ios/OpenPayMobile.xcworkspace
```

## 3. Iniciar el Desarrollo (2 minutos)

```bash
# Iniciar Metro Bundler
npm start

# En otra terminal, ejecutar en Android
npm run android

# O en iOS (solo macOS)
npm run ios
```

## 4. Componentes Principales

### Estructura de Archivos Clave

```
src/
  ├── api/apiClient.ts           # Cliente API
  ├── services/AuthService.ts    # Servicio de autenticación
  ├── context/AuthContext.tsx    # Contexto de autenticación
  ├── navigation/AppNavigator.tsx # Navegación principal
  ├── theme/theme.ts             # Configuración de tema
  └── App.tsx                    # Punto de entrada
```

### Archivos por Implementar (Prioritarios)

1. `src/screens/auth/LoginScreen.tsx`
2. `src/screens/auth/RegisterScreen.tsx`
3. `src/screens/dashboard/DashboardScreen.tsx`

## 5. Flujo de Autenticación

Para implementar el flujo de autenticación, utiliza el contexto ya configurado:

```tsx
import { useAuth } from '../../context/AuthContext';

const LoginScreen = () => {
  const { signIn } = useAuth();
  
  const handleLogin = async () => {
    const result = await signIn(email, password);
    // Manejar resultado
  };
  
  // Implementar UI...
};
```

## 6. Conexión con API

El cliente API ya está configurado con interceptores para manejo de tokens:

```tsx
import { apiClient } from '../../api/apiClient';

// Ejemplo de uso
const fetchData = async () => {
  try {
    const data = await apiClient.get('/endpoint');
    // Procesar datos
  } catch (error) {
    // Manejar error
  }
};
```

## 7. Biometría

Para implementar autenticación biométrica:

```tsx
import { useAuth } from '../../context/AuthContext';

const { signInWithBiometrics, isBiometricAvailable } = useAuth();

// Verificar disponibilidad
const checkBiometrics = async () => {
  const available = await isBiometricAvailable();
  if (available) {
    // Mostrar botón de biometría
  }
};

// Autenticar con biometría
const handleBiometricLogin = async () => {
  const result = await signInWithBiometrics();
  if (result.success) {
    // Navegación exitosa
  } else {
    // Mostrar error
  }
};
```

## 8. Navegación

La navegación ya está configurada en `AppNavigator.tsx`. Para navegar entre pantallas:

```tsx
import { useNavigation } from '@react-navigation/native';

const screen = () => {
  const navigation = useNavigation();
  
  // Navegar a otra pantalla
  const goToNextScreen = () => {
    navigation.navigate('ScreenName', { param1: 'value' });
  };
  
  // Implementar UI...
};
```

## 9. Consejos para Desarrollo Rápido

1. **Uso del tema**: Utiliza los colores y estilos definidos en `theme.ts` para mantener consistencia.
   ```tsx
   import { appColors, spacing } from '../../theme/theme';
   
   // Ejemplo
   <View style={{ backgroundColor: appColors.primary, padding: spacing.md }} />
   ```

2. **Hot Reload**: React Native tiene hot reload por defecto, pero puedes presionar `r` en el terminal de Metro para forzar un reload.

3. **Limpieza de caché**: Si hay problemas extraños, prueba:
   ```bash
   npm start -- --reset-cache
   ```

4. **Registro de Servicios**: Todos los servicios siguen el patrón Singleton, accede a ellos con:
   ```tsx
   const authService = AuthService.getInstance();
   ```

## 10. Recursos Útiles

- [Documentación de React Native](https://reactnative.dev/docs/getting-started)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

---

**Próximos pasos recomendados:**

1. Implementar `LoginScreen.tsx` y `RegisterScreen.tsx`
2. Crear componentes UI comunes en `src/components`
3. Implementar pantalla de dashboard básica

¡Buena suerte con el desarrollo! 

---

© 2025 OpenPay. Todos los derechos reservados.

Este software es propiedad intelectual de Sebastián Murcia y Sebastián Díaz. No está permitido su uso sin autorización explícita. 