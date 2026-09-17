# Guía de Despliegue de OpenPay con Supabase, Vercel y Railway

Esta guía detalla el proceso completo para desplegar el MVP de OpenPay en producción utilizando Supabase para la base de datos, Vercel para el frontend y Railway para el backend (si es necesario).

## 1. Despliegue de la Base de Datos con Supabase

### 1.1 Preparación de Supabase

1. Accede a tu proyecto en [Supabase](https://supabase.com/dashboard) 
2. Asegúrate de que las tablas y políticas están configuradas según `SUPABASE_INIT.md`
3. Ve a Settings > API y copia las siguientes credenciales:
   - **Project URL**: URL de tu proyecto
   - **anon key**: Clave pública anónima
   - **service_role key**: Para operaciones administrativas (¡mantén esta clave segura!)

### 1.2 Preparación para producción en Supabase

1. Revisa y optimiza tus índices en Database > Tables
2. Ve a Authentication > Settings y configura:
   - **Site URL**: URL de tu sitio en producción (e.j. `https://openpay.vercel.app`)
   - **Redirect URLs**: Añade URLs válidas para redirecciones de autenticación
   - **Confirma el uso de SMTP** para correos de autenticación

## 2. Despliegue del Frontend en Vercel

### 2.1 Preparación del código

1. Asegúrate de que tu frontend está listo para producción:
   - Rutas y navegación configuradas
   - Manejo de errores implementado
   - Estilos y diseño responsivo completos

2. Crea un archivo `.env.example` en la raíz del proyecto frontend:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# API URL
NEXT_PUBLIC_API_URL=

# App
NEXT_PUBLIC_APP_URL=
```

3. Actualiza tus scripts en `package.json` para asegurar un build correcto:

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint"
}
```

### 2.2. Despliegue en Vercel

1. Inicia sesión en [Vercel](https://vercel.com/dashboard)
2. Haz clic en "New Project" e importa tu repositorio
3. Configuración del proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web` (si estás en un monorepo)
   - **Build Command**: `pnpm run build` (o el que uses)
   - **Output Directory**: `.next` (o el que uses)

4. Configura las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `NEXT_PUBLIC_APP_URL`: URL de tu aplicación (ej. `https://openpay.vercel.app`)
   - `NEXT_PUBLIC_API_URL`: URL de tu API (si usas Railway, será algo como `https://openpay-api.up.railway.app/api`)

5. Haz clic en "Deploy" y espera a que el proceso se complete

6. Una vez completo, ve a Settings > Domains para configurar un dominio personalizado

### 2.3 Optimización del despliegue en Vercel

1. Habilita ISR (Incremental Static Regeneration) para mejorar el rendimiento:

```js
// En tus páginas de Next.js
export async function getStaticProps() {
  // Fetch data
  return {
    props: { data },
    revalidate: 60 // Revalidar cada 60 segundos
  };
}
```

2. Configura la Analytics de Vercel para monitorizar el rendimiento:
   - Ve a Analytics en el dashboard del proyecto
   - Activa Web Vitals y SpeedInsights

## 3. Despliegue del Backend en Railway (opcional)

Si necesitas desplegar un backend separado (para operaciones más complejas):

### 3.1 Preparación del código

1. Estructura tu backend como un servicio separado:
   - API Routes documentadas
   - Middleware de autenticación
   - Validación de datos
   - Manejo de errores

2. Crea un archivo `.env.example` en la raíz del proyecto backend:

```
# Database
DATABASE_URL=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Security
JWT_SECRET=
JWT_EXPIRES_IN=7d

# App
FRONTEND_URL=
```

### 3.2 Despliegue en Railway

1. Inicia sesión en [Railway](https://railway.app)
2. Haz clic en "New Project" > "Deploy from GitHub repo"
3. Selecciona tu repositorio y configura:
   - **Root Directory**: Path a tu backend (si está en un monorepo)
   - **Build Command**: `npm install && npm run build` (ajusta según tu setup)
   - **Start Command**: `npm start` (ajusta según tu setup)

4. Configura las variables de entorno en Railway:
   - `DATABASE_URL`: La URL de conexión a Supabase (desde connectionstring en Supabase)
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase
   - `JWT_SECRET`: Un secreto aleatorio para firmar JWTs
   - `FRONTEND_URL`: URL de tu frontend en Vercel

5. Haz clic en "Deploy" y espera a que termine el proceso

6. Ve a Settings > Domains para configurar un dominio personalizado

## 4. Conexión entre servicios

### 4.1 Conexión Frontend-Supabase

1. Verifica que la autenticación funcione correctamente
2. Comprueba las queries RLS para asegurar que la seguridad funciona
3. Prueba los buckets de storage para avatares y documentos

### 4.2 Conexión Frontend-Backend (si aplica)

1. Asegúrate de que las peticiones CORS estén correctamente configuradas:

```js
// En tu API
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

2. Verifica que la comunicación entre servicios funcione correctamente

## 5. Configuración CI/CD

### 5.1 CI/CD en GitHub Actions

1. Crea un archivo `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Vercel Deployment
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./packages/web
```

2. Configura los secrets necesarios en GitHub:
   - `VERCEL_TOKEN`: Token de API de Vercel
   - `ORG_ID`: ID de la organización en Vercel
   - `PROJECT_ID`: ID del proyecto en Vercel

## 6. Monitoreo y Observabilidad

### 6.1 Configuración de Sentry para seguimiento de errores

1. Regístrate en [Sentry](https://sentry.io)
2. Crea un nuevo proyecto para tu aplicación
3. Instala el SDK:

```bash
npm install @sentry/nextjs
```

4. Configura Sentry en tu aplicación:

```js
// En tu _app.js o similar
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

### 6.2 Monitoreo de rendimiento

1. Configura métricas esenciales:
   - Tiempo de carga de página
   - Tiempos de respuesta API
   - Tasas de error
   - Uso de recursos

2. Implementa un dashboard para visualizar estos datos

## 7. Pruebas Finales

### 7.1 Checklist pre-lanzamiento

1. Prueba todo el flujo de usuario:
   - Registro e inicio de sesión
   - Creación de perfil y cuenta
   - Realizar transacciones
   - Pagos de servicios
   - Visualización de historiales

2. Prueba en diferentes dispositivos y navegadores
3. Verifica la accesibilidad (WCAG)
4. Realiza pruebas de carga si es posible

### 7.2 Pruebas de seguridad

1. Verifica que todos los endpoints API estén protegidos
2. Comprueba que las políticas RLS funcionan correctamente
3. Realiza pruebas básicas de penetración
4. Verifica la configuración de CORS, CSP y otros headers de seguridad

## 8. Lanzamiento

### 8.1 Estrategia de lanzamiento

1. Lanza primero a un grupo pequeño de usuarios beta
2. Recopila feedback y corrige problemas urgentes
3. Expande gradualmente a más usuarios
4. Monitorea de cerca las métricas durante las primeras semanas

### 8.2 Soporte post-lanzamiento

1. Establece un canal de soporte (email, chat, etc.)
2. Documenta los problemas comunes y sus soluciones
3. Mantén un registro de bugs y mejoras solicitadas

### 8.3 Procedimiento de rollback

En caso de problemas críticos:

1. Identifica el momento exacto de la implementación problemática
2. Usa Vercel para revertir a una versión anterior estable
3. Comunica a los usuarios sobre el problema y la solución
4. Investiga la causa raíz y soluciona antes de volver a desplegar

## 9. Respaldo y Recuperación

### 9.1 Backup de datos

1. Configura backups automáticos en Supabase
2. Verifica periódicamente que los backups se pueden restaurar
3. Documenta el procedimiento de recuperación

### 9.2 Plan de recuperación ante desastres

1. Documenta los pasos para reconstruir la aplicación desde cero
2. Mantén copias de seguridad de configuraciones importantes
3. Prueba el plan de recuperación periódicamente

## 10. Mantenimiento Continuo

### 10.1 Ciclo de actualizaciones

1. Establece un calendario regular para actualizaciones
2. Prioriza las actualizaciones de seguridad
3. Planifica mejoras basadas en el feedback de los usuarios

### 10.2 Escalabilidad

1. Monitorea el uso de recursos
2. Planifica la escalabilidad vertical u horizontal según sea necesario
3. Optimiza consultas a la base de datos y carga de la API

---

## Información adicional

### URLs importantes

- Frontend: `https://openpay.vercel.app` (o tu dominio personalizado)
- Backend API: `https://openpay-api.up.railway.app` (si aplica)
- Supabase Dashboard: `https://app.supabase.com/project/[tu-proyecto-id]`
- Repositorio: `https://github.com/[tu-usuario]/openpay`

### Contactos clave

- Desarrollador principal: tu@email.com
- Administrador de Supabase: admin@email.com
- Soporte técnico: soporte@email.com 