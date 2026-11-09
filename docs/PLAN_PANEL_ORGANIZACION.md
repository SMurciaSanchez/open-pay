# Plan — Panel de la organización

> Versión 0.1 — 23/09/2026
> Objetivo: que una organización pueda recorrer desde la app el flujo del MVP
> **pago → contrato → presupuesto → regla → evidencia → verificación**, que hoy
> solo existe en la base de datos y en scripts de consola.

## Decisiones (23/09/2026)

| Tema | Decisión | Por qué |
|---|---|---|
| Dónde se arma y ancla el lote | **Servidor en Vercel** (ruta de API con la llave de servicio de Supabase y la del publicador) | El tesorero hace clic y queda anclado. La red es de pruebas: la llave del publicador vale poco |
| Dónde se genera la prueba ZK | **Script en el PC del operador** (`packages/circuits`) | La clave de prueba pesa cientos de MB y el cómputo tarda minutos: no cabe en Vercel. Más adelante, un servidor aparte |
| Conciliación bancaria | **Obligatoria** antes de armar un lote | Es el diseño: un lote solo prueba pagos respaldados por un extracto sellado |
| Roles | **Un rol por persona** (se mantiene) | Separación de funciones. La demo usa 4 cuentas |
| Granularidad del lote | **Un lote por rubro y por mes** cerrado | Encaja con "anclar después de cerrar el período" (PP) |
| Tope que se prueba | **El presupuesto completo del rubro** | Usar "lo que queda" publicaría cuánto se gastó antes, y eso es un agregado que puede violar k ≥ 10 |

**Límite que hay que decir:** con lotes mensuales y el tope completo, cada prueba
dice "los pagos de este mes fueron a proveedores autorizados y no superan el
presupuesto del rubro". Que la suma de **todos** los meses no lo supere lo hace
cumplir la base (`decide_payment`), pero todavía no se prueba. Es el pendiente
"varios lotes por período" de `MODELO_AMENAZA.md` §3.

## Por qué el lote se arma en el servidor

La sal de cada pago (N4) no la puede leer ningún rol de cliente, y sin la sal no
se calcula el compromiso. Por eso el navegador no puede armar el lote, y
`record_payment_batch` (que suponía lo contrario) no sirve tal como está. El
servidor verifica con el token del usuario que sea tesorero del fondo y después
lee las sales con la llave de servicio.

## Roles en la demo

| Cuenta | Rol | Hace |
|---|---|---|
| 1 | Representante legal (`LEGAL_REP`) | Crea la organización e invita a los demás |
| 2 | Configurador (`CONFIGURATOR`) | Crea fondo, rubros, contratos y proveedores |
| 3 | Tesorero (`TREASURER`) | Registra pagos, importa extractos, concilia, cierra lotes |
| 4 | Aprobador (`APPROVER`) | Aprueba o rechaza pagos |

Con Gmail sirven alias: `correo+legal@gmail.com`, `correo+config@gmail.com`…

## Etapas

Cada etapa termina con pruebas y un commit.

### Etapa 1 — Base de datos (migración nueva) ✅ `20260923120000_org_panel.sql`, 43 pruebas
- [x] `create_organization(name, nit, kind)`: quien la crea queda como `LEGAL_REP`.
- [x] `add_org_member(org, email, role)` y `revoke_org_member`: solo `LEGAL_REP`; la persona tiene que tener cuenta.
- [x] `PaymentBatch`: agregar `budgetId` (un lote por rubro).
- [x] `VendorSetSnapshot`: qué lista de proveedores se ancló, en qué orden y en qué transacción (el circuito necesita el orden).
- [x] `BatchProof`: la prueba generada de cada lote, y la vista pública `PublicBatchProof` para `/verificar`.
- [x] Pruebas SQL en `packages/web/supabase/tests/60_org_panel.sql`.
- [x] Conciliar fija `paidOn` = fecha del movimiento bancario (antes la escribía el tesorero y decidía el mes del lote).
- [x] Además: `record_vendor_set` / `anchor_vendor_set`, `record_budget_batch` (exige TODOS los pagos conciliados del rubro en el mes, mes cerrado, lista anclada) y `discard_unanchored_batch`.
- [x] **Aplicarla en Supabase** (SQL Editor) — aplicada el 09/11/2026.

