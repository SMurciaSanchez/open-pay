# Estado del proyecto: 09/11/2026

> Resumen para retomar OpenPay. Dice qué está hecho, qué falta y qué hay que
> hacer primero. El detalle por etapa está en `PLAN_PANEL_ORGANIZACION.md`.

## Qué está hecho

- **Fases 0, 2 y 3 cerradas.** La app está desplegada en https://open-pay-one.vercel.app
  (rama `main`). El contrato está verificado en Basescan (Base Sepolia) y `/verificar`
  funciona con la prueba de demostración.
- **Pruebas de aceptación** en `packages/circuits`: `npm run aceptacion` (transparencia
  y privacidad). Resultados en `MODELO_AMENAZA.md` §7.
- **Panel de la organización: las 6 etapas construidas** en la rama `panel/organizacion`
  (sin unir a `main`). Una organización ya recorre desde la app:
  **equipo → fondo → pagos → aprobación → extracto → conciliación → lista anclada**.
  - Etapas 1-2: organización, equipo de 4 roles, fondo, rubros, proveedores, contratos.
  - Etapa 3: el tesorero registra pagos; el aprobador aprueba o rechaza.
  - Etapa 4: cuenta bancaria cifrada, extracto CSV sellado, conciliación.
  - Etapa 5: anclar la lista de proveedores y cerrar el lote de un rubro (`/api/org/batch`).
  - Etapa 6: `npm run prove-batch` en `packages/circuits` y `/verificar?lote=<id>`.
- **Datos de demostración en la base real** (Supabase): "Fundación Demo OpenPay",
  "Fondo Salud Rural 2026", rubro Medicamentos ($40.000.000), un proveedor, un contrato,
  un pago de $5.000.000 conciliado el 09/11/2026 y la lista de proveedores anclada
  (transacción `0x73a5185823169da6b2b5ab4ff31113bd757e751ec6aab571d0daba8e61f44b53`).
- **Cuentas de la demo:** cuatro alias de Gmail (`+legal`, `+config`, `+tesoreria`,
  `+aprueba`), uno por rol.

## Lo único del recorrido que falta probar con datos reales

Un lote solo se cierra cuando su mes terminó. El de noviembre de 2026 se puede
cerrar **desde el 01/12/2026**:

1. Entrar como tesorero → fondo → pestaña **Lotes** → **Cerrar y anclar lote**.
2. En `packages/circuits`: `npm run prove-batch -- <id del lote>`.
3. Abrir `/verificar?lote=<id>`: tiene que salir todo en verde.

Ya se simuló con el pago real (`npm run prove-batch -- --simular <id del rubro> 2026-11-01`):
la prueba verifica y la raíz de proveedores coincide con la anclada.

## Para correr la app en local

`cd packages/web && npm run dev`. Necesita `packages/web/.env.local` (no se sube a git) con,
además de las variables públicas: `BANK_DATA_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y
`PUBLISHER_PRIVATE_KEY`. Ver `packages/web/.env.example`.

> ⚠️ `BANK_DATA_KEY` cifra los números de cuenta y las glosas ya guardadas. Si se
> pierde, no se pueden leer. Hay que copiarla tal cual a Vercel.

Pruebas: `npx jest` en `packages/web`, `npm test` en `packages/circuits`,
`npx hardhat test` en `packages/contracts`, `sh packages/web/supabase/tests/run.sh` (Docker).

## Qué sigue

| Paso | Qué | Quién |
|---|---|---|
| 1 | `next build` de la web con las rutas nuevas | Claude |
| 2 | Poner en Vercel `SUPABASE_SERVICE_ROLE_KEY`, `PUBLISHER_PRIVATE_KEY` y `BANK_DATA_KEY` | Usuario |
| 3 | Unir `panel/organizacion` con `main` y desplegar | Ambos |
| 4 | 01/12/2026 o después: cerrar el lote de noviembre, probarlo y verificarlo | Ambos |
| 5 | Pendientes menores: crear el perfil al registrarse (hoy se crea al primer inicio de sesión y por eso no se puede invitar a quien nunca entró); rehacer el Panel Principal, que todavía muestra la billetera vieja; pantalla para leer lo cifrado | Claude |
| 6 | README con el recorrido de la demo y los límites | Ambos |

## Después del MVP

La prueba de hoy es en parte autocalificación: la organización fija sus propias
reglas y sube su propio extracto. Para que deje de serlo (detalle en
`PLAN_PANEL_ORGANIZACION.md`):

- **Etapa 7:** las reglas las aprueba quien pone la plata (un financiador externo).
- **Etapa 8:** datos de entrada independientes (factura electrónica contra la DIAN,
  extracto con origen comprobable).
- **Cinco conversaciones** con fundaciones o donantes antes de construir esas etapas:
  deciden si valen la pena. Guion en `VALIDACION_FASE1.md`.

## Límites conocidos (hay que decirlos en la demo)

- La prueba de cada lote cubre un rubro y un mes. Que la suma de **todos** los meses
  no pase del presupuesto lo hace cumplir la base (`decide_payment`), pero todavía no
  se prueba (ver `MODELO_AMENAZA.md` §3).
- El extracto lo sube la propia organización: queda sellado y con la huella del
  archivo, pero OpenPay no lo recibe del banco (supuesto S5).
- La prueba ZK se genera en el PC del operador: la clave de prueba no cabe en Vercel.
- La ceremonia de claves es de desarrollo (`CEREMONIA.md`); red de pruebas.
- Falta la auditoría de seguridad externa y la revisión manual de las pruebas de
  privacidad por otra persona.

## Fase 1 (en paralelo, trabajo humano)

Pedir cita en el consultorio jurídico (llevar §7 de `VALIDACION_FASE1.md`), armar una
lista de contactos (fuera del repo), conseguir quién revise las pruebas de privacidad
y hacer las entrevistas. La Fase 4 (piloto) solo arranca si H5 da 2 o 3
organizaciones con un siguiente paso concreto.
