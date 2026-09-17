# OpenPay Web — Documentación Frontend

> Stack: **Next.js 15** · **TypeScript** · **Tailwind CSS** · **Supabase** · **Framer Motion**  
> Deploy: [web-kohl-sigma-30.vercel.app](https://web-kohl-sigma-30.vercel.app)

---

## Tabla de contenidos

1. [Requisitos](#requisitos)
2. [Instalación y ejecución local](#instalación-y-ejecución-local)
3. [Variables de entorno](#variables-de-entorno)
4. [Estructura de carpetas](#estructura-de-carpetas)
5. [Rutas de la aplicación](#rutas-de-la-aplicación)
6. [Arquitectura y decisiones técnicas](#arquitectura-y-decisiones-técnicas)
7. [Autenticación](#autenticación)
8. [Base de datos](#base-de-datos)
9. [Deploy a Vercel](#deploy-a-vercel)
10. [Scripts disponibles](#scripts-disponibles)

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| Cuenta Supabase | — |
| Cuenta Vercel (deploy) | — |

---

## Instalación y ejecución local

```bash
# 1. Desde la raíz del monorepo
cd packages/web

# 2. Instalar dependencias
npm install

# 3. Crear archivo de entorno (ver sección siguiente)
cp .env.example .env.local   # si existe, o créalo manualmente

# 4. Correr en desarrollo
npm run dev
```

La app estará disponible en **http://localhost:3000**

---

## Variables de entorno

Crea el archivo `packages/web/.env.local` con:

```env
# Supabase — obligatorias
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>

# Base de datos (solo para scripts con Prisma)
DATABASE_URL=postgresql://postgres:<password>@db.<proyecto>.supabase.co:5432/postgres

# Seguridad (opcional, para firmar tokens propios)
JWT_SECRET=<secreto-seguro>
```

> **Nota:** las variables con prefijo `NEXT_PUBLIC_` son accesibles en el cliente (browser). No pongas secrets con ese prefijo.

---

## Estructura de carpetas

```
packages/web/
├── src/
│   ├── app/                        # Next.js App Router (rutas)
│   │   ├── layout.tsx              # Layout raíz (fuentes, metadata, Toaster)
│   │   ├── globals.css             # Design system: variables CSS, utilidades
│   │   ├── page.tsx                # / → redirect a /login
│   │   ├── login/page.tsx          # Página de inicio de sesión
│   │   ├── register/page.tsx       # Registro de usuario
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Aplica DashboardLayout
│   │   │   ├── page.tsx            # Panel principal con balance y transacciones
│   │   │   ├── send/page.tsx       # Enviar dinero
│   │   │   ├── receive/page.tsx    # Recargar saldo
│   │   │   └── security/page.tsx   # Seguridad desde el dashboard
│   │   ├── transactions/           # Historial de transacciones
│   │   ├── transfers/              # Transferencias
│   │   ├── services/               # Pagos de servicios
│   │   ├── contacts/               # Contactos frecuentes
│   │   ├── settings/               # Configuración de cuenta
│   │   ├── security/               # Seguridad (2FA, biometría)
│   │   ├── support/                # Soporte al cliente
│   │   ├── verification/           # Verificación de identidad (KYC)
│   │   ├── admin/                  # Panel administrativo
│   │   └── api/                    # API Routes de Next.js
│   │       └── services/
│   │           ├── payment/        # POST /api/services/payment
│   │           └── providers/      # GET /api/services/providers
│   │
│   ├── components/
│   │   ├── admin/                  # Componentes del panel admin
│   │   │   ├── AdminNav.tsx
│   │   │   ├── AuditLogViewer.tsx
│   │   │   ├── BlockUserDialog.tsx
│   │   │   ├── DocumentVerificationView.tsx
│   │   │   ├── ExportDialog.tsx
│   │   │   ├── Overview.tsx
│   │   │   ├── TransactionMonitoring.tsx
│   │   │   ├── UserDetailView.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx       # Formulario glassmorphism de login
│   │   │   ├── RegisterForm.tsx
│   │   │   └── IdentityVerification.tsx
│   │   ├── dashboard/
│   │   │   ├── BalanceCard.tsx     # Tarjeta de saldo con toggle show/hide
│   │   │   ├── BalanceChart.tsx    # Gráfico de historial (recharts)
│   │   │   ├── QuickActions.tsx
│   │   │   ├── RecentTransactions.tsx
│   │   │   ├── SendMoneyForm.tsx   # (también en /transactions)
│   │   │   └── TransferForm.tsx
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx # Sidebar violet + header glassmorphism
│   │   ├── security/               # Componentes de seguridad (2FA, biometría, etc.)
│   │   ├── services/               # Formulario y confirmación de pagos
│   │   ├── settings/               # Perfil, notificaciones, contraseña
│   │   ├── support/                # Chatbot, formulario, ContactHumanButton
│   │   ├── transactions/
│   │   │   ├── SendMoneyForm.tsx   # Formulario de envío de dinero
│   │   │   ├── TransactionDetail.tsx
│   │   │   ├── TransactionsList.tsx
│   │   │   └── TransactionsTable.tsx
│   │   ├── transfers/
│   │   │   └── TransferForm.tsx
│   │   └── ui/                     # Componentes base (shadcn/ui + Radix)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── toast.tsx
│   │       └── ... (otros 15+ componentes)
│   │
│   └── lib/
│       ├── supabase.ts             # Cliente Supabase (browser)
│       ├── api.ts                  # Helpers principales: getProfile, getAccounts, getTransactions
│       ├── auth.ts                 # Helpers de autenticación
│       ├── utils.ts                # cn(), formatCurrency(), etc.
│       ├── api/
│       │   ├── admin.ts            # Funciones admin (exportar, bloquear usuarios)
│       │   ├── profiles.ts         # CRUD de perfiles
│       │   ├── services.ts         # Pagos de servicios
│       │   ├── support.ts          # Tickets de soporte
│       │   ├── transactions.ts     # Transacciones y RPC transfer_funds
│       │   └── user.ts             # Datos de usuario
│       ├── auth/
│       │   └── supabaseAuth.ts
│       ├── security/
│       │   └── securityDetectionService.ts
│       └── utils/
│           └── formatters.ts       # formatDate, formatCurrency, etc.
│
├── public/                         # Assets estáticos
├── prisma/
│   └── schema.prisma               # Schema de base de datos (ref. para Supabase)
├── tailwind.config.js              # Tokens de diseño, colores, animaciones
├── next.config.ts                  # Config de Next.js
├── tsconfig.json
├── .env.local                      # Variables de entorno (NO commitear)
└── package.json
```

---

## Rutas de la aplicación

| Ruta | Descripción | Auth requerida |
|---|---|---|
| `/` | Redirect a `/login` | No |
| `/login` | Inicio de sesión | No |
| `/register` | Registro de nuevo usuario | No |
| `/dashboard` | Panel principal: saldo, transacciones recientes | Sí |
| `/dashboard/send` | Enviar dinero | Sí |
| `/dashboard/receive` | Recargar saldo | Sí |
| `/dashboard/security` | Config. de seguridad rápida | Sí |
| `/transactions` | Historial completo de transacciones | Sí |
| `/transactions/[id]` | Detalle de una transacción | Sí |
| `/transfers` | Lista de transferencias | Sí |
| `/transfers/new` | Nueva transferencia | Sí |
| `/services` | Pago de servicios (CFE, agua, internet) | Sí |
| `/services/payment` | Formulario de pago de servicio | Sí |
| `/services/payment-success` | Confirmación de pago | Sí |
| `/contacts` | Lista de contactos frecuentes | Sí |
| `/settings` | Configuración general | Sí |
| `/settings/profile` | Editar perfil | Sí |
| `/settings/notifications` | Preferencias de notificaciones | Sí |
| `/security` | Seguridad: 2FA, biometría, sesiones | Sí |
| `/support` | Chatbot y contacto a soporte | Sí |
| `/verification` | Verificación de identidad (KYC) | Sí |
| `/admin` | Panel administrativo | Sí (admin) |
| `/design` | Design system interactivo | No |
| `/api/services/payment` | API Route: procesar pago | Server |
| `/api/services/providers` | API Route: listar proveedores | Server |

---

## Arquitectura y decisiones técnicas

### Next.js App Router
Toda la navegación usa el **App Router** de Next.js 15. Las páginas protegidas usan el `DashboardLayout` que envuelve el contenido con el sidebar y el header.

### Backend: Supabase
El backend es 100% Supabase. Toda la lógica de negocio vive en:
- **PostgreSQL Functions** — `transfer_funds()` maneja transferencias con RLS y control de saldo
- **Row Level Security (RLS)** — usuarios solo ven sus propios datos
- **Supabase Auth** — JWT firmado, refresh token automático
- **Supabase Storage** — documentos KYC

### Gestión de estado
- Estado de servidor: **Supabase client** directo (sin React Query en la mayoría de páginas)
- Estado global: **Jotai** (disponible pero poco usado en MVP)
- Estado de formularios: **react-hook-form** + **Zod**

### Animaciones
- **Framer Motion** `^12` — animaciones de entrada, hover, stagger en dashboard
- **tailwindcss-animate** — animaciones CSS puras (float, shimmer, orbs, fade-in-up)

---

## Autenticación

El flujo de auth es 100% Supabase:

```
Usuario → /login → supabase.auth.signInWithPassword()
                 → JWT guardado en cookie (gestionado por Supabase)
                 → redirect /dashboard
```

Para verificar si el usuario está autenticado en un componente:

```tsx
import { supabase } from '@/lib/supabase'

const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

Para obtener el perfil del usuario (incluye balance):

```tsx
import api from '@/lib/api'

const accounts = await api.getAccounts()   // balance real
const profile  = await api.getProfile()    // nombre, email, etc.
```

---

## Base de datos

Tablas principales en Supabase (PostgreSQL):

| Tabla | Descripción |
|---|---|
| `auth.users` | Usuarios de Supabase Auth (gestionada por Supabase) |
| `Profile` | Datos de perfil: `id`, `userId`, `fullName`, `email`, `phone`, `avatarUrl` |
| `Account` | Cuenta financiera: `id`, `profileId`, `balance`, `type`, `number`, `status` |
| `Transaction` | Transacciones: `id`, `senderId`, `receiverId`, `amount`, `description`, `status`, `type` |

Función SQL principal:

```sql
-- Transfiere fondos entre perfiles con validación de saldo
SELECT transfer_funds(
  p_sender_id   := '<uuid>',
  p_receiver_id := '<uuid>',
  p_amount      := 500.00,
  p_description := 'Pago de renta',
  p_idempotency_key := '<uuid>'
);
```

---

## Deploy a Vercel

El proyecto ya está vinculado al proyecto Vercel `web` (ver `.vercel/project.json`).

```bash
# Desde packages/web
vercel --prod
```

Las variables de entorno deben estar configuradas en el dashboard de Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (si usas Prisma en build)

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo (localhost:3000)
npm run build      # Build de producción
npm run start      # Servidor de producción local
npm run lint       # ESLint
npm run test       # Jest (pruebas unitarias)
npm run test:watch # Jest en modo watch
```