### Etapa 2 — Organización y fondo
- [x] `/organizacion`: crear la organización, ver miembros, invitar por correo.
- [x] `/fondos/[id]`: fondo, rubros, contratos, proveedores autorizados (los fondos se listan en `/organizacion`).
- [x] Menú lateral: Organización y Verificar.
- [x] Sacadas del menú las pantallas de la billetera vieja (Enviar dinero, Transacciones), 09/11/2026. Las rutas siguen existiendo y el Panel Principal todavía muestra la billetera: falta rehacerlo como inicio de la organización.
- [x] Probar en Chrome con las cuentas de la demo — hecho el 09/11/2026: organización, equipo de 4 roles, fondo, rubro, proveedor y contrato.
- [ ] Defecto encontrado en la prueba: el perfil se crea en el primer inicio de sesión, no al registrarse. Invitar a alguien que se registró pero nunca entró da "No hay una cuenta de OpenPay con ese correo". Arreglo: crear el perfil al registrarse (disparador en la base) o, como mínimo, corregir el texto de la pantalla.
- [ ] Menor: `ensureProfile` a veces se ejecuta dos veces a la vez y la segunda falla con `Profile_userId_key` (no rompe nada, ensucia la consola).

### Etapa 3 — Pagos
- [x] Pestaña "Pagos" en `/fondos/[id]`: el tesorero registra (borrador), el aprobador aprueba o rechaza, y cada rubro muestra cuánto lleva aprobado. No hizo falta migración: usa `Payment` y `decide_payment`, que ya tenían pruebas SQL.
- [x] Probado en Chrome el 09/11/2026: el tesorero registró dos pagos y no ve botones de decidir; el aprobador aprobó uno de $5.000.000, la base rechazó aprobar otro de $38.000.000 ("El pago excede el presupuesto del rubro", rubro de $40.000.000) y luego lo rechazó a mano.

### Etapa 4 — Extractos y conciliación
- [x] Cuenta bancaria de la organización: el número y la glosa de cada movimiento se cifran en el servidor (`/api/org/bank/encrypt`, AES-256-GCM con `BANK_DATA_KEY`; solo cifra para el tesorero de esa organización).
- [x] Importar extracto CSV (formato propio, `src/lib/bank/csv.ts`, 18 pruebas con `npx jest`): hash SHA-256 del archivo, movimientos, aviso de si cuadra con los saldos, sellar o descartar.
- [x] Conciliar: para cada pago aprobado se ofrecen solo los movimientos que la base aceptaría; deshacer pide motivo.
- [x] Probado en Chrome el 09/11/2026 con `docs/demo/extracto-demo-2026-11.csv`: cuenta registrada, extracto importado y sellado, pago de $5.000.000 conciliado con el movimiento TRF-0002. Sin probar en pantalla: deshacer una conciliación y descartar un borrador.
- [ ] Pendiente: no hay pantalla para leer lo cifrado (número completo, glosas). Hace falta una ruta de descifrado para el tesorero y, más adelante, para el auditor con llave.
- [ ] Pendiente: el conteo de movimientos declarado se toma del propio archivo, así que al sellar la comprobación que de verdad aporta es la de los saldos.

