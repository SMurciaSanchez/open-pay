# OpenPay — Política de datos (Capa 0)

> Autores: Sebastián Murcia Sánchez · Nicolás Castillo
> Versión: 0.1 — 16/09/2026
> Relacionado: [`VISION_OPENPAY.md`](./VISION_OPENPAY.md) · [`MODELO_AMENAZA.md`](./MODELO_AMENAZA.md)
>
> **Esta política manda sobre el código.** Toda tabla, columna, endpoint, evento on-chain o pantalla nueva
> debe tener un nivel asignado aquí antes de implementarse. Si un dato no está en el inventario, se trata como **N3 — Privado**.

---

## 1. La regla de oro

Cada dato debe responder cinco preguntas:

| Pregunta | Qué define |
|---|---|
| **¿Quién lo ve?** | Rol o actor autorizado |
| **¿Qué exactamente ve?** | Valor completo, agregado, prueba o nada |
| **¿Para qué?** | Finalidad legítima (Ley 1581: principio de finalidad) |
| **¿Cuándo?** | Momento o evento que habilita el acceso |
| **¿Por cuánto tiempo?** | Retención y vencimiento del acceso |

> "Registremos lo necesario y revelemos lo mínimo necesario."

---

## 2. Niveles de clasificación

| Nivel | Nombre | Quién accede | Forma de acceso | Ejemplo |
|---|---|---|---|---|
| **N0** | **Público** | Cualquiera, sin cuenta | Valor completo | Nombre de un fondo, raíz de Merkle, prueba ZK |
| **N1** | **Agregado público** | Cualquiera, sin cuenta | Solo agregados que cumplan las reglas de la sección 4 | "92% del fondo ejecutado en salud" |
| **N2** | **Auditor** | Auditor, revisor fiscal, autoridad, donante con derecho | Llave con propósito y vencimiento; cada acceso queda registrado | Pagos individuales de un contrato |
| **N3** | **Privado** | El titular del dato y la organización que lo administra (roles específicos) | RLS + cifrado por campo | Datos de contacto de un proveedor, dinero propio de una persona |
| **N4** | **Restringido** | Mínimo de personas con necesidad estricta; **nunca** público ni en agregados pequeños | RLS + cifrado + aprobación doble + registro | Beneficiarios vulnerables, datos de salud, datos de víctimas |

### Reglas fijas (no configurables por ninguna organización)

1. **N4 nunca sube de nivel.** Ningún administrador puede publicar un dato N4, ni siquiera agregado si el grupo es pequeño.
2. **Nada N2, N3 ni N4 va a la cadena.** On-chain solo se permite lo de la sección 5.
3. **Dinero propio de personas = N3 por defecto.** Solo el titular decide revelarlo.
4. **Dinero ajeno = verificable.** Las afirmaciones sobre su administración deben poder probarse (N0 vía prueba ZK) y su detalle debe estar disponible para auditoría (N2).
5. **Seguridad antes que transparencia.** Si publicar algo pone en riesgo a una persona, baja de nivel, aunque otra regla diga lo contrario. Esta excepción queda registrada con su justificación.

---

## 3. Inventario de datos

### 3.1 Datos que existen hoy en el código

| Dato | Tabla / origen | Nivel | Quién ve | Para qué | Retención | Notas |
|---|---|---|---|---|---|---|
| Email, nombre completo | `Profile` / Supabase Auth | N3 | Titular; admin de la plataforma | Identificación y contacto | Mientras la cuenta exista + plazo legal | |
| Teléfono | `Profile.phone` | N3 | Titular; admin | Contacto, 2FA | Igual | |
| Número de documento | Formulario KYC (`IdentityVerification.tsx`) | N3 (→ cifrado por campo) | Titular; verificación KYC | Identificación legal | Plazo SARLAFT | Verificar dónde se guarda; si se persiste, **cifrar** |
| Documentos KYC (imágenes) | Storage | N4 | Solo verificador KYC | Cumplimiento | Plazo SARLAFT, luego borrar | Nunca exponer en la app web |
| Secreto 2FA (TOTP) | Auth | N4 (secreto técnico) | Nadie (solo el sistema) | Autenticación | Mientras esté activo | Nunca se devuelve al cliente después del alta |
| Saldo | `Account.balance` | N3 | Titular | Operación | — | Pasa a espejo conciliado con el banco |
| Transacción P2P (monto, contraparte, descripción) | `Transaction` | N3 | Las dos partes | Operación | Plazo contable | Dinero propio → privado |
| Pago a entidad | `Transaction` + `EntityReceiver` | N3 | Pagador | Operación | Plazo contable | Funcionalidad congelada |
| Directorio de entidades | `EntityReceiver` | N0 | Cualquiera | Mostrar destinatarios | Indefinida | Datos institucionales |
| Registro de auditoría | `AuditLog` | N2 | Auditor de seguridad; admin | Vigilar a los que vigilan | Mínimo 5 años | Solo inserción (append-only) |
| IP del usuario | `AuditLog.ipAddress` | N3 | Seguridad | Detección de fraude | 12 meses | Minimizar |
| Hash por transacción on-chain | `TransactionRegistry` (Base) | **❌ Incumple** | — | — | Permanente | Los eventos publican **monto y timestamp exacto** (y `metadata` = descripción en pagos a entidad); el hash no tiene sal → reemplazar por `CommitmentRegistry` |

