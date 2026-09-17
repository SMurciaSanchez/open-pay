# OpenPay — Plan técnico y de producto

> Fundadores: Sebastián Murcia Sánchez · Nicolás Castillo
> Última actualización: 16/09/2026
> Estado: documento vigente. **Reemplaza la visión "efectivo digital" (Arbitrum, DAI, Bitso, Railgun) de mayo de 2026, que queda descartada.**

---

## 1. Filosofía

> **"La transparencia es para el poder, la privacidad es para las personas, y la criptografía permite no tener que elegir."**

- **Privacidad para las personas.** El dinero personal se comporta como efectivo.
- **Transparencia para quien administra dinero ajeno.** Donaciones, recursos públicos y presupuestos de proyectos dejan un rastro verificable.
- **La privacidad es inversamente proporcional al poder.** Ciudadano: privacidad total. Empresa privada: privacidad sobre su negocio, hasta que recibe dinero público o de donantes. Quien decide cómo se gasta dinero ajeno: verificación sobre ese poder, no sobre su vida personal.
- **Verificar ya no exige ver.** Las pruebas de conocimiento cero permiten rendición de cuentas sin exponer a las personas.

### Qué promete OpenPay (y qué no)

OpenPay **no elimina la corrupción**. Reduce el espacio para ocultarla y cierra las cuatro puertas más usadas:

1. Conflicto de interés
2. Sobrecosto
3. Pago sin contrato
4. Obra o servicio no entregado

**Límites reconocidos:** sobornos en efectivo por fuera del sistema, fuentes de datos capturadas y organizaciones que no adoptan la herramienta. Mitigación: fuentes y validadores independientes entre sí, y adopción exigida por quien pone el dinero (cooperación, fundaciones, bancos de desarrollo, entidades territoriales).

---

## 2. Principios de datos (transparencia vs. privacidad)

Base conceptual: **integridad contextual** — la privacidad se viola cuando la información sale del contexto donde era apropiada. Cada dato responde: quién lo ve, qué exactamente, para qué, cuándo y por cuánto tiempo.

1. **Privado por defecto, transparente por mandato.**
2. **Revelación mínima:** probar ("cumplió la regla") antes que mostrar ("aquí están los pagos").
3. **Agregados en público, individuos en privado.**
4. **Los beneficiarios vulnerables nunca son públicos** (regla fija, no configurable).
5. **Vigilar a los que vigilan:** todo acceso a datos privados queda registrado y anclado.
6. **Acceso con propósito y fecha de vencimiento.**
7. **Nada personal en la cadena:** solo huellas y pruebas.
8. **Riesgo de seguridad antes que transparencia:** si publicar un dato pone en peligro a alguien, no se publica.
9. **Derecho de salida (inspirado en el *ragequit* de Privacy Pools):** el sistema puede negar privacidad o marcar para revisión, pero nunca congelar arbitrariamente dinero legítimo.

### Clasificación de datos

| Nivel | Quién accede | Ejemplos |
|---|---|---|
| Público | Cualquiera | Raíces de Merkle, pruebas ZK, agregados de ejecución de un fondo |
| Agregado | Donantes, veedurías | "92% del fondo ejecutado en salud" |
| Auditor | Auditor o autoridad con llave vigente | Pagos individuales de un fondo, facturas |
| Privado | La organización y el participante | Datos de proveedores, contratos, cuentas |
| Restringido | Mínimo necesario, con registro reforzado | Beneficiarios vulnerables, denunciantes |

### Marco legal colombiano

- **Ley 1712 de 2014** — Transparencia y acceso a la información pública.
- **Ley 1581 de 2012** — Protección de datos personales.
- **SARLAFT** — Prevención de lavado de activos.

Argumento de producto: **OpenPay permite cumplir ambas leyes al mismo tiempo.**

---

## 3. Estrategia

**Empezar como capa de trazabilidad sobre los bancos existentes, no como billetera.** La organización sigue pagando desde su banco; OpenPay registra, concilia, verifica y prueba. Sin custodia de dinero → sin licencia SEDPE en la fase inicial.

Consecuencia en el código: la tabla `Account` deja de ser fuente de verdad y pasa a ser **espejo conciliado** del banco.

