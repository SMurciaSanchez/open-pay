# Estado del proyecto: 10/11/2026

> Resumen para retomar OpenPay. Dice qué está hecho, qué falta y qué hay que
> hacer primero. El detalle por etapa está en `PLAN_PANEL_ORGANIZACION.md`.

## Qué está hecho

- **Fases 0, 2 y 3 cerradas.** La app está desplegada en https://open-pay-one.vercel.app
  (rama `main`). El contrato está verificado en Basescan (Base Sepolia) y `/verificar`
  funciona con la prueba de demostración.
- **Pruebas de aceptación** en `packages/circuits`: `npm run aceptacion` (transparencia
  y privacidad). Resultados en `MODELO_AMENAZA.md` §7.
- **Panel de la organización: las 6 etapas construidas** y unidas a `main`. Una
  organización ya recorre desde la app:
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
- **Revisión de seguridad del panel (10/11/2026)** y sus correcciones, antes de unir a `main`
  (migración `20261110120000_panel_hardening.sql`, ya aplicada en Supabase):
  - Registrar y anclar listas y lotes solo lo hace el servidor; ningún cliente puede
    ejecutar esas funciones de la base.
  - Un mes con lote queda cerrado: no se concilia ni se revoca una conciliación dentro
    de él, y no se cierra con pagos aprobados de ese mes sin conciliar.
  - Solo anclan las organizaciones habilitadas por el operador (`anchoringEnabled`) y un
    fondo registra como máximo 3 listas de proveedores nuevas cada 24 horas.
  - Datos bancarios con llave por organización (formato `bank-v2`); lo anterior se sigue leyendo.
  - El portal comprueba en la cadena que las raíces son de ese fondo y de ese tipo, y dice
    que la prueba cubre un mes.
  - La web publica con una billetera propia (`0x673f868bFaFd72F6E003Ed0b69f0e8E78E021704`),
    distinta de la dueña del contrato (`packages/contracts/scripts/new-publisher.ts`).

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
> pierde, no se pueden leer. `PUBLISHER_PRIVATE_KEY` es la llave de la billetera que
> publica y solo existe en ese archivo y en Vercel. Hay que tener copia de las dos.
>
> Habilitar a una organización nueva para anclar (SQL Editor de Supabase):
> `UPDATE "Organization" SET "anchoringEnabled" = TRUE WHERE id = '...';`

Pruebas: `npx jest` en `packages/web`, `npm test` en `packages/circuits`,
`npx hardhat test` en `packages/contracts`, `sh packages/web/supabase/tests/run.sh` (Docker).

## Qué sigue

| Paso | Qué | Quién |
|---|---|---|
| 1 | 01/12/2026 o después: cerrar el lote de noviembre, probarlo y verificarlo. Será el primer anclaje real con la billetera nueva | Ambos |
| 2 | Pendientes menores: crear el perfil al registrarse (hoy se crea al primer inicio de sesión y por eso no se puede invitar a quien nunca entró); rehacer el Panel Principal, que todavía muestra la billetera vieja; pantalla para leer lo cifrado (la función de descifrado ya existe en `lib/server/bankCrypto.ts`) | Claude |
| 3 | Dos cierres de lote a la vez usan la misma billetera sin coordinarse: uno falla y hay que reintentar. Aceptado para la demo | — |

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
