# OpenPay — Design System

> Identidad visual: **Violet Premium** — moderno, audaz, confiable.  
> Inspirado en Nubank y Nequi, con identidad propia centrada en la confianza y la modernidad.

---

## Tabla de contenidos

1. [Principios de diseño](#principios-de-diseño)
2. [Paleta de colores](#paleta-de-colores)
3. [Tipografía](#tipografía)
4. [Espaciado y bordes](#espaciado-y-bordes)
5. [Sombras](#sombras)
6. [Gradientes](#gradientes)
7. [Efectos: Glassmorphism y Glow](#efectos-glassmorphism-y-glow)
8. [Animaciones](#animaciones)
9. [Componentes CSS (clases utilitarias)](#componentes-css-clases-utilitarias)
10. [Componentes UI (React)](#componentes-ui-react)
11. [Iconografía](#iconografía)
12. [Página de referencia visual](#página-de-referencia-visual)

---

## Principios de diseño

| Principio | Descripción |
|---|---|
| **Confianza** | Interfaz limpia, sin ruido visual. El usuario sabe dónde está en todo momento. |
| **Velocidad percibida** | Animaciones de entrada rápidas (< 500ms), feedback inmediato en interacciones. |
| **Jerarquía clara** | Tamaño, color y peso tipográfico guían la atención sin necesidad de leer todo. |
| **Consistencia** | Un solo token por concepto (un único violet, un único radio de borde, etc.). |
| **Accesibilidad** | Contraste mínimo AA en texto, estados focus visibles, soporte de teclado. |

---

## Paleta de colores

### Color primario — Violet

El color principal de OpenPay. Transmite creatividad, confianza y tecnología.

| Token | Hex | Uso |
|---|---|---|
| `violet-50`  | `#f5f3ff` | Fondo de páginas, fondos de inputs |
| `violet-100` | `#ede9fe` | Hover de elementos secundarios |
| `violet-200` | `#ddd6fe` | Bordes suaves, separadores |
| `violet-300` | `#c4b5fd` | Texto en fondos oscuros (labels) |
| `violet-400` | `#a78bfa` | Texto secundario, iconos inactivos |
| `violet-500` | `#8b5cf6` | Elementos interactivos secundarios |
| `violet-600` | `#7c3aed` | **Color primario principal** |
| `violet-700` | `#6d28d9` | Hover del primario, gradiente |
| `violet-800` | `#5b21b6` | Sidebar activo profundo |
| `violet-900` | `#4c1d95` | Textos sobre fondo claro (énfasis) |
| `violet-950` | `#2e1065` | Fondos oscuros del sidebar |

```css
/* Variables CSS disponibles */
--primary:            263 70% 58%;   /* violet-600 = #7c3aed */
--primary-foreground: 0 0% 100%;     /* blanco */
--secondary:          263 100% 97%;  /* violet-50 */
--ring:               263 70% 58%;   /* foco de inputs */
```

### Colores semánticos

| Propósito | Color | Hex | Clase Tailwind |
|---|---|---|---|
| Éxito / Ingresos | Emerald | `#10b981` | `text-emerald-600`, `bg-emerald-50` |
| Error / Gastos | Rose | `#f43f5e` | `text-rose-500`, `bg-rose-50` |
| Advertencia | Amber | `#f59e0b` | `text-amber-600`, `bg-amber-50` |
| Info / Neutral | Sky | `#0ea5e9` | `text-sky-600`, `bg-sky-50` |
| Destructivo | Red | `#ef4444` | `text-red-500` |

### Neutrales (slate)

| Token | Uso |
|---|---|
| `slate-50`  | Fondo de cards en dashboard |
| `slate-100` | Hover de elementos neutros |
| `slate-200` | Bordes, separadores |
| `slate-400` | Texto placeholder |
| `slate-500` | Texto secundario/muted |
| `slate-700` | Texto del header |
| `slate-900` | Texto principal en fondos claros |

### Sidebar (paleta oscura)

| Color | Hex | Uso |
|---|---|---|
| Fondo top | `#1e1b4b` | Inicio del gradiente del sidebar |
| Fondo mid  | `#160f3a` | Centro del gradiente |
| Fondo bot  | `#0c0a24` | Final del gradiente |
| Texto inactivo | `rgba(165,180,252,0.7)` | Nav items inactivos (`indigo-300/70`) |
| Texto activo | `#ffffff` | Nav items activos |
| Borde | `rgba(139,92,246,0.15)` | Separadores del sidebar |

---

## Tipografía

### Fuentes

| Variable CSS | Fuente | Uso |
|---|---|---|
| `--font-inter` | **Inter** | Cuerpo de texto, párrafos, labels |
| `--font-poppins` | **Poppins** | Títulos, headings |
| `--font-jetbrains-mono` | **JetBrains Mono** | Números de cuenta, códigos, montos en código |

```css
/* Uso en Tailwind */
font-sans   /* Inter — predeterminado */
font-mono   /* JetBrains Mono */
```

### Escala tipográfica

| Clase | Tamaño | Uso típico |
|---|---|---|
| `text-xs`   | 12px | Labels, badges, fechas, metadatos |
| `text-sm`   | 14px | Texto de interfaz, nav items, inputs |
| `text-base` | 16px | Texto de cuerpo general |
| `text-lg`   | 18px | Subtítulos de sección |
| `text-xl`   | 20px | Títulos de card |
| `text-2xl`  | 24px | Títulos de página |
| `text-3xl`  | 30px | Balances secundarios |
| `text-4xl`  | 36px | Balance principal en dashboard |
| `text-5xl`  | 48px | Héroe/landing de login |

### Pesos

| Clase | Peso | Uso |
|---|---|---|
| `font-normal`    | 400 | Texto de cuerpo |
| `font-medium`    | 500 | Labels, nav items |
| `font-semibold`  | 600 | Títulos, botones |
| `font-bold`      | 700 | Balances, headings principales |

---

## Espaciado y bordes

### Border radius

| Variable/Clase | Valor | Uso |
|---|---|---|
| `--radius` / `rounded-lg` | `0.875rem` (14px) | Cards, modals |
| `rounded-xl`  | `1rem` (16px) | Inputs, botones, nav items |
| `rounded-2xl` | `1.25rem` (20px) | Cards del dashboard |
| `rounded-3xl` | `1.5rem` (24px) | Balance card principal |
| `rounded-full` | 9999px | Badges, avatares, pills |

### Espaciado interno de componentes

| Componente | Padding |
|---|---|
| Botones | `px-5 py-2.5` |
| Inputs | `px-3 py-2` |
| Cards del dashboard | `p-5` (20px) |
| Balance card | `p-6 lg:p-8` |
| Sidebar items | `px-3 py-2.5` |
| Header | `px-4 md:px-6` |

---

## Sombras

Todas las sombras tienen un tinte violeta para mantener coherencia con el color primario.

| Clase CSS | Uso |
|---|---|
| `.card-shadow` | Sombra sutil para cards neutras |
| `.card-shadow-md` | Cards con hover o énfasis medio |
| `.card-shadow-lg` | Dropdowns, modals, elementos flotantes |
| `.card-shadow-violet` | Cards de acción principales (con glow) |

```css
/* Ejemplo de uso */
<div className="bg-white rounded-2xl card-shadow-md">...</div>
<div className="bg-white rounded-2xl card-shadow-violet">...</div>
```

### Sombras de botones

```css
/* Botón primario */
box-shadow: 0 8px 25px rgba(124, 58, 237, 0.5);

/* Balance card */
box-shadow: 0 20px 60px rgba(124, 58, 237, 0.4), 0 4px 20px rgba(79, 70, 229, 0.3);
```

---

## Gradientes

| Clase CSS | Descripción | Uso |
|---|---|---|
| `.gradient-violet` | `#7c3aed → #6d28d9 → #4f46e5` | Balance card, botones CTA |
| `.gradient-violet-soft` | `#8b5cf6 → #7c3aed → #6366f1` | Versión más suave |
| `.gradient-sidebar` | `#1e1b4b → #160f3a → #0c0a24` | Sidebar de navegación |
| `.gradient-mesh-violet` | Múltiples radiales sobre `#0c0a1e` | Fondo de la página de login |
| `.gradient-green` | `#059669 → #0891b2` | Indicadores de éxito/ingresos |

```css
/* Gradiente de texto (logo, hero) */
background: linear-gradient(90deg, #c4b5fd, #a78bfa, #818cf8);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## Efectos: Glassmorphism y Glow

### Glassmorphism

| Clase CSS | Descripción | Uso |
|---|---|---|
| `.glass` | Fondo `rgba(255,255,255,0.08)` + `backdrop-blur(20px)` | Sobre fondos oscuros (login) |
| `.glass-dark` | Fondo `rgba(10,8,30,0.6)` + `backdrop-blur(24px)` | Panels oscuros |
| `.glass-light` | Fondo `rgba(255,255,255,0.7)` + `backdrop-blur(16px)` | Header, panels claros |

```jsx
// Ejemplo: card glassmorphism sobre fondo oscuro
<div className="glass rounded-2xl p-5">
  Contenido sobre fondo violeta
</div>
```

### Glow

| Clase CSS | Descripción |
|---|---|
| `.glow-violet` | Sombra exterior grande violeta (`0 0 30px rgba(124,58,237,0.35)`) |
| `.glow-violet-sm` | Glow pequeño (`0 0 15px rgba(124,58,237,0.3)`) |
| `.glow-emerald` | Glow verde para valores positivos |

---

## Animaciones

### Animaciones CSS (Tailwind)

| Clase | Duración | Descripción |
|---|---|---|
| `animate-fade-in` | 0.4s | Aparición con fade |
| `animate-fade-in-up` | 0.5s | Aparición desde abajo (y+20px → 0) |
| `animate-scale-in` | 0.4s | Zoom desde 92% → 100% |
| `animate-slide-in-left` | 0.4s | Entrada desde la izquierda |
| `animate-float` | 4s ∞ | Flotación suave vertical |
| `animate-float-slow` | 6s ∞ | Flotación lenta con rotación |
| `animate-glow-pulse` | 3s ∞ | Pulsación del glow violet |
| `animate-shimmer` | 2.5s ∞ | Efecto de carga (skeleton) |
| `animate-spin-slow` | 12s ∞ | Rotación lenta |
| `animate-orb-1` | 12s ∞ | Movimiento orgánico orbe 1 (login) |
| `animate-orb-2` | 15s ∞ | Movimiento orgánico orbe 2 (login) |

```jsx
// Delay de animaciones con style
<div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
  Contenido animado con delay
</div>
```

### Framer Motion (componentes React)

```tsx
import { motion, type Variants } from 'framer-motion'

// Patrón stagger — para listas de cards
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

// Uso
<motion.div variants={container} initial="hidden" animate="show">
  <motion.div variants={item}>Card 1</motion.div>
  <motion.div variants={item}>Card 2</motion.div>
</motion.div>

// Hover lift
<motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
  Botón interactivo
</motion.div>

// Dropdown con AnimatePresence
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
    >
      Dropdown
    </motion.div>
  )}
</AnimatePresence>
```

---

## Componentes CSS (clases utilitarias)

Definidas en `globals.css` bajo `@layer components`:

### Layout y sidebar

```css
.sidebar-item         /* Base de un nav item: flex, gap, padding, rounded, transition */
.sidebar-item-active  /* Estado activo: gradiente violet + glow */
.sidebar-item-inactive /* Estado inactivo: texto indigo-300/70, hover violet */
.gradient-sidebar     /* Gradiente del sidebar completo */
```

### Tarjetas de acción rápida

```css
.quick-action         /* Card clickeable con borde violet-100, hover lift */
.quick-action-icon    /* Contenedor del ícono con hover scale */
```

### Botones

```css
.btn-primary   /* Botón principal: gradiente violet + glow + hover lift */
.btn-ghost     /* Botón transparente: text-primary + hover bg-violet-50 */
```

### Badges de estadísticas

```css
.stat-up    /* Badge verde: emerald-700 bg-emerald-50 border border-emerald-100 */
.stat-down  /* Badge rojo: rose-600 bg-rose-50 border border-rose-100 */
```

### Loading

```css
.shimmer-bg  /* Skeleton animado con gradiente lateral */
```

---

## Componentes UI (React)

Basados en **shadcn/ui** + **Radix UI**. Ubicados en `src/components/ui/`:

| Componente | Archivo | Descripción |
|---|---|---|
| `Button` | `button.tsx` | Botón con variantes: default, outline, ghost, destructive |
| `Input` | `input.tsx` | Input base con estilos del design system |
| `Card` | `card.tsx` | Card con CardHeader, CardContent, CardFooter |
| `Dialog` | `dialog.tsx` | Modal accesible (Radix) |
| `Select` | `select.tsx` | Select dropdown (Radix) |
| `Checkbox` | `checkbox.tsx` | Checkbox accesible |
| `Switch` | `switch.tsx` | Toggle switch |
| `RadioGroup` | `radio-group.tsx` | Grupo de radios |
| `Badge` | `badge.tsx` | Etiqueta informativa |
| `Avatar` | `avatar.tsx` | Avatar con fallback |
| `Progress` | `progress.tsx` | Barra de progreso |
| `Tabs` | (Radix) | Navegación por pestañas |
| `Toast` / `Toaster` | `toast.tsx` | Notificaciones temporales |
| `Tooltip` | `tooltip.tsx` | Tooltip accesible |
| `ScrollArea` | `scroll-area.tsx` | Scroll personalizado |
| `Separator` | `separator.tsx` | Línea divisoria |
| `DropdownMenu` | `dropdown-menu.tsx` | Menú desplegable |

### Uso del Button

```tsx
import { Button } from '@/components/ui/button'

// Variantes disponibles
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Eliminar</Button>

// Con clase personalizada (override)
<Button
  className="rounded-xl font-semibold"
  style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
>
  Acción principal
</Button>
```

### Uso del Card

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card className="rounded-2xl border-violet-100 card-shadow-md">
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido de la card
  </CardContent>
</Card>
```

---

## Iconografía

Se usa **Lucide React** (`lucide-react ^0.294.0`).

### Íconos principales del sistema

| Ícono | Componente | Uso |
|---|---|---|
| Rayo | `Zap` | Logo de OpenPay |
| Dashboard | `LayoutDashboard` | Nav — Panel principal |
| Transferencias | `ArrowRightLeft` | Nav — Transferencias |
| Transacciones | `Clock` | Nav — Historial |
| Servicios | `CreditCard` | Nav — Pagos de servicios |
| Contactos | `Users` | Nav — Contactos |
| Configuración | `Settings` | Nav — Configuración |
| Seguridad | `Shield` | Nav — Seguridad |
| Soporte | `HelpCircle` | Nav — Soporte |
| Cerrar sesión | `LogOut` | Sidebar bottom |
| Enviar | `Send` | Acción enviar dinero |
| Descargar | `Download` | Acción recargar |
| Billetera | `Wallet` | Balance card |
| Ojo / OjoOff | `Eye` / `EyeOff` | Toggle mostrar saldo |
| Campana | `Bell` | Notificaciones |
| Buscar | `Search` | Barra de búsqueda |
| Trending ↑ | `TrendingUp` | Estadística de ingresos |
| Trending ↓ | `TrendingDown` | Estadística de gastos |
| Escudo OK | `ShieldCheck` | Estado de cuenta verificada |
| Alerta | `AlertCircle` | Mensajes de error |

```tsx
import { Zap, Send, Wallet } from 'lucide-react'

// Tamaños típicos
<Zap className="h-5 w-5 text-violet-600" />   // 20px — nav icons
<Send className="h-4 w-4" />                   // 16px — botones
<Wallet className="h-6 w-6" />                 // 24px — íconos principales
```

---

## Página de referencia visual

La app incluye una página interactiva en **`/design`** que muestra en vivo:

- Paleta de colores completa (swatches clickeables con hex)
- Todos los gradientes aplicados
- Ejemplos de glassmorphism y glow
- Todas las animaciones CSS en ejecución
- Botones en sus variantes
- Cards con sombras
- Badges y estados
- Tipografía en escala completa
- Iconografía con búsqueda

```
http://localhost:3000/design
https://web-kohl-sigma-30.vercel.app/design
```