**Primer cliente:** organizaciones que administran dinero ajeno (fundaciones, ONG, proyectos con cooperación, entidades territoriales). Las personas entran como proveedores, donantes y beneficiarios.

**Orden:** trazabilidad institucional → participantes con billetera → modo personal privado.

---

## 4. Arquitectura por capas

| Capa | Función | Principio |
|---|---|---|
| **0. Política de datos** | Clasificación de cada dato; las demás capas la obedecen | Privado por defecto |
| **1. Identidad y roles** | Supabase Auth + passkeys; KYC/KYB; separación de funciones (quien configura reglas no aprueba pagos) | Vigilar a los que vigilan |
| **2. Rieles de dinero** | Inicial: importación y conciliación bancaria. Futuro: aliado regulado | No custodiar sin licencia |
| **3. Mandatos** | Fondo, contrato (SECOP II), presupuesto, proveedores autorizados, reglas, actas de entrega | Transparencia para el poder |
| **4. Datos privados** | Postgres + RLS + cifrado por campo con llaves por fondo; `AuditLog` inmutable | Revelación mínima |
| **5. Compromisos** | Hash Poseidon con sal → árbol de Merkle por lote → `CommitmentRegistry` en Base | Nada personal en la cadena |
| **6. Pruebas ZK** | Circuitos (pertenencia/exclusión) + zkVM (reglas agregadas); worker de pruebas; verificador en Base | Probar antes que mostrar |
| **7. Divulgación selectiva** | Llaves con propósito y vencimiento; cada acceso anclado | Acceso con propósito |
| **8. Fuentes externas** | CUFE (DIAN), SECOP II, RUB de beneficiarios finales, confirmaciones bancarias | Independencia de fuentes |
| **9. Interfaces** | App de organización, portal de participantes, portal de auditor, **portal público de verificación** | Agregados en público |

### Herramientas ZK

| Tipo de prueba | Herramienta | Por qué |
|---|---|---|
| Pertenencia y exclusión en conjuntos | **Circuitos (Circom o Noir)** | Rápidos, baratos de verificar, se pueden generar en el dispositivo. Mismo patrón que Privacy Pools |
| Reglas agregadas (sumas, períodos, presupuestos) | **zkVM (SP1 o RISC Zero)** | Reglas complejas escritas en Rust |

> ⚠️ Algunos sistemas de prueba requieren ceremonia de *trusted setup*. Verificar la documentación vigente de cada herramienta: las versiones cambian rápido.

---

## 5. Aprendizajes de Privacy Pools (0xbow)

Referencias: paper de Privacy Pools (Buterin et al., 2023) · repositorio `0xbow-io/privacy-pools-core` · charla "Privacy Pools in production", ETHDam III.

### Cómo funciona

1. **Depósito** → commitment secreto en un árbol de Merkle.
2. **Association Set Provider (ASP)** → revisa depósitos y publica on-chain la raíz del conjunto aprobado.
3. **Retiro privado** → prueba ZK de "mi depósito está en el pool" **y** "está en el conjunto aprobado", sin revelar cuál.
4. **Ragequit** → un depósito rechazado puede retirarse públicamente: el ASP niega privacidad, no confisca.
5. **Relayer** → paga el gas para no revelar la dirección.
6. **Retiros parciales.**

### Qué adoptamos

| Patrón | Aplicación en OpenPay | Fase |
|---|---|---|
| Commitments con Poseidon en árbol de Merkle | `CommitmentRegistry` usa Poseidon en vez de keccak (más barato dentro de circuitos) | 2 |
| Prueba de pertenencia | **Primera regla ZK:** "el pago fue a un proveedor del conjunto autorizado del fondo" sin revelar cuál | 3 |
| Association Set Provider | **Proveedores de conjuntos independientes:** uno para proveedores habilitados, otro para beneficiarios elegibles, otro para sancionados | 3–5 |
| Raíces publicadas on-chain | Cada versión de listas y reglas queda anclada con fecha | 2–3 |
| Pruebas de exclusión | **Conflictos de interés:** el contratista no pertenece al conjunto de vinculados del funcionario, sin revelar ninguno | 5 |
| Pertenencia anónima | Beneficiario prueba elegibilidad sin publicar identidad | 5 |
| Ragequit | **Derecho de salida:** dinero legítimo nunca congelado arbitrariamente | Principio desde ya; técnico en 6 |
| Relayer / paymaster | Los pagos de gas no revelan identidades | 6 |
| Integración directa con sus pools | Modo personal: prueba de legitimidad de fondos sin exponer historial | 7 |

### Qué NO adoptamos

- **Mezcla de fondos en el modo institucional:** quien administra dinero ajeno no es anónimo.
- **Un único ASP que decide todo:** en OpenPay la independencia de fuentes es clave contra la captura.
- **Listas con datos personales on-chain:** solo raíces; los conjuntos completos quedan en la capa privada.

### Experimento inicial

- [ ] Revisar la licencia de `privacy-pools-core` antes de reutilizar código.
- [ ] Clonar, correr sus tests y desplegar en testnet para entender el flujo completo.
- [ ] Adaptar el circuito de pertenencia a **"pago a proveedor autorizado"** con datos de prueba de un fondo.
- [ ] Documentar el resultado (sirve también como carta de presentación ante 0xbow).

---

## 6. Revisión del código actual (16/09/2026)

### 🚨 Seguridad — antes de todo

Registro completo del incidente: [`SEGURIDAD_INCIDENTES.md`](SEGURIDAD_INCIDENTES.md) (INC-001).

- [ ] **Rotar las DOS contraseñas de Postgres** (Supabase → Project Settings → Database) en un **repositorio público**; siguen en el historial de git:
  - `bmfiotbutuslsaxeumik` — estaba en `test-p1.mjs` / `test-p2.mjs`.
  - `garzwhnenhtmpfvfntmk` — estaba en `packages/web/VERCEL_DEPLOYMENT.md`.
- [ ] Actualizar Vercel y los `.env` locales con las nuevas contraseñas.
- [ ] Revisar accesos o datos anómalos en Supabase.
- [ ] Pasar el repo a privado mientras se limpia.
- [x] Scripts de prueba leen `DB_URL` de variable de entorno.
- [x] Contraseña quitada de `VERCEL_DEPLOYMENT.md`.
- [x] `.gitignore` de la raíz reescrito (estaba en UTF-16).
- [x] Migración validada en Postgres local (Docker): borra dinámicamente las versiones sobrecargadas de las funciones antes de recrearlas (`CREATE OR REPLACE` solo fallaba con 42P13).
- [ ] Verificar la migración `supabase/migrations/20260916120000_security_fixes.sql` contra el esquema desplegado y aplicarla:
  - `transfer_funds` y `pay_to_entity` validan `auth.uid()`.
  - Trigger en `Account` que fuerza saldo 0 al crear desde el cliente.
- [ ] Probar: transferencia normal funciona; RPC con `p_sender_id` ajeno devuelve "No autorizado".
- [ ] Confirmar qué proyecto de Supabase usa Vercel (`garzwhnenhtmpfvfntmk` o `bmfiotbutuslsaxeumik`).
- [x] **No borrar `packages/contracts`**: el borrado sin commit de `pivot/efectivo-digital` quedó guardado en un `git stash` y no se aplica.

### Brecha frente a la filosofía

- `TransactionRegistry.sol` emite `amount` en claro y `anchorEntityPayment` publica `description` y `entityId`.
- Hash sin sal y con keccak → vinculable y costoso dentro de circuitos.
- Una transacción on-chain por pago → gas lineal.

### Congelado (no aporta a validar la tesis)

App móvil · panel de admin con datos simulados · pagos a entidades · chatbot de soporte · `dashboard/TransferForm.tsx` (TODO) · carpeta `app/` de la raíz.

### Pendiente menor

- `test-p1.mjs` / `test-p2.mjs` usan la firma antigua de `transfer_funds` y deben simular JWT.
- README: actualizar equipo, semestre, visión y mencionar `packages/contracts`.

---

## 7. Hoja de ruta

