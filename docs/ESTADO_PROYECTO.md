# Estado del proyecto: pausa del 23/09/2026

> Resumen para retomar OpenPay después de una pausa. Dice qué está hecho, qué
> falta y qué hay que hacer primero.

## Qué está hecho

- **Fases 0, 2 y 3 cerradas.** La app está desplegada en https://open-pay-one.vercel.app
  con login de Supabase. El contrato está verificado en Basescan (Base Sepolia), las
  raíces de la demo están ancladas y `/verificar` sale todo en verde.
- **Pruebas de aceptación** en `packages/circuits`: `npm run aceptacion` corre
  95 pruebas (42 unitarias, 25 de transparencia y 28 de privacidad). Los resultados
  están en `MODELO_AMENAZA.md` §7.
- **Material de la Fase 1** en `VALIDACION_FASE1.md`: hipótesis H1 a H5, guion
  de entrevistas, plantilla de notas y preguntas legales.
- **Panel de la organización** (rama `panel/organizacion`), según
  `PLAN_PANEL_ORGANIZACION.md`:
  - Etapa 1, base de datos: la migración `20260923120000_org_panel.sql` y 44 pruebas SQL.
  - Etapa 2, pantallas `/organizacion` y `/fondos/[id]`: rubros, proveedores y contratos.

## Lo primero al retomar (bloqueante)

1. **Aplicar la migración** `packages/web/supabase/migrations/20260923120000_org_panel.sql`
   en el SQL Editor de Supabase. Sin ella, `/organizacion` falla en producción.
2. **Crear 4 cuentas** de la demo con alias de Gmail: `+legal` (representante
   legal), `+config` (configurador), `+tesoreria` (tesorero) y `+aprueba` (aprobador).
3. No unir `panel/organizacion` con `main` hasta aplicar la migración.

## Plan para cerrar el MVP

Meta: que una organización recorra todo el flujo desde la app, así:
**pago → aprobación → extracto → conciliación → lote anclado → prueba ZK → `/verificar`**.
Hoy la prueba publicada sale de datos de demostración (`src/demo-data.ts`).

| Paso | Qué | Quién |
|---|---|---|
| 0 | Aplicar la migración y crear las 4 cuentas | Usuario |
| 1 | Probar la Etapa 2 en Chrome. Sacar del menú las pantallas de la billetera vieja (Enviar dinero, Transacciones) | Claude |
| 2 | Etapa 3, pagos: el tesorero registra borradores y el aprobador aprueba o rechaza. Pruebas SQL de permisos | Claude |
| 3 | Etapa 4: cuenta bancaria cifrada, importar un extracto CSV (SHA-256, sellado) y conciliar. CSV de ejemplo para la demo | Claude |
| 4 | Etapa 5: ruta de API que arma el lote y ancla en Base Sepolia, más una pantalla de lotes. Variables en Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `PUBLISHER_PRIVATE_KEY`, `BASE_SEPOLIA_RPC_URL` y `BANK_DATA_KEY` | Claude + usuario |
| 5 | Etapa 6: script `prove-batch.ts` (prueba en el PC del operador) y `/verificar?lote=<id>`. Recorrido completo con las 4 cuentas | Claude |
| 6 | Unir con `main`, desplegar, poner el recorrido de la demo en el README y dejar documentados los límites | Ambos |

**Ojo con las fechas:** un lote solo se puede cerrar cuando su mes ya terminó y
tiene un movimiento bancario posterior a la aprobación. Antes de eso, se prueba en
local con fechas simuladas.

## Límites conocidos (hay que decirlos en la demo)

- La prueba de cada lote cubre un rubro y un mes. Que la suma de **todos** los
  meses no pase del presupuesto lo hace cumplir la base (`decide_payment`), pero
  todavía no se prueba (ver `MODELO_AMENAZA.md` §3).
- La prueba ZK se genera en el PC del operador: la clave de prueba pesa cientos
  de MB y no cabe en Vercel.
- Falta la auditoría de seguridad externa y la revisión manual de las pruebas de
  privacidad por otra persona.

## Fase 1 (en paralelo, trabajo humano)

Pedir cita en el consultorio jurídico (llevar §7 de `VALIDACION_FASE1.md`), armar
una lista de unos 25 contactos (fuera del repo), conseguir quién revise las
pruebas de privacidad, probar la transferencia de la Fase 0 y hacer de 10 a 12
entrevistas. La Fase 4 (piloto) solo arranca si H5 da 2 o 3 organizaciones con
un siguiente paso concreto.
