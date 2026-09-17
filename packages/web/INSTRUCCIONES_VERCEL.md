# Instrucciones para desplegar OpenPay en Vercel

Este documento te guiará por el proceso de despliegue de la aplicación OpenPay en Vercel.

## Requisitos previos

Antes de comenzar el despliegue, asegúrate de haber completado los siguientes pasos:

1. ✅ Configuración de Supabase completada
2. ✅ Tablas en Supabase creadas (ejecutando el script SQL)
3. ✅ Datos de prueba insertados (siguiendo INSTRUCCIONES_DATOS_PRUEBA.md)
4. ✅ Proyecto subido a un repositorio en GitHub

## Paso 1: Crear una cuenta en Vercel

Si aún no tienes una cuenta en Vercel:

1. Ve a [Vercel](https://vercel.com/) y regístrate
2. Puedes acceder con tu cuenta de GitHub o crear una cuenta nueva

## Paso 2: Importar tu proyecto

1. En el dashboard de Vercel, haz clic en "Add New..." y selecciona "Project"
2. Conecta tu cuenta de GitHub si aún no lo has hecho
3. Selecciona el repositorio de OpenPay
4. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web`
   - **Build Command**: `next build`
   - **Output Directory**: `.next`

## Paso 3: Configurar variables de entorno

Añade las siguientes variables de entorno en la sección "Environment Variables":

```
NEXT_PUBLIC_SUPABASE_URL=https://garzwhnenhtmpfvfntmk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_ANON_KEY>
NEXT_PUBLIC_API_URL=https://tu-api-backend.com  # Si usas la API Flask (opcional)
```

## Paso 4: Desplegar

1. Haz clic en "Deploy"
2. Vercel comenzará el proceso de construcción y despliegue
3. Esto puede tardar unos minutos, dependiendo del tamaño del proyecto

## Paso 5: Revisar el despliegue

Una vez completado el despliegue:

1. Vercel te proporcionará una URL para tu aplicación (ej: openpay-xyz123.vercel.app)
2. Abre la URL en tu navegador para verificar que la aplicación funcione correctamente
3. Prueba el inicio de sesión con las credenciales que has creado (sebasms777@gmail.com)
4. Verifica que puedas ver los datos de prueba en la aplicación

## Paso 6: Configurar dominio personalizado (opcional)

Para un entorno de producción, es recomendable usar un dominio personalizado:

1. En el dashboard de Vercel, selecciona tu proyecto
2. Ve a la pestaña "Settings" > "Domains"
3. Añade tu dominio personalizado (ej: openpay.co)
4. Sigue las instrucciones de Vercel para configurar los registros DNS

## Paso 7: Configurar entornos de desarrollo y producción

Para un flujo de trabajo profesional, configura distintos entornos:

1. **Producción**: La rama `main` se despliega automáticamente en tu dominio principal
2. **Desarrollo**: Las ramas de función (`feature/*`) crean despliegues de vista previa
3. **Staging**: Configura la rama `develop` para desplegar en un subdominio de staging

## Monitoreo y rendimiento

Después del despliegue:

1. Utiliza la pestaña "Analytics" de Vercel para monitorear:
   - Tiempos de carga de página
   - Rendimiento en dispositivos móviles
   - Web Vitals y métricas de usuario real

2. Configura alertas para errores:
   - Integra con Sentry para monitoreo de errores en tiempo real
   - Configura webhooks de Vercel para notificaciones de despliegue

## Escalamiento con Vercel

A medida que tu aplicación crezca:

1. Considera actualizar a un plan de equipo o empresa de Vercel
2. Implementa una estrategia de caché para mejorar el rendimiento:
   - Utiliza ISR (Incremental Static Regeneration) para páginas semi-dinámicas
   - Configura Cache-Control headers apropiadamente
   - Utiliza SWR o React Query para cacheo de datos del lado del cliente

## Siguientes pasos

Una vez que tu aplicación esté desplegada:

1. Configura un pipeline de CI/CD (GitHub Actions o Vercel)
2. Implementa pruebas automáticas antes del despliegue
3. Configura monitorización y alertas para la aplicación en producción
4. Mantén actualizadas las dependencias y frameworks regularmente 