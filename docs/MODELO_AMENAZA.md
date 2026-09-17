# OpenPay — Modelo de amenaza y pruebas de aceptación (MVP)

> Autores: Sebastián Murcia Sánchez · Nicolás Castillo
> Versión: 0.1 — 16/09/2026
> Relacionado: [`VISION_OPENPAY.md`](./VISION_OPENPAY.md) (sección 6) · [`POLITICA_DATOS.md`](./POLITICA_DATOS.md)
>
> Sin un modelo de amenaza, "es privado" y "es verificable" son frases de marketing.
> Este documento define **contra quién**, **bajo qué supuestos** y **con qué prueba** se sostienen.

---

## 1. Alcance del MVP

Flujo cubierto:

```
Organización registra: Fondo → Contrato (presupuesto) → Proveedores autorizados
                                     ↓
                    Pagos (registrados / importados del banco)
                                     ↓
      Hojas con sal → Árbol de Merkle por lote → raíz en CommitmentRegistry (Base)
                                     ↓
          zkVM prueba la afirmación X → verificador on-chain → portal público
```

Fuera del alcance del MVP: movimiento real de dinero, conflictos de interés, sobrecostos, actas de entrega, CUFE, divulgación selectiva completa, app móvil.

---

## 2. Las afirmaciones

### X — lo que debe ser verificable (transparencia)

> **X(F, C, P):** "Durante el periodo P, todos los pagos registrados del contrato C del fondo F fueron a proveedores autorizados para C, y su suma no supera el presupuesto de C."

Descompuesta:
- **X1** — Cada pago del lote pertenece a C y su destinatario está en la lista de proveedores autorizados de C (comprometida en una raíz propia).
- **X2** — Σ montos de los pagos de C en P ≤ presupuesto(C).
- **X3** — Los pagos usados en la prueba son exactamente los comprometidos en las raíces ancladas para P (no se omitió ni se inventó ninguno *respecto de lo registrado*).

### Y — lo que debe permanecer privado

> **Y1:** El monto de cualquier pago individual.
> **Y2:** La identidad del proveedor que recibió un pago específico.
> **Y3:** Que una persona o proveedor específico participó en el fondo (cuando su nivel es N2 o superior).
> **Y4:** El número exacto de pagos y su ritmo (fechas individuales).
> **Y5:** Cualquier dato N4 (beneficiarios vulnerables), incluso por inferencia.

---

## 3. Qué es público (lo que tiene el adversario)

El adversario conoce **todo** esto:

| Fuente | Contenido |
|---|---|
| Cadena (Base) | Raíces de Merkle, ID opaco de fondo y lote, timestamp del lote (redondeado), pruebas ZK y sus entradas públicas, hashes de `AccessGrant`/`AccessLog`, dirección del firmante |
| Portal público | Nombre y propósito del fondo, organización, reglas (N0), agregados N1, resultado de verificación ✓/✗ |
| Fuentes externas | SECOP II, RUES, noticias, redes sociales, extractos filtrados, conocimiento del sector |
| Código | Todo el código de OpenPay (código abierto, principio de Kerckhoffs) |

**Entradas públicas de la prueba ZK (y nada más):**
- `fundId_opaco`, `contractId_opaco`
- `raiz_pagos[]` de los lotes del periodo P
- `raiz_proveedores_autorizados(C)`
- `presupuesto(C)` si el contrato es N0; si no, `commitment(presupuesto)`
- `periodo P`
- salida: `ok ∈ {0,1}`

---

## 4. Supuestos de confianza

| # | Supuesto | Qué pasa si falla |
|---|---|---|
| S1 | Las primitivas criptográficas (keccak/SHA-256, Groth16) son seguras | Se rompe todo |
| S2 | La zkVM (SP1 o RISC Zero) y su verificador on-chain son correctos (*sound*) | Se podrían "probar" afirmaciones falsas |
| S3 | Base no reescribe su historial más allá de la finalidad | Se podrían cambiar raíces ancladas |
| S4 | Las sales son aleatorias (CSPRNG, 32 bytes) y nunca salen de la base privada | Hashes adivinables por fuerza bruta → se rompe Y1/Y2 |
| S5 | **La organización registra los pagos reales** (en el MVP no hay conexión bancaria verificada) | X es cierta sobre lo registrado, no necesariamente sobre la realidad |
| S6 | Postgres/Supabase aplica RLS correctamente y las credenciales no están comprometidas | Fuga de N2-N4 (ver `SEGURIDAD_INCIDENTES.md`, INC-001) |

