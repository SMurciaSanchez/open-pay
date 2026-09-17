# Guía de Despliegue en Vercel para OpenPay

Esta guía te ayudará a desplegar tu aplicación OpenPay en Vercel, utilizando la base de datos ya configurada en Supabase.

## Requisitos previos

Antes de comenzar el despliegue, asegúrate de que:

1. Ya has configurado Supabase completamente siguiendo las instrucciones en `INSTRUCCIONES_SUPABASE.md`
2. Has ejecutado todos los scripts SQL necesarios
3. Has probado la conexión con Supabase localmente
4. Tienes una cuenta en [Vercel](https://vercel.com)
5. Tienes acceso al repositorio de código de la aplicación en GitHub, GitLab o Bitbucket

## Paso 1: Preparación del código para producción

1. Asegúrate de que tu `package.json` tiene los scripts correctos:

```json
"scripts": {
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint"
}
```

2. Crea un archivo `.env.example` (sin valores sensibles) para referencia:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Database
DATABASE_URL=

# App Config
NEXT_PUBLIC_APP_URL=
```

3. Asegúrate de que tu archivo `.gitignore` contiene:
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## Paso 2: Configuración en Vercel

1. Inicia sesión en [Vercel](https://vercel.com)
2. Haz clic en "Add New" > "Project"
3. Importa tu repositorio de Git
4. Configuración del proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/web` (si estás usando un monorepo)
   - **Build Command**: `npm run build` (o el comando correspondiente según tu package manager)
   - **Output Directory**: `.next` (o el que uses)

5. En la sección "Environment Variables", añade las siguientes variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://garzwhnenhtmpfvfntmk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_ANON_KEY>
DATABASE_URL=postgresql://postgres:[TU-CONTRASEÑA]@db.garzwhnenhtmpfvfntmk.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=https://nombre-de-tu-app.vercel.app
```

Nota: Reemplaza `{TU_CONTRASEÑA}` con la contraseña real de tu base de datos y ajusta la URL según el nombre que elijas para tu proyecto en Vercel.

6. Haz clic en "Deploy" y espera a que se complete el despliegue

## Paso 3: Configuración de autenticación

1. Una vez desplegada la aplicación, obtén la URL de producción (ej: `https://openpay-app.vercel.app`)

2. Ve a tu proyecto en Supabase > Authentication > URL Configuration

3. Actualiza las siguientes configuraciones:
   - **Site URL**: URL de tu aplicación en Vercel
   - **Redirect URLs**: Añade las siguientes URLs:
     ```
     https://openpay-app.vercel.app/auth/callback
     https://openpay-app.vercel.app/auth/reset-password
     ```
     (Reemplaza `openpay-app.vercel.app` con tu dominio real en Vercel)

## Paso 4: Configuración de dominio personalizado (opcional)

Si deseas usar un dominio personalizado:

1. En Vercel, ve a tu proyecto > Settings > Domains
2. Haz clic en "Add" e introduce tu dominio
3. Sigue las instrucciones para verificar la propiedad y configurar los registros DNS
4. Una vez configurado el dominio, actualiza también la URL del sitio en Supabase

## Paso 5: Verificación post-despliegue

Después del despliegue, verifica:

1. Que puedes acceder a la aplicación en la URL de Vercel
2. Que el registro e inicio de sesión funcionan correctamente
3. Que puedes ver y crear datos (perfiles, cuentas, transacciones)
4. Que las políticas de seguridad RLS funcionan correctamente

## Paso 6: Configuración de CI/CD (opcional)

Para automatizar futuros despliegues:

1. Crea un archivo `.github/workflows/deploy.yml` (si usas GitHub):

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./packages/web
```

2. Configura los secrets necesarios en GitHub:
   - `VERCEL_TOKEN`: Genera un token en Vercel > Settings > Tokens
   - `ORG_ID`: ID de tu organización en Vercel
   - `PROJECT_ID`: ID de tu proyecto en Vercel

## Problemas comunes y soluciones

### Error de conexión a la base de datos

Si el despliegue falla con errores de conexión a la base de datos:

1. Verifica que la URL de la base de datos es correcta
2. Asegúrate de que la IP del servidor de Vercel está en la lista de permitidos en Supabase
3. Confirma que la contraseña es correcta

### Errores de autenticación

Si los usuarios no pueden iniciar sesión:

1. Verifica que las URLs de redirección están correctamente configuradas en Supabase
2. Asegúrate de que las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están correctamente configuradas en Vercel

### Problemas con el cliente de Prisma

Si hay errores relacionados con Prisma:

1. Asegúrate de que el script de build incluye `prisma generate`
2. Verifica que la variable `DATABASE_URL` está correctamente configurada

## Recursos adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)

## Contacto para soporte

Si encuentras problemas durante el despliegue, contacta a:

- Desarrollador principal: [tu-email@ejemplo.com]
- Administrador de Supabase: [admin@ejemplo.com] 