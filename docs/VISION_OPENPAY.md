# OpenPay — Visión, filosofía, arquitectura y hoja de ruta

> Autores: Sebastián Murcia Sánchez · Nicolás Castillo
> Última actualización: 16/09/2026
> Estado: **✅ visión oficial, acordada por Sebastián y Nicolás el 16/09/2026.**
> Reemplaza el plan "efectivo digital" (Arbitrum + DAI + Railgun, mayo 2026).
> Complementa [`PLAN_OPENPAY_ZK.md`](./PLAN_OPENPAY_ZK.md), que conserva la revisión de código y el checklist de seguridad.

---

## 1. Qué es OpenPay

### Lema

> **OpenPay — Privado como el efectivo. Verificable como un libro contable.**

Versión completa:

> **"OpenPay: privado como el efectivo para las personas, verificable como un libro contable para quien administra dinero ajeno."**

Versión corta para producto:

> **"Privacidad para tu dinero. Trazabilidad para el dinero que administras."**

(Reemplaza el slogan anterior "Finanzas claras, corrupción cero", que prometía algo absoluto.)

### Tesis

> **"La transparencia es para el poder, la privacidad es para las personas, y la criptografía permite no tener que elegir."**

### Definición (para un profesor, jurado o inversionista)

> "OpenPay es una infraestructura financiera que busca hacer verificable el uso del dinero ajeno sin convertir el dinero propio en información pública. Utiliza trazabilidad, controles de acceso, compromisos criptográficos y pruebas de conocimiento cero para demostrar que determinadas reglas financieras se cumplen revelando la menor cantidad de información posible."

### La promesa (y lo que no promete)

> **"OpenPay no pide que confíes en que es transparente o privado. Diseña el sistema para que puedas comprobar ambas propiedades."**

OpenPay **no elimina la corrupción**. Reduce el espacio para ocultarla en el recorrido del dinero y da a auditores, donantes y ciudadanos evidencia verificable, sin sacrificar la privacidad de las personas. La tecnología no determina por sí sola que hubo corrupción: hace más difícil ocultar inconsistencias y más fácil demostrar qué ocurrió.

---

## 2. El principio fundamental: dinero propio vs. dinero ajeno

> **Privacidad sobre el dinero propio. Transparencia sobre la administración del dinero ajeno.**
>
> OpenPay protege la privacidad de quien posee el dinero y aumenta la verificabilidad de quien lo administra.

```
                 OPENPAY
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
    DINERO PROPIO        DINERO AJENO
          ↓                   ↓
      PRIVACIDAD       VERIFICABILIDAD
          │                   │
          └─────────┬─────────┘
                    ↓
                CONFIANZA
```

### 🧑 Dinero propio → privacidad
Si el dinero es tuyo, tú decides quién conoce tus movimientos. OpenPay no convierte las finanzas personales en información pública. La blockchain está detrás de la infraestructura, pero eso no significa que todo sea visible para todos.

### 🏢 Dinero ajeno → responsabilidad
Quien recibe y gestiona dinero de otros (persona, empresa, fundación, entidad) **debe poder demostrar qué hizo con él**:

```
Fondos recibidos: $100M
        │
  ┌─────┼─────┐
  ↓     ↓     ↓
$40M  $30M  $30M
  ↓     ↓     ↓
  A     B     C
```

Cuánto recibió, de quién, cuándo, cuánto gastó, a quién pagó, para qué, qué saldo queda y cómo se relacionan los movimientos. **Eso es trazabilidad.**

### Los dos extremos que evitamos
- **Privacidad absoluta** ("nadie tiene derecho a saber nada") → impide la rendición de cuentas sobre recursos de terceros.
- **Transparencia absoluta** ("todos ven todas tus transacciones") → destruye la privacidad financiera.

### El papel del blockchain
No es "usamos blockchain porque es innovador", sino:
> "Utilizamos tecnologías de registro verificable para construir una infraestructura donde determinados movimientos financieros puedan ser auditados sin depender exclusivamente de la confianza en quien mantiene el registro."

---

## 3. Las cuatro puertas de la corrupción

OpenPay no promete acabar con la corrupción: se enfoca en **cerrar las cuatro puertas más usadas**.

| Puerta | Qué debe poder probarse (sin exponer) |
|---|---|
| **Conflicto de interés** | Que no hay relación prohibida entre el administrador y el proveedor |
| **Sobrecosto** | Que los precios pagados son razonables frente a referencias |
| **Pago sin contrato o autorización** | Que cada pago corresponde a un contrato autorizado y respeta el presupuesto |
| **Obra o servicio no entregado** | Que lo pagado se entregó (actas firmadas, evidencia) |