> ⚠️ **Límite honesto del MVP (S5):** la prueba garantiza que *lo registrado* cumple la regla y que *lo registrado no se alteró después de anclarse*. No garantiza que lo registrado coincida con el banco. Eso se cierra en fases posteriores con extractos firmados, confirmaciones bancarias y CUFE. **Hay que decirlo así en la presentación.**

---

## 5. Adversarios

| Adversario | Capacidades | Objetivo | Propiedad amenazada |
|---|---|---|---|
| **A1 — Público curioso / analista de cadena** | Todo lo público (sección 3), herramientas de análisis, fuerza bruta razonable | Reconstruir montos, proveedores, patrones | Y1-Y5 |
| **A2 — Extorsionador / grupo armado** | Lo de A1 + conocimiento local (quién es contratista en qué municipio) | Identificar quién recibe dinero y cuánto | Y2, Y3, Y5 |
| **A3 — Competidor comercial** | Lo de A1 + sus propios precios | Deducir precios y márgenes del proveedor | Y1, Y2 |
| **A4 — Administrador corrupto** | Acceso de escritura a los datos de su organización | Pagar a quien no debe o por encima del presupuesto y obtener un ✓ | X1, X2, X3 |
| **A5 — Operador de OpenPay malicioso o comprometido** | Acceso a la infraestructura, puede generar pruebas y firmar anclajes | Emitir ✓ falsos o alterar registros ya anclados | X1-X3 |
| **A6 — Auditor abusivo** | Llave N2 legítima | Usar el acceso fuera de su propósito o después de vencer | Y1-Y3 |
| **A7 — Atacante externo** | Credenciales robadas, vulnerabilidades web | Leer o modificar la base privada | Y1-Y5, X3 |

---

## 6. Ataques y mitigaciones

### Contra la privacidad (Y)

| Ataque | Contra | Mitigación | Estado |
|---|---|---|---|
| Fuerza bruta a un hash sin sal (pocos montos/proveedores posibles) | Y1, Y2 | Sal de 32 bytes por hoja (S4) | Diseño |
| Contar hojas del árbol → número de pagos | Y4 | Lotes rellenados a tamaño fijo con hojas aleatorias | Diseño |
| Correlacionar timestamps de anclaje con fechas de pagos conocidas | Y4, Y2 | Lotes a intervalo fijo (24 h), timestamp redondeado | Diseño |
| Restar agregados publicados | Y1 | Reglas de agregados (POLITICA_DATOS §4): k ≥ 10, sin celdas dominantes, sin diferencias explotables, publicación periódica | Diseño |
| Deducir un pago por el cambio del agregado entre dos publicaciones | Y1 | Publicación periódica + redondeo | Diseño |
| Presupuesto público − agregado ejecutado con un solo pago en el periodo | Y1 | No publicar ejecución de un contrato con menos de k pagos en el periodo | Diseño |
| Entradas públicas de la prueba filtran datos | Y1-Y4 | Lista cerrada de entradas públicas (§3); revisión de cada circuito | Diseño |
| Direcciones on-chain vinculables a la organización | Y3 | El firmante es de OpenPay, no de cada organización; IDs de fondo opacos | Diseño |
| Auditor usa la llave fuera de propósito | Y1-Y3 | Llaves con alcance y vencimiento; `AccessLog` anclado; aprobación por otra persona | Fase 5 |
| Robo de la base privada | Y1-Y5 | RLS, cifrado por campo, rotación de credenciales, escaneo de secretos | Parcial (INC-001 abierto) |

### Contra la transparencia (X)

| Ataque | Contra | Mitigación | Estado |
|---|---|---|---|
| Probar sobre una lista de pagos incompleta | X3 | La prueba recibe las raíces ancladas de **todos** los lotes de P y verifica pertenencia; el verificador comprueba que esas raíces son las registradas en `CommitmentRegistry` para P | Diseño |
| Cambiar pagos después de anclarlos | X3 | Raíz inmutable en Base (S3) | Diseño |
| Agregar un proveedor autorizado "a última hora" | X1 | La lista de proveedores también se compromete y se ancla con fecha; el cambio queda visible como nueva raíz | Diseño |
| Subir el presupuesto después de pagar | X2 | Presupuesto comprometido y anclado al crear el contrato; cambios quedan como nueva versión visible | Diseño |
| OpenPay emite un ✓ sin prueba válida | X | El portal **no** muestra el ✓ de la base de datos: llama al verificador on-chain o permite verificar localmente | Diseño |
| Pagos por fuera del sistema (nunca registrados) | X | **No mitigado en el MVP** (S5). Futuro: conciliación con extractos firmados / confirmación bancaria | Pendiente |
| Firmante de OpenPay comprometido ancla raíces falsas | X3 | Multisig para el firmante; la organización también firma sus raíces | Fase 3+ |

