# OpenPay Mobile App

Aplicación móvil para OpenPay desarrollada con React Native, que permite a los usuarios gestionar sus finanzas desde dispositivos iOS y Android.

## Características principales

- Autenticación segura con soporte para biometría
- Dashboard con balance y transacciones recientes
- Envío y recepción de dinero
- Pagos de servicios
- Notificaciones push
- Gestión de perfil y seguridad

## Requisitos

- Node.js 16 o superior
- JDK 11 o superior (para Android)
- Android Studio (para desarrollo en Android)
- Xcode (para desarrollo en iOS, solo macOS)
- CocoaPods (para iOS)

## Configuración del entorno

Sigue la guía oficial de React Native para configurar el entorno de desarrollo:
[https://reactnative.dev/docs/environment-setup](https://reactnative.dev/docs/environment-setup)

## Instalación

```bash
# Instalar dependencias
npm install

# Para iOS, instalar pods (solo macOS)
cd ios && pod install && cd ..
```

## Ejecución

```bash
# Iniciar Metro Bundler
npm start

# Ejecutar en Android
npm run android

# Ejecutar en iOS (solo macOS)
npm run ios
```

## Estructura del proyecto

```
/src
  /api              # Cliente API y endpoints
  /assets           # Imágenes, fuentes, etc.
  /components       # Componentes UI reutilizables
  /context          # Providers de contexto (auth, theme, etc.)
  /hooks            # Hooks personalizados
  /navigation       # Configuración de navegación
  /screens          # Pantallas de la aplicación
  /services         # Servicios de lógica de negocio
  /theme            # Configuración de tema
  /types            # Definiciones de tipos TypeScript
  /utils            # Funciones utilitarias
  App.tsx           # Punto de entrada
```

## Seguridad

La aplicación implementa varias medidas de seguridad:

- Autenticación basada en tokens JWT
- Almacenamiento seguro de credenciales usando Keychain
- Soporte para autenticación biométrica (FaceID, TouchID, huella)
- Expiración de sesiones
- Protección contra captura de pantalla para información sensible

## Flujo de trabajo de desarrollo

1. Trabaja en una rama separada para cada funcionalidad
2. Sigue las convenciones de código y estilo
3. Escribe pruebas unitarias para la lógica de negocio
4. Crea PRs para revisión de código

## Comandos útiles

```bash
# Limpiar caché de Metro
npm start -- --reset-cache

# Ejecutar pruebas
npm test

# Analizar código
npm run lint

# Generar build de producción para Android
cd android && ./gradlew assembleRelease
```

## Integración con APIs

La aplicación se comunica con el backend de OpenPay a través de la API RESTful. El cliente API está configurado para usar tokens de autenticación y manejar renovación automática de tokens expirados.

## Solución de problemas comunes

1. **Error "Unable to resolve module..."** - Reinicia Metro Bundler con la opción --reset-cache.
2. **Problemas con iOS pods** - Elimina la carpeta Pods, el archivo Podfile.lock y vuelve a ejecutar pod install.
3. **Problemas con Android builds** - Limpia el proyecto con `cd android && ./gradlew clean`.

## Recursos adicionales

- [Documentación de React Native](https://reactnative.dev/docs/getting-started)
- [Documentación de React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper (UI)](https://callstack.github.io/react-native-paper/)

---

## Licencia

© 2025 OpenPay. Todos los derechos reservados.

Este software es propiedad intelectual de Sebastián Murcia y Sebastián Díaz. No está permitido su uso sin autorización explícita.

Para más información sobre los términos de licencia, consulte el archivo [LICENSE.md](./LICENSE.md) incluido en este repositorio. 