### 3.2 Datos del modelo de mandatos (Fase 2)

| Dato | Tabla | Nivel | Quién ve | Para qué | Retención |
|---|---|---|---|---|---|
| Nombre, NIT y tipo de la organización | `Organization` | N0 | Cualquiera | Saber quién responde | Indefinida |
| Miembros y su rol (un rol por persona por organización) | `OrgMember` | N3 | Miembros de la organización | Separación de funciones | Mientras sea miembro + plazo legal |
| Nombre y propósito del fondo | `Fund` | N0 | Cualquiera | Rendición de cuentas | Indefinida |
| Organización administradora | `Fund` | N0 | Cualquiera | Saber quién responde | Indefinida |
| Monto total del fondo | `Fund` | N0 (N2 si la organización es privada y así lo pacta con sus donantes) | Cualquiera / donantes | Rendición de cuentas | Indefinida |
| Presupuesto por rubro | `Budget` | N1 | Cualquiera | Comparar ejecución vs. plan | Indefinida |
| Objeto y valor del contrato | `Contract` | N0 si es contrato público (ya es público en SECOP II); N2 si es privado | Según el caso | Verificar pagos | Plazo contable |
| Enlace SECOP II | `Contract` | N0 | Cualquiera | Fuente externa | Indefinida |
| Nombre / NIT del proveedor autorizado | `AuthorizedVendor` | N2 (N0 si ya es público en SECOP) | Auditor | Verificar destino de pagos | Plazo contable |
| Datos bancarios del proveedor | `VendorBankAccount` (tabla aparte) | N3 (cifrado por la aplicación) | Tesorería de la organización | Pagar | Mientras sea proveedor |
| Reglas del fondo (parámetros) | `FundRule` | N0 | Cualquiera | Saber qué se está probando | Indefinida |
| Pago individual (monto, fecha, proveedor, concepto) | `Payment` | N2 | Auditor con llave vigente | Auditoría | Plazo contable |
| Sal de cada pago | `Payment.salt` | N4 (secreto técnico) | Nadie (solo el sistema y el generador de pruebas) | Compromisos | Hasta la supresión (ver 6) |
| Extracto bancario importado | `BankStatement` | N3 | Tesorería | Conciliación | Plazo contable |
| Beneficiario final de un programa | `Beneficiary` | **N4** | Operador del programa | Entregar la ayuda | Mínimo necesario |
| Ejecución agregada del fondo | vista | N1 | Cualquiera | Rendición de cuentas | Indefinida |
| Llave de auditoría (quién, qué fondo, propósito, vence) | `AccessGrant` | N2 | Auditor, admin, y **el público ve que existe** (sin detalle) | Vigilar a los que vigilan | Mínimo 5 años |
| Registro de acceso a datos N2-N4 | `AccessLog` | N2 | Auditor de accesos | Vigilar a los que vigilan | Mínimo 5 años |

---

## 4. Reglas para agregados públicos (N1)

Un agregado solo se publica si:

1. **Tamaño mínimo del grupo (k ≥ 10).** Si una celda agrupa menos de 10 registros o personas, se suprime o se fusiona con otra ("Otros").
2. **Sin celdas dominantes.** Si un solo registro representa más del 80% de una celda, se suprime (revelaría el monto de ese pago).
3. **Sin diferencias explotables.** No se publican dos agregados cuya resta aísle a un individuo (p. ej. "total del fondo" y "total sin el proveedor X").
4. **Redondeo.** Montos a millones o a porcentajes enteros, según el tamaño del fondo.
5. **Publicación periódica, no en tiempo real.** Los agregados se actualizan por periodo (mensual por defecto) para que no se puedan deducir pagos individuales comparando antes y después.
6. **Datos N4 solo con k ≥ 50** y previa revisión manual.

---

## 5. Qué puede ir a la cadena (lista cerrada)

| Permitido on-chain | Prohibido on-chain |
|---|---|
| Raíz de Merkle de un lote | Montos individuales |
| Identificador opaco del lote y del fondo (hash con sal del ID) | Nombres, NIT, cédulas, emails |
| Timestamp del lote (redondeado al periodo) | Descripciones o conceptos |
| Prueba ZK y sus entradas públicas definidas en `MODELO_AMENAZA.md` | IDs de base de datos en claro |
| Hash de un `AccessGrant` y de cada evento de acceso | Hash sin sal de cualquier dato con pocos valores posibles |
| Parámetros públicos de una regla (N0) | Timestamps exactos de pagos individuales |

**Reglas de construcción:**
- Cada hoja del árbol: `H(sal_32_bytes ‖ registro_canónico)`. La sal es aleatoria por registro.
- Lotes a **intervalo fijo** (24 h por defecto), no por evento.
- Lotes **rellenados a tamaño fijo** (potencia de 2) con hojas aleatorias, para no revelar cuántos pagos hubo.

---

## 6. Derechos del titular (Ley 1581) y blockchain

| Derecho | Cómo se cumple |
|---|---|
| **Conocer y acceder** | Pantalla "Mis datos" con todo lo N3 del titular y quién accedió (desde `AccessLog`) |
| **Actualizar y rectificar** | Edición en la app; los compromisos ya anclados no cambian, se ancla un registro de corrección |
| **Suprimir** | *Crypto-shredding*: se borra el dato y **su sal** de Postgres. El hash on-chain queda, pero es imposible de vincular con nadie |
| **Revocar la autorización** | Igual que suprimir, salvo lo que la ley obligue a conservar (contabilidad, SARLAFT) |
| **Ser informado del uso** | Aviso de privacidad con la finalidad de cada dato (esta tabla) |

Datos sensibles (salud, víctimas, menores, art. 5 y 7 Ley 1581) → **N4 siempre**, con autorización explícita.

---

## 7. Relación con la Ley 1712 (transparencia)

Para entidades públicas y privadas que administran recursos públicos:

- La información del contrato, el valor y la ejecución es pública por defecto → N0/N1.
- Las excepciones de la ley (información clasificada por derechos de las personas o reservada por seguridad) se implementan bajando el nivel (N2-N4) con una **justificación registrada**.
- OpenPay no decide qué es reservado: la organización lo marca y la decisión queda registrada y visible para el auditor.

---

## 8. Acceso con propósito (N2)

Toda llave de auditoría (`AccessGrant`) debe tener:

| Campo | Ejemplo |
|---|---|
| Quién | Revisor fiscal X (identidad verificada) |
| Qué | Pagos del fondo F, contrato C |
| Para qué | Auditoría anual 2026 |
| Desde / hasta | 01/10/2026 – 31/10/2026 |
| Quién la aprobó | Representante legal (no puede ser el mismo que la usa) |

- Al vencer, la llave deja de funcionar automáticamente.
- Cada consulta genera un registro en `AccessLog` y, por lotes, su hash va a la cadena.
- Cualquier ciudadano puede ver **que existe** una auditoría en curso sobre el fondo F, sin ver quién ni qué consultó.

---

## 9. Separación de funciones (roles)

| Rol | Puede | No puede |
|---|---|---|
| Configurador | Crear fondos, contratos, reglas | Aprobar pagos |
| Aprobador | Aprobar pagos | Cambiar reglas ni proveedores autorizados |
| Tesorero | Importar extractos, conciliar | Aprobar sus propios pagos |
| Auditor | Leer N2 con llave vigente | Modificar nada |
| Admin de plataforma (OpenPay) | Operar la infraestructura | Leer N2-N4 sin llave; todo acceso de emergencia queda registrado |

---

## 10. Pendientes para cumplir esta política en el código

- [ ] Verificar dónde se guarda el número de documento del KYC; cifrarlo por campo junto con los datos bancarios.
- [ ] Reemplazar `TransactionRegistry` (publica montos y descripción) por `CommitmentRegistry`.
- [x] Crear `AccessGrant` y `AccessLog` (migración `20260916180000_mandates.sql`).
- [ ] Enlazar `AccessLog` con el `AuditLog` existente y anclar sus hashes por lotes.
- [x] Vista de agregados con supresión k ≥ 10, sin celdas dominantes, meses cerrados (`PublicBudgetExecution`).
- [ ] Cifrado por campo de `VendorBankAccount` (llaves por fondo, Capa 4).
- [ ] Pantalla "Mis datos".
- [ ] Aviso de privacidad basado en la sección 3.
- [ ] Revisión por asesoría legal (Ley 1581, Ley 1712, SARLAFT) antes del piloto.