---

## 7. Pruebas de aceptación

Ninguna fase se da por terminada sin pasar las dos. Deben ser **reproducibles por un tercero** con un script del repo.

### PT — Prueba de transparencia

**Objetivo:** un tercero verifica X sin confiar en OpenPay.

Procedimiento:
1. El verificador obtiene de la cadena, **sin usar la API de OpenPay**, las raíces de los lotes del periodo P y la prueba publicada.
2. Ejecuta el verificador (contrato on-chain vía RPC público, o verificador local de la zkVM).
3. Comprueba que las entradas públicas de la prueba coinciden con las raíces ancladas.

Criterio de aceptación:
- ✅ Una prueba válida devuelve `ok = 1` usando solo datos públicos.
- ✅ **Casos negativos** (con datos de prueba): un pago a un proveedor no autorizado, un total por encima del presupuesto, y un pago omitido del lote → **no** se puede generar una prueba que verifique como `ok = 1`.
- ✅ Modificar un pago después de anclado → la prueba nueva no coincide con la raíz anclada.
- ✅ El portal público muestra el mismo resultado que el verificador independiente.

Script previsto: `packages/contracts/test/acceptance/transparency.test.ts`.

### PP — Prueba de privacidad

**Objetivo:** con todo lo público no se deduce Y mejor que antes de observarlo.

Procedimiento (juego de indistinguibilidad simplificado):
1. Se generan dos escenarios de datos **A** y **B** que difieren solo en Y (p. ej. el monto de un pago, o qué proveedor lo recibió), con el mismo resultado de X y los mismos agregados publicables.
2. Se publica todo lo que OpenPay publicaría para A o para B, elegido al azar.
3. Un "atacante" (script + revisión manual de otra persona del equipo) recibe **todo** lo público y trata de decir si es A o B.

Criterio de aceptación:
- ✅ El atacante no acierta más del ~50% en muchas repeticiones.
- ✅ Revisión manual: ningún evento on-chain, entrada pública, respuesta de API sin autenticación o página del portal contiene datos N2-N4 (búsqueda de montos, nombres, NIT e IDs de prueba en todo lo publicado).
- ✅ Fuerza bruta: con una lista de montos y proveedores posibles, no se reproduce ninguna hoja del árbol.
- ✅ Contar hojas o comparar timestamps no revela el número ni las fechas de los pagos.
- ✅ Los agregados cumplen las reglas de `POLITICA_DATOS.md` §4 (test automático sobre la vista).

Script previsto: `packages/contracts/test/acceptance/privacy.test.ts`.

### Redacción de las garantías (usar esta, no otra)

- **Transparencia:** "La validez de X puede ser comprobada criptográficamente por un tercero independiente, sin confiar en OpenPay como autoridad sobre el resultado, **respecto de los pagos registrados y anclados**."
- **Privacidad:** "Bajo el modelo de amenaza definido (adversarios A1-A3 con acceso a toda la información pública), la información pública de OpenPay no permite inferir Y1-Y5 con una ventaja significativa respecto de la información disponible antes de observarla."

---

## 8. Riesgos residuales conocidos (decirlos siempre)

1. **Dato de entrada falso (S5):** el MVP verifica lo registrado, no la realidad bancaria.
2. **Contratos públicos:** si el contrato ya es público en SECOP II con su valor y su contratista único, Y2 no aplica para ese contrato (la información ya es pública por ley). La privacidad protege a los proveedores de contratos privados y a los beneficiarios.
3. **Organizaciones pequeñas:** con muy pocos pagos, los agregados se suprimen y hay menos que mostrar al público.
4. **Metadatos fuera de OpenPay:** extractos bancarios, correos o conversaciones pueden revelar Y sin pasar por el sistema.
5. **Dependencia de la zkVM:** un error en SP1 / RISC Zero afecta la validez; fijar versiones auditadas.
6. **Credenciales:** INC-001 sigue abierto hasta rotar las contraseñas.

---

## 9. Revisión

Este modelo se revisa:
- Al agregar cualquier dato nuevo a la cadena o al portal.
- Al agregar una regla ZK nueva (cada regla define su X y sus entradas públicas).
- Antes del piloto (Fase 4), con asesoría externa.