> "OpenPay protege la privacidad de las personas y exige verificabilidad a quien administra dinero ajeno: prueba sin exponer que no hay conflictos de interés, que cada pago corresponde a un contrato, que los precios son razonables y que lo pagado se entregó."

---

## 4. Filosofía

### 4.1 Privacidad y transparencia no son opuestos

Las dos son formas de controlar el poder, desde lados distintos:

- **La privacidad protege al débil frente al poderoso.**
- **La transparencia hace que el poderoso responda ante el débil.**

La pregunta real es **¿quién ve qué de quién?**

|                          | Poderosos transparentes                     | Poderosos opacos                         |
|--------------------------|---------------------------------------------|------------------------------------------|
| **Ciudadanos privados**  | ✅ Lo ideal: rendición de cuentas y libertad | Corrupción, pero con libertad individual |
| **Ciudadanos expuestos** | Sociedad de vigilancia mutua                | ❌ Lo peor: autoritarismo                 |

**OpenPay empuja hacia el cuadrante bueno.**

### 4.2 Privacidad no es secreto: es flujo apropiado

Integridad contextual (Helen Nissenbaum): la privacidad se viola cuando la información sale del contexto donde era apropiada. Que el auditor vea un pago es apropiado; que aparezca en internet con el nombre del proveedor, no.

### 4.3 La regla de oro

> **Cada dato debe responder: quién lo ve, qué exactamente ve, para qué lo ve, cuándo puede verlo y por cuánto tiempo.**

Evita el error típico de blockchain: *"como podemos registrar todo, registremos todo"*. OpenPay plantea lo contrario:

> **"Registremos lo necesario y revelemos lo mínimo necesario."**

### 4.4 Lo que la tecnología cambió

Durante siglos, verificar exigía ver. **Las pruebas de conocimiento cero (ZK) rompen ese vínculo**: permiten probar una afirmación sin mostrar los datos que la sustentan. Esa es la oportunidad real de OpenPay, más que el blockchain.

### 4.5 Daños de la transparencia mal hecha
- **Exponer beneficiarios**: víctimas, desplazados, subsidios, donaciones médicas → estigma o riesgo.
- **Extorsión**: publicar cuánto recibe un contratista y dónde opera lo vuelve blanco de "vacunas".
- **Secretos comerciales**: publicar precios y márgenes destruye a un proveedor.
- **Transparencia de fachada**: millones de datos que nadie entiende esconden lo importante.
- **Permanencia**: lo publicado en blockchain no se borra.
- **Metadatos**: horarios, frecuencias y relaciones entre direcciones revelan identidades.

### 4.6 Daños de la privacidad mal hecha
- **Lavado y financiación ilegal.**
- **Captura**: usar la "protección de datos" como excusa para no rendir cuentas.
- **Impunidad**: sin evidencia verificable, palabra contra palabra.

### 4.7 Privacidad que el regulador puede aceptar (horizonte largo)

El problema de Railgun y Tornado Cash es que no separan el dinero legítimo del ilícito. **Privacy Pools** (Buterin et al., 2023): con ZK, el usuario prueba que su dinero **no** viene de un conjunto marcado como ilícito, sin revelar su origen exacto.

Estado a sep. 2026 (verificar antes de usar): 0xbow en Ethereum mainnet desde mar. 2025 (~US$6M, ~1.500 usuarios), seed de US$3,5M (nov. 2025), integrado en la billetera Kohaku de la Ethereum Foundation. Limitaciones: el *Association Set Provider* es centralizado (0xbow) y opera con cripto, no pesos. → **Fase 7.**

---

## 5. Los 8 principios de diseño (obligatorios)

1. **Privado por defecto, transparente por mandato.** Los datos no son públicos solo porque exista una blockchain; se revelan cuando hay una razón legítima y definida.
2. **Revelación mínima: probar > mostrar.** ❌ Mostrar todos los pagos. ✅ Probar que "el 100% de los pagos auditados son a proveedores autorizados".
3. **Agregados públicos, individuos privados.** El ciudadano ve "92% del fondo ejecutado", no "Juan Pérez recibió $3.482.000". El auditor autorizado ve el detalle cuando corresponde.
4. **Beneficiarios vulnerables nunca públicos.** Regla estructural, no configurable.
5. **Vigilar a quienes vigilan.** Todo acceso a datos privados queda registrado: quién + qué + propósito + cuándo. El acceso también es auditable.
6. **Acceso con propósito y vencimiento.** No "el auditor ve todo para siempre", sino "esta persona consulta estos datos, de este fondo, para esta auditoría, durante este periodo". Luego expira.
7. **Nada personal en blockchain.** `Datos personales → base privada → hash / commitment / prueba → blockchain`.
8. **Seguridad antes que transparencia.** Si revelar un dato genera un riesgo desproporcionado, no se revela. La transparencia es un medio para generar confianza, no un valor absoluto.

---

## 6. Pruebas de aceptación (evitar la falsa garantía)

"Blockchain + ZK" no garantiza nada por sí solo. **Ninguna fase avanza sin pasar estas dos pruebas.**

| Propiedad | Pregunta | Resultado requerido |
|---|---|---|
| **Transparencia** | ¿Puede un ciudadano o auditor verificar la afirmación **X** sin confiar en OpenPay? | **Sí** |
| **Privacidad** | ¿Puede alguien con acceso a **todo** lo público deducir **Y** sobre una persona? | **No** |

### Prueba de transparencia
Un tercero recibe los commitments + la prueba ZK + los datos públicos → ejecuta el verificador por su cuenta → obtiene válido / no válido. **El resultado no depende de que OpenPay diga que es verdadero.**

```
Contrato → Presupuesto → Regla → Commitment / prueba → Verificador → ✓
```

### Prueba de privacidad
Un tercero recibe absolutamente todo lo que OpenPay publica (incluyendo timestamps, montos agregados, identificadores, contratos y patrones) → intenta reconstruir la información protegida → no puede, bajo el modelo de amenaza definido. No basta con "los nombres están ocultos": hay que preguntar **qué puede inferirse combinando todo**.

### Redacción correcta (seguridad, no marketing)
- ❌ "OpenPay garantiza que nadie puede conocer Y."
- ✅ **Privacidad**: "Bajo el modelo de amenaza definido, la información pública de OpenPay no debe permitir inferir Y con una ventaja significativa respecto de la información disponible antes de observarla."
- ✅ **Transparencia**: "La validez de X debe poder ser comprobada criptográficamente por un tercero independiente, sin confiar en OpenPay como autoridad sobre el resultado."

### Para el MVP
- **X** = "Este pago está vinculado a un contrato autorizado y está dentro del presupuesto."
- **Y** = "Este ciudadano/proveedor realizó determinada transacción (monto, contraparte)."

### Tres capas conceptuales
- **Privacidad**: no necesitas exponer a las personas para hacer responsable al sistema.
- **Transparencia**: no necesitas confiar en el administrador para verificar ciertas afirmaciones.
- **Evidencia**: ambas propiedades deben demostrarse con pruebas de aceptación.

---

## 7. Marco legal como restricción de diseño

Las leyes no son una diapositiva: **son requisitos de arquitectura**.

- **Ley 1712 de 2014** (Transparencia y acceso a la información pública): la información pública debe ser accesible, con excepciones cuando afecta derechos de las personas o la seguridad.
- **Ley 1581 de 2012** (Protección de datos personales): autorización, finalidad y protección.

Principio: *la transparencia debe coexistir con las restricciones de acceso y protección de datos aplicables.* Esto se traduce en: ¿quién ve qué?, ¿con qué finalidad?, ¿durante cuánto tiempo?, ¿qué debe permanecer privado? (la regla de oro de la sección 4.3).

Argumento de venta: **OpenPay permite cumplir las dos leyes al tiempo.**

### Obligatorio al ir por la solución real
- Asesoría legal en protección de datos, SARLAFT y licencia / aliado regulado para mover pesos.
- Evaluación de impacto en privacidad antes de lanzar.
- Seguridad de nivel financiero, empezando por la contraseña expuesta.

---

## 8. Estrategia: trazabilidad primero, efectivo digital después

### Comparación de visiones (resumen de la decisión)
- **A. Efectivo digital** — ➕ mercado enorme, narrativa fuerte. ➖ riesgo regulatorio muy alto, empezar de cero, billetera propia riesgosa, competencia fuerte.
- **B. Trazabilidad verificable** — ➕ reutiliza el código, viable ante el regulador, problema real de Colombia, compradores claros. ➖ depende de la calidad del dato de entrada, ZK complejo, ventas B2G lentas.

**Elegimos B y crecemos hacia A**:
- B vende primero.
- B le da usuarios a A (proveedores, donantes y beneficiarios de cada fundación).
- La tecnología ZK se reutiliza: "este fondo cumplió las reglas" → "mi dinero es legítimo".

### Capa de trazabilidad sobre los bancos
No empezamos como billetera. La organización sigue pagando desde su banco; OpenPay registra, concilia y prueba esos pagos. **No custodiamos dinero → no necesitamos licencia SEDPE para empezar.** La tabla `Account` pasa a ser un espejo conciliado con el banco.

> ⚠️ El punto medio no elimina la necesidad de un aliado regulado para mover pesos, ni hace simple el modo personal privado. Por eso va al final.

---

## 9. Arquitectura

### Vista conceptual

```
                 OPENPAY
                    │
          ┌─────────┴─────────┐
      PRIVACIDAD          TRAZABILIDAD
          │                   │
    Política de datos     Mandatos
          │               Contratos
      Identidad           Presupuestos
          │                   │
          └──────────→ Rieles de dinero
                              │
                          Evidencia
                              │
                   ┌──────────┴──────────┐
               Hash/Merkle               ZK
                   └──────────┬──────────┘
                         Verificación
                   ┌──────────┼──────────┐
                Auditor     Admin     Ciudadano
```

### Capas

| Capa | Qué hace | Principio | ¿MVP? |
|---|---|---|---|
| **0. Política de datos** | Clasifica cada dato: público, agregado, auditor, privado o restringido (beneficiarios vulnerables). Decide qué puede conocer cada actor. | Privado por defecto | ✅ (documento) |
| **1. Identidad y roles** | Supabase Auth con passkeys; KYC/KYB; separación de funciones (quien configura reglas no aprueba pagos). | Vigilar a los que vigilan | ✅ (roles básicos) |
| **2. Rieles de dinero** | Inicio: importar pagos del banco (CSV de extractos; las APIs de finanzas abiertas en Colombia aún no son confiables) y conciliarlos. Futuro: aliado regulado. | No custodiar sin licencia | ✅ (CSV / registro manual) |
| **3. Mandatos** | Fondo, contrato (enlace a SECOP II), presupuesto, proveedores autorizados, reglas y actas de entrega. **Corazón del producto.** | Transparencia para quien administra dinero ajeno | ✅ |
| **4. Datos privados** | Postgres con RLS y cifrado por campo con llaves por fondo; registro de accesos inmutable. | Revelación mínima | ✅ (RLS + log) |
| **5. Compromisos** | Hash con sal por registro → árbol de Merkle por lote → `CommitmentRegistry` en Base. | Nada personal en la cadena | ✅ |
| **6. Pruebas ZK** | Librería de reglas en una zkVM (SP1 o RISC Zero), worker que genera pruebas, contrato verificador en Base. | Probar antes que mostrar | ✅ (una regla) |
| **7. Divulgación selectiva** | Llaves con propósito y vencimiento para auditores y autoridades; cada acceso queda anclado. | Acceso con propósito | Visión |
| **8. Fuentes externas** | CUFE de la DIAN, SECOP II, RUB, confirmaciones bancarias, cada una validada por separado. | Independencia de las fuentes | Visión |
| **9. Interfaces** | App de la organización, portal de participantes, portal del auditor y **portal público de verificación**. | Agregados en público | ✅ (org + verificador público) |

### Decisiones técnicas
- **Sal = derecho al olvido.** Cada hash on-chain usa una sal guardada solo en Postgres. Borrar la sal hace el hash imposible de vincular (*crypto-shredding*): permite cumplir la supresión de la Ley 1581 aunque la blockchain sea inmutable.
- **Lotes a intervalos fijos** (p. ej. cada 24 h), no por evento, para no filtrar patrones por metadatos.
- **zkVM**: SP1 y RISC Zero se consideran listos para producción. Verificar una prueba Groth16 cuesta ~300k de gas (barato en Base). Generar pruebas con red externa (Succinct Prover Network o Bonsai) antes que GPUs propias.
- **Noir** (pruebas en el navegador): exploración futura.
- **Cadena**: Base (Sepolia para desarrollo). On-chain solo van raíces de Merkle y pruebas; nunca montos individuales, descripciones ni IDs.
- Verificar la documentación vigente de cada herramienta antes de empezar.

---

## 10. Alcance del proyecto universitario

**No se construyen todas las capas.** La arquitectura completa se presenta como visión; se construye:

> **Pago → contrato → presupuesto → regla → evidencia → verificación**

Es decir: la puerta **"pago sin contrato o autorización"** (capas 2 + 3) más **la primera regla ZK** y el verificador público.

### Regla ZK del MVP
> "Demostrar que los pagos pertenecen a un contrato autorizado y no superan el presupuesto disponible", sin revelar los pagos individuales.

```
Contrato
   ├── Presupuesto: $100M
   └── Pagos
         ├── $20M ✓
         ├── $30M ✓
         ├── $25M ✓
         └── $25M ✓
                 ↓
      ZK: "presupuesto respetado" ✓
```

El auditor o ciudadano verifica la afirmación sin recibir los datos subyacentes. Debe pasar las dos pruebas de aceptación (sección 6).

### Línea de investigación (trabajo de grado / publicación)
**ZK para conflictos de interés**: probar que "este administrador no tiene un conflicto de interés prohibido con este proveedor" sin revelar relaciones personales o empresariales.

```
Identidad del administrador + Registro de beneficiarios finales (RUB) + Proveedor
                              ↓
                              ZK
                              ↓
             "Cumple la regla de independencia"
```

Es original y conecta criptografía + privacidad + contratación pública + gobierno corporativo + Colombia. Se trata como trabajo futuro, no se implementa en el MVP.

---

## 11. Qué pasa con el código actual

| Se queda | Se congela | Se reemplaza / elimina |
|---|---|---|
| Web Next.js (`packages/web`) | App móvil (`packages/mobile`) | `TransactionRegistry.sol` → `CommitmentRegistry` (lotes, sin montos) |
| Supabase (Auth, RLS) | Panel de admin con datos simulados | `Account` como fuente de verdad → espejo conciliado |
| Patrón Edge Function + Database Webhook | Pago a entidades (`/pay-entity`) | Hash sin sal → hash con sal |
| Hardhat en `packages/contracts` (**restaurar**) | Chatbot de soporte | Plan "efectivo digital" |
| `EntityReceiver` → base para `AuthorizedVendor` | `transfer_funds` / `pay_to_entity` (se aseguran y no se tocan más) | `OnChainBadge` → portal de verificación |

> ⚠️ La rama `pivot/efectivo-digital` tiene cambios **sin commit** que implementaban el tear-down del plan anterior (borran contratos, edge function `anchor-transaction`, migraciones on-chain, `OnChainBadge`, pago a entidades). Con esta visión varios de esos elementos se reutilizan: guardar esos cambios aparte (stash) antes de crear la rama nueva.

---

## 12. Hoja de ruta

### Fase 0 — Esta semana: apagar incendios
- [x] Incidente registrado en [`SEGURIDAD_INCIDENTES.md`](./SEGURIDAD_INCIDENTES.md) (INC-001).
- [ ] **Rotar la contraseña de Postgres** del proyecto Supabase `bmfiotbutuslsaxeumik` (estuvo en `test-p1.mjs`/`test-p2.mjs` y sigue en el historial de un repo **público**) y revisar logs.
- [ ] Pasar el repo a privado (no borra la filtración: rotar la contraseña es lo que protege).
- [x] Guardar el tear-down sin commit (`stash@{0}`), crear la rama `pivot/trazabilidad` y restaurar `packages/contracts`.
- [x] Aplicar los arreglos del zip: scripts leen `DB_URL` del entorno, `.gitignore` en UTF-8, `.env.example`.
- [x] Quitar la segunda contraseña filtrada (proyecto `garzwhnenhtmpfvfntmk`) de `packages/web/VERCEL_DEPLOYMENT.md`. **También hay que rotarla.**
- [x] Corregir `20260916120000_security_fixes.sql` (validada en Postgres 16 local: bloquea el robo, fuerza saldo 0, idempotente).
- [ ] **Aplicarla** en el SQL Editor de Supabase. Cambios hechos:
  - `DROP FUNCTION` de la versión vieja de `transfer_funds` (firma con emails); si no, queda una sobrecarga sin validar `auth.uid()`.
  - Renombrar variables `v_*` a `l_*` (bug del SQL Editor, error 42P01).
  - `SET search_path = public` en las funciones `SECURITY DEFINER`.
  - Índice único en `Account("profileId", type)`.
- [ ] Probar: transferencia normal funciona; RPC con el `p_sender_id` de otro usuario devuelve "No autorizado".
- [ ] Confirmar qué proyecto de Supabase usa Vercel (`garzwhnenhtmpfvfntmk` o `bmfiotbutuslsaxeumik`).
- [x] Decidir la visión con Nicolás (16/09/2026).
- [ ] Actualizar el README (dice "Sebastián Díaz"; autores: Sebastián Murcia Sánchez y Nicolás Castillo) con el nuevo lema.

