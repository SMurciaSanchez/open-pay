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
- [x] Además: `record_vendor_set` / `anchor_vendor_set`, `record_budget_batch` (exige TODOS los pagos conciliados del rubro en el mes, mes cerrado, lista anclada) y `discard_unanchored_batch`.
- [ ] **Aplicarla en Supabase** (SQL Editor) — la hace el usuario.

### Etapa 2 — Organización y fondo
- [ ] `/organizacion`: crear la organización, ver miembros, invitar por correo.
- [ ] `/fondos` y `/fondos/[id]`: fondo, rubros, contratos, proveedores autorizados.
- [ ] Menú lateral: sección de organización; sacar las pantallas de la billetera vieja.

### Etapa 3 — Pagos
- [ ] Tesorero registra pagos (borrador); aprobador aprueba o rechaza.

### Etapa 4 — Extractos y conciliación
- [ ] Cuenta bancaria de la organización (el número se cifra en el servidor).
- [ ] Importar extracto CSV: hash SHA-256 del archivo, movimientos, sellar.
- [ ] Conciliar: emparejar cada pago aprobado con un movimiento.

### Etapa 5 — Cerrar lote y anclar (servidor)
- [ ] Ruta de API: comprueba el rol, arma la lista de proveedores y el lote, ancla las dos raíces en Base Sepolia y guarda todo.
- [ ] Pantalla de lotes por fondo, con estado y enlace al explorador.
- [ ] Variables nuevas en Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `PUBLISHER_PRIVATE_KEY`, `BASE_SEPOLIA_RPC_URL`, `BANK_DATA_KEY`.

### Etapa 6 — Prueba ZK y verificación
- [ ] Script `packages/circuits/src/prove-batch.ts`: lee el lote, genera la prueba, la verifica y la sube.
- [ ] `/verificar?lote=<id>`: carga la prueba publicada y verifica sola.
- [ ] Prueba de punta a punta en Chrome con las 4 cuentas.
- [ ] Actualizar `MODELO_AMENAZA.md` y las pruebas de aceptación si cambia lo que se publica.