| Fase | Entregable | Criterio de terminado |
|---|---|---|
| **0. Incendios** (esta semana) | Seguridad, visión acordada entre fundadores, rama `pivot/trazabilidad` | Ambas contraseñas rotadas, migración aplicada, repo limpio |
| **1. Validación** (4–6 semanas; **pospuesta**, obligatoria antes de la Fase 4) | 15–20 entrevistas (fundaciones, ONG, revisores fiscales, cooperación, veedurías); primera asesoría legal (datos, SARLAFT, licencia; innovasfc, consultorios jurídicos) | **2–3 organizaciones dispuestas a pilotear** |
| **2. Cimientos** ✅ | Clasificación de datos ([`POLITICA_DATOS.md`](POLITICA_DATOS.md) ✅); modelo de amenaza ([`MODELO_AMENAZA.md`](MODELO_AMENAZA.md) ✅); modelo de mandatos ✅; `AccessLog` de accesos ✅; conciliación bancaria ✅; `CommitmentRegistry` con Poseidon y lotes ✅ | Ningún monto, nombre o descripción on-chain — **cumplido**: `publishRoot` solo recibe `bytes32` y no existe función que acepte texto ni montos |
| **3. Primera prueba end-to-end** (en curso) | Regla ZK "proveedor autorizado + dentro del presupuesto" ✅ ([`packages/circuits`](../packages/circuits/README.md)); portal público de verificación ✅ (`/verificar`); ceremonia de confianza ⚠️ ([`CEREMONIA.md`](CEREMONIA.md) — la actual es de desarrollo); anclar la huella de la clave ⬜; primera revisión de seguridad externa ⬜ | Cualquiera verifica una prueba desde el navegador sin cuenta |
| **4. Piloto** | Una organización real, datos reales, sin mover dinero | Medir reducción de tiempo de auditoría y uso por donantes |
| **5. Anticorrupción** | CUFE, SECOP II, alertas de precios, actas de entrega firmadas, prueba de exclusión para conflictos de interés, denuncia anónima verificable (p. ej. Semaphore) | Las cuatro puertas cubiertas |
| **6. Mover dinero** | Aliado regulado; smart wallet con passkeys y recuperación para participantes; derecho de salida técnico; paymaster | Pagos reales con trazabilidad nativa |
| **7. Modo personal privado** | Pruebas de legitimidad tipo Privacy Pools | Solo con respaldo legal sólido |

**Métrica que importa:** que una organización real diga *"esto me ahorra la auditoría y le da confianza a mis donantes"*.

---

## 8. Requisitos para operar como solución real

- Asesoría legal (datos personales, SARLAFT, licencia o aliado regulado).
- Evaluación de impacto en privacidad antes del lanzamiento.
- Auditoría externa de contratos y circuitos antes de manejar dinero o datos reales.
- Seguridad de nivel financiero.

---

## 9. Comandos útiles

```powershell
# Web
cd packages/web
npm install
npm run dev

# Contratos y compromisos (Poseidon, árboles de Merkle)
cd packages/contracts
npm install
npx hardhat test
npx hardhat run scripts/deploy.ts --network baseSepolia
```

```sh
# Base de datos: aplica todas las migraciones dos veces en un Postgres
# desechable y corre las 147 pruebas. Requiere Docker, no toca Supabase.
sh packages/web/supabase/tests/run.sh
```

## 10. Cómo encajan las piezas de la Fase 2

```
Pago (DRAFT)
  → decide_payment()        APPROVED   quien lo crea no lo aprueba
  → reconcile_payment()     RECONCILED hay un movimiento en un extracto sellado,
                                       del mismo monto y posterior a la aprobación
  → record_payment_batch()  el compromiso Poseidon del pago entra a un árbol
  → anchor_payment_batch()  la raíz queda en CommitmentRegistry (Base)
  → prove()                 el circuito demuestra la regla sobre ese lote
  → /verificar              cualquiera comprueba la prueba en su navegador
```

Un pago solo llega a la cadena si pasó por todos los pasos, y a la cadena solo
llega la raíz. El contrato guarda `bytes32` y nada más; el monto, el proveedor y
el concepto se quedan en la base, y la sal que los protege (`Payment.salt`, N4)
no la puede leer ningún rol de cliente.

**Lo que esto prueba:** que un conjunto de pagos existía, con esos valores, y no
cambió desde la fecha anclada. **Lo que no prueba:** que el banco movió el
dinero. El extracto lo importa la propia organización; lo que se gana es que
quede sellado, cuadrado contra sus saldos y con el SHA-256 del archivo original,
de modo que manipularlo exija falsificar también el PDF del banco (supuesto S5
de [`MODELO_AMENAZA.md`](MODELO_AMENAZA.md)). La confirmación directa con el
banco es Fase 6.