### Fase 1 — Validación con usuarios (⏸️ POSPUESTA, decisión 16/09/2026)
> Se salta por ahora para avanzar con el MVP universitario (fases 2 y 3). **Es obligatoria antes de la Fase 4 (piloto real)**:
> sin ella no hay forma de saber si alguien pagaría ni qué le duele de verdad.

- [ ] Entrevistar a 15-20 personas: fundaciones y ONG, revisores fiscales, cooperación internacional, veedurías.
- [ ] Cómo rinden cuentas hoy, cuánto les cuesta, qué les duele, quién pagaría.
- [ ] Asesoría legal: Ley 1581, Ley 1712, SARLAFT, licencia. Revisar innovasfc (Superfinanciera) y consultorios jurídicos universitarios.
- [ ] **Meta**: 2-3 organizaciones dispuestas a un piloto.

### Fase 2 — Cimientos
- [x] `docs/POLITICA_DATOS.md`: clasificación de datos (capa 0) con la regla de oro.
- [x] `docs/MODELO_AMENAZA.md`: definición de X, Y, adversario y datos públicos para las pruebas de aceptación.
- [ ] Modelo de mandatos: `Fund`, `Contract`, `Budget`, `AuthorizedVendor`, `FundRule` con RLS + registro de accesos.
- [ ] Importación CSV / registro de pagos y conciliación.
- [ ] `CommitmentRegistry` con lotes, reemplazando el contrato que publica montos.

### Fase 3 — Primera prueba de punta a punta (entregable universitario)
- [ ] Regla ZK: "pagos del contrato autorizados y total ≤ presupuesto", generada en la zkVM y verificada en Base Sepolia.
- [ ] Portal público de verificación (sin cuenta).
- [ ] ✅ Pasar la prueba de transparencia y la prueba de privacidad.
- [ ] Primera auditoría de seguridad, aunque sea con un tercero conocido.

### Fase 4 — Piloto real
- [ ] Una organización, datos reales, **sin mover dinero**.
- [ ] Medir: ¿reduce el tiempo de auditoría? ¿el donante lo usa?

### Fase 5 — Las otras tres puertas
- [ ] Sobrecosto: alertas de precios frente a referencias (SECOP II).
- [ ] Obra no entregada: actas de entrega firmadas.
- [ ] Validación de CUFE y enlace con SECOP II.
- [ ] Divulgación selectiva con llaves que expiran.
- [ ] Conflictos de interés con ZK (línea de investigación).

### Fase 6 — Mover dinero con un aliado regulado
- [ ] Smart wallet con passkeys para proveedores y beneficiarios.

### Fase 7 — Modo personal privado
- [ ] Pruebas de legitimidad tipo Privacy Pools, **solo con respaldo legal sólido**.

---

## 13. Criterio de éxito

La prueba de que vamos bien **no es tener ZK funcionando**, sino que una organización real diga:
*"Esto me ahorra la auditoría y le da confianza a mis donantes."*
La tecnología avanzada solo vale si llega ahí.

---

## Fuentes

- [0xbow Closes $3.5M Round (GlobeNewswire)](https://www.globenewswire.com/news-release/2025/11/18/3190435/0/en/0xbow-Closes-3-5M-Round-for-Compliant-Crypto-Privacy-Technology-Following-Ethereum-Foundation-Integration.html)
- [0xbow Raises $3.5M (The Defiant)](https://thedefiant.io/news/defi/0xbow-raises-usd3-5-million-to-expand-privacy-pools)
- [Association Sets — 0xbow blog](https://0xbow.io/blog/unlocking-privacy-preserving-compliance-with-association-sets)
- [0xbow Privacy Pools (The Block)](https://www.theblock.co/post/348959/0xbow-privacy-pools-new-cypherpunk-tool-inspired-research-ethereum-founder-vitalik-buterin)
- [ZK Proofs in 2026: What Is Production-Ready (Wavect)](https://wavect.io/blog/zero-knowledge-proofs-production-2026/)
- [SP1 — Succinct Docs](https://docs.succinct.xyz/docs/sp1/introduction)
- [RISC Zero production zkVM (The Block)](https://www.theblock.co/post/300554/risc-zero-rolls-out-production-ready-zkvm)