### Etapa 5 — Cerrar lote y anclar (servidor)
- [x] Ruta `/api/org/batch` (09/11/2026): comprueba el rol con el token del usuario, registra y ancla la lista de proveedores, arma el lote (único uso de la llave de servicio: leer las sales), lo registra con `record_budget_batch` y ancla la raíz. Si un intento anterior dejó un lote a medias, lo retoma o lo descarta.
- [x] Pestaña "Lotes" en `/fondos/[id]`: estado de la lista de proveedores, meses por cerrar y lotes con enlace al explorador.
- [x] `src/lib/zk/commitment.ts` en la web es una **copia** de `packages/contracts/src/commitment.ts` (el despliegue de la web no puede importar del otro paquete). Las dos se prueban contra `packages/contracts/test/vectors/commitment.json`.
- [x] Anclaje real de la lista de proveedores, 09/11/2026: huella `0x2d2c8416…41a40e90`, transacción `0x73a5185823169da6b2b5ab4ff31113bd757e751ec6aab571d0daba8e61f44b53` (bloque 56716691 de Base Sepolia). Confirmado contra un nodo público.
- [ ] Probar el cierre de un lote real: el de noviembre de 2026 solo se puede desde el 01/12/2026.
- [ ] Variables nuevas en Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `PUBLISHER_PRIVATE_KEY`, `BANK_DATA_KEY` (y opcional `BASE_SEPOLIA_RPC_URL`). Ya están en el `.env.local` de desarrollo.
- [ ] Límites conocidos: si un proveedor se revoca después de pagarle en el mes, el lote de ese mes no cierra (exige la lista vigente); dos cierres simultáneos pueden chocar en la cadena; la recuperación de una transacción ya enviada solo mira ~22 horas atrás.

### Etapa 6 — Prueba ZK y verificación
- [x] Script `packages/circuits/src/prove-batch.ts` (`npm run prove-batch -- <id del lote>`): lee el lote anclado, comprueba que las raíces recalculadas sean las ancladas, genera la prueba, la verifica y la sube a `BatchProof`.
- [x] Modo `--simular <id del rubro> <AAAA-MM-01>`: arma el lote como lo armaría el servidor y lo prueba sin escribir nada. Corrido el 09/11/2026 con el pago real de noviembre: la prueba verifica (6,4 s) y la raíz de proveedores sale igual a la que ancló la web.
- [x] `/verificar?lote=<id>`: carga la prueba publicada (`PublicBatchProof`), comprueba que lo publicado coincida con lo que afirma la prueba y verifica sola. Probado solo el caso "lote sin prueba"; el caso feliz necesita un lote real.
- [ ] **Desde el 01/12/2026:** cerrar el lote de noviembre (pestaña Lotes, tesorero), correr `npm run prove-batch -- <id>` y abrir `/verificar?lote=<id>`. Es el único tramo del recorrido que falta probar con datos reales.
- [ ] `next build` de la web con las rutas nuevas (no se corrió: el servidor de desarrollo estaba abierto).
- [ ] Actualizar `MODELO_AMENAZA.md` y las pruebas de aceptación si cambia lo que se publica.

## Después del MVP: que la prueba deje de ser autocalificación (09/11/2026)

Hoy la organización fija sus propias reglas (proveedores, presupuesto) y sube su
propio extracto. La prueba atrapa al tesorero que se sale de las reglas, no a una
cúpula que las escribe a su medida. Estas dos etapas atacan eso. Son diseño por
confirmar: se detallan cuando se cierre la Etapa 6.

### Etapa 7 — Las reglas las fija quien pone la plata
- [ ] Rol nuevo de financiador (donante), externo a la organización, ligado a un fondo.
- [ ] El presupuesto por rubro y la lista de proveedores no valen hasta que el financiador los aprueba; cada cambio posterior necesita su aprobación y queda anclado como lista nueva.
- [ ] `/verificar` dice quién aprobó las reglas que se prueban (la organización o un financiador).

### Etapa 8 — Datos de entrada independientes
- [ ] Pago respaldado por factura electrónica: guardar el CUFE y comprobarlo contra la DIAN (confirmar antes qué consulta pública existe y qué permite).
- [ ] Extracto con origen comprobable: explorar extracto firmado digitalmente por el banco o confirmación bancaria; si no existe, decirlo como límite.
- [ ] Cierra el supuesto S5 de `MODELO_AMENAZA.md` solo en la medida en que estas fuentes sean de verdad independientes.

### En paralelo — Cinco conversaciones (trabajo humano)
- [ ] Cinco conversaciones con fundaciones o donantes, con el guion de `VALIDACION_FASE1.md`. Deciden si las Etapas 7 y 8 valen la pena y en qué orden.
