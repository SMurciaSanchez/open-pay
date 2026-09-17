# OpenPay — Plataforma Financiera Digital

> Fintech MVP con web moderna, app móvil y backend serverless en Supabase.  
> Proyecto académico — Ingeniería de Sistemas, 5° semestre.

**Demo en vivo:** [web-kohl-sigma-30.vercel.app](https://web-kohl-sigma-30.vercel.app)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend Web** | Next.js 15 · TypeScript · Tailwind CSS · Framer Motion |
| **App Móvil** | React Native · Expo SDK 51 |
| **Backend / Auth** | Supabase (PostgreSQL + Auth + Storage + RLS) |
| **UI Components** | Radix UI · shadcn/ui · Lucide React |
| **Deploy Web** | Vercel |
| **Animaciones** | Framer Motion · tailwindcss-animate |
| **Formularios** | react-hook-form · Zod |
| **Gráficos** | Recharts |

---

## Estructura del monorepo

```
open-pay-mvp/
├── packages/
│   ├── web/          # Frontend Next.js 15 — PRINCIPAL
│   └── mobile/       # App React Native + Expo
├── app/              # Documentación y planes anteriores
├── README.md
└── improvement-plan.md
```

---

## Estado actual del proyecto

### Web (`packages/web`) — ~90% completo ✅

Desplegado en Vercel. Autenticación real con Supabase.

| Módulo | Estado |
|---|---|
| Login / Registro | ✅ Funcional con Supabase Auth |
| Dashboard (balance real) | ✅ Conectado a Supabase |
| Enviar dinero | ✅ RPC `transfer_funds` |
| Historial de transacciones | ✅ Datos reales |
| Pagos de servicios | ✅ Implementado |
| Transferencias | ✅ Implementado |
| Configuración de perfil | ✅ Implementado |
| Seguridad (2FA, biometría, sesiones) | ✅ Implementado |
| Soporte (chatbot + tickets) | ✅ Implementado |
| Verificación de identidad (KYC) | ✅ Implementado |
| Panel de administrador | ✅ Implementado |
| Design System `/design` | ✅ Página interactiva |

### Mobile (`packages/mobile`) — ~50% completo 🔄

App funcional con navegación completa. Datos conectados a Supabase real.

| Módulo | Estado |
|---|---|
| Login / Registro / Forgot Password | ✅ Funcional con Supabase Auth |
| Dashboard (balance real) | ✅ Conectado a Supabase |
| Historial de transacciones | ✅ Datos reales |
| Enviar dinero | ✅ RPC `transfer_funds` |
| Servicios | 🔄 UI lista, sin integración real |
| Perfil | 🔄 UI lista, sin integración real |
| Biometría | ✅ expo-local-authentication |
| Notificaciones push | ❌ Pendiente |

---

## Inicio rápido

### Web

```bash
cd packages/web
npm install
# Crea packages/web/.env.local con las variables de Supabase
npm run dev
# → http://localhost:3000
```

Variables de entorno requeridas en `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://bmfiotbutuslsaxeumik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Mobile

```bash
cd packages/mobile
npm install
# Asegúrate de tener packages/mobile/.env con las variables de Supabase
npx expo start
# Escanea el QR con Expo Go en tu celular
```

Variables de entorno en `packages/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://bmfiotbutuslsaxeumik.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Arquitectura del backend

El backend es **Supabase** (PostgreSQL + Auth + Storage + RLS).

```
Cliente (Next.js / React Native)
         │
         ▼
   Supabase Client SDK
         │
    ┌────┴─────────────────────────────────────┐
    │           Supabase Platform               │
    │  ┌─────────┐  ┌────────┐  ┌───────────┐  │
    │  │  Auth   │  │  DB    │  │  Storage  │  │
    │  │  (JWT)  │  │  (PG)  │  │  (KYC)    │  │
    │  └─────────┘  └────────┘  └───────────┘  │
    │                 │                         │
    │          ┌──────┴──────┐                  │
    │          │ PostgreSQL  │                  │
    │          │ Functions   │                  │
    │          │ + RLS       │                  │
    │          └─────────────┘                  │
    └───────────────────────────────────────────┘
```

**Función principal:**
```sql
transfer_funds(sender_id, receiver_id, amount, description, idempotency_key)
-- Valida saldo, aplica RLS, previene deadlocks, es idempotente
```

---

## Documentación

| Documento | Ubicación | Descripción |
|---|---|---|
| **Frontend** | `packages/web/FRONTEND.md` | Guía completa del frontend web |
| **Design System** | `packages/web/DESIGN_SYSTEM.md` | Colores, tipografía, animaciones, componentes |
| **Design visual** | `/design` (en la app) | Página interactiva del design system |
| **Supabase config** | `packages/web/SUPABASE_CONFIG.md` | Configuración de la base de datos |
| **Scripts SQL** | `packages/web/SCRIPTS_SQL_OPENPAY.md` | Scripts de creación de tablas y funciones |
| **Deploy Vercel** | `packages/web/VERCEL_DEPLOYMENT.md` | Instrucciones de deployment |
| **Mobile impl.** | `packages/mobile/IMPLEMENTACION.md` | Plan de implementación de la app móvil |

---

## Equipo

Proyecto desarrollado por **Sebastián Murcia** y **Sebastián Díaz**  
Ingeniería de Sistemas — Gerencia de Proyectos TICs  
© 2025 OpenPay · Todos los derechos reservados
