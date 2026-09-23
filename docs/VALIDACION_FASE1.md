# OpenPay — Fase 1: validación con usuarios

> Autores: Sebastián Murcia Sánchez · Nicolás Castillo
> Versión: 0.1 — 23/09/2026
> Relacionado: [`VISION_OPENPAY.md`](./VISION_OPENPAY.md) §12 (Fase 1) y §13 (criterio de éxito) · [`POLITICA_DATOS.md`](./POLITICA_DATOS.md)
>
> La Fase 1 es **obligatoria antes del piloto (Fase 4)**. Sin ella no sabemos si alguien pagaría ni qué le duele de verdad.
> Este documento es el material para hacerla: a quién entrevistar, qué preguntar, cómo tomar notas, cuándo dar una hipótesis por buena o por mala, y qué preguntarle a un abogado.

---

## 1. Qué queremos aprender

El criterio de éxito de OpenPay (VISION §13) es que una organización real diga *"esto me ahorra la auditoría y le da confianza a mis donantes"*. Las entrevistas tienen que decirnos si eso es verdad **antes** de construir más.

### Hipótesis

Cada una se da por **confirmada**, **refutada** o **sin evidencia** según el umbral. Los umbrales se fijan ahora, antes de entrevistar, para no acomodarlos después a lo que salga.

| # | Hipótesis | Se confirma si… | Se refuta si… |
|---|---|---|---|
| H1 | Rendir cuentas del dinero ajeno le cuesta a la organización tiempo o dinero que puede cuantificar | ≥ 60 % de las organizaciones da una cifra (horas/mes, costo de auditoría, personas dedicadas) sin que se la sugiramos | La mayoría dice que no les cuesta nada o no sabe |
| H2 | Quien da el dinero (donante, cooperante, copropietario, asamblea) desconfía o pide más evidencia de la que hoy recibe | ≥ 50 % cuenta un episodio concreto de desconfianza, reclamo o requerimiento extra en los últimos 12 meses | Nadie recuerda un episodio concreto |
| H3 | Publicar el detalle de los pagos es un problema real (privacidad de proveedores o beneficiarios, seguridad, competencia) | ≥ 40 % menciona un dato que **no** publicaría y por qué | Todos publicarían todo sin problema |
| H4 | Una verificación que no dependa de creerle a la organización tiene valor para quien recibe los informes | ≥ 50 % de revisores fiscales, cooperantes o veedores dice que cambiaría algo en su trabajo (menos muestreo, menos requerimientos, más confianza) | La respuesta típica es "igual tendría que revisar todo" |
| H5 | Hay alguien dispuesto a pagar, o a dedicar tiempo a un piloto | ≥ 2-3 organizaciones aceptan un piloto con fecha y persona responsable | Solo hay interés genérico ("avísenos cuando esté") |

**H5 es la que decide la Fase 4.** Interés sin compromiso concreto cuenta como refutación.

---

## 2. A quién entrevistar (15-20 personas)

La regla de OpenPay es *dinero ajeno → responsabilidad*. Cualquier organización que administre dinero de otros es candidata. Se busca variedad: no más de 5 del mismo tipo.

| Segmento | Por qué es candidato | Meta | Cómo llegar |
|---|---|---|---|
| **Fundaciones y ONG** (ESAL) | Administran donaciones y rinden cuentas a donantes, a la DIAN y a su asamblea | 5-6 | Contactos de la universidad, voluntariados, directorios de fundaciones, LinkedIn |
| **Propiedad horizontal** (conjuntos, edificios) | El administrador maneja cuotas de todos los copropietarios; la desconfianza en asambleas es frecuente | 3-4 | Administradores y consejos de administración de conocidos; sus propios conjuntos |
| **Revisores fiscales y contadores** de ESAL o copropiedades | Son quienes hoy "verifican"; saben cuánto cuesta y qué falta | 3-4 | Profesores de contaduría, egresados, contadores de las organizaciones entrevistadas |
| **Cooperación internacional y donantes institucionales** | Exigen informes de ejecución a quienes financian | 2-3 | Oficinas de cooperación de la universidad, fundaciones empresariales |
| **Veedurías ciudadanas y periodistas de datos** | Son los usuarios del portal público | 2 | Veedurías registradas, organizaciones de transparencia, colectivos de datos abiertos |
| Opcional: fondos de empleados, juntas de acción comunal, asociaciones de padres | Dinero ajeno a escala chica | 0-2 | Conocidos |

Registrar quién refirió a quién: si una entrevista termina con "hable con X", es buena señal.

---

## 3. Cómo entrevistar

### Reglas (las más importantes primero)

1. **Preguntar por el pasado, no por el futuro.** "¿Cuándo fue la última vez que…?" y no "¿usaría usted…?". Lo que la gente dice que haría no sirve; lo que ya hizo, sí.
2. **No presentar OpenPay hasta el final.** Si se presenta al principio, la entrevista se vuelve una opinión sobre la idea, y la gente es amable con las ideas.
3. **Pedir números y episodios.** "Mucho tiempo" no sirve; "dos semanas cada trimestre, entre dos personas" sí.
4. **Callarse después de preguntar.** El silencio incómodo es donde sale lo útil.
5. **Nunca prometer funciones ni fechas.** OpenPay hoy es un MVP universitario en red de pruebas (Base Sepolia), que **no mueve dinero**. Decirlo así.
6. **Dos personas por entrevista** cuando se pueda: una pregunta, otra anota.
7. **30-45 minutos.** Si se alarga, es porque les importa.

### Consentimiento (Ley 1581)

Estamos recogiendo datos personales. Antes de empezar, leer o mandar por escrito:

> "Esta conversación es para un proyecto de grado de [universidad]. Vamos a tomar notas [y, si usted lo autoriza, grabar el audio]. Las notas se usan solo para este proyecto; en los informes no aparecerá su nombre ni el de su organización salvo que usted lo autorice. Puede pedir que borremos sus datos en cualquier momento escribiendo a [correo]. ¿Está de acuerdo?"

- Guardar la autorización (un "sí" por escrito en correo o chat basta).
- Las notas van **sin nombres** en el repositorio (ver §5); la lista de contactos va aparte, fuera del repositorio.
- **Nunca** pedir extractos, nombres de beneficiarios ni datos de proveedores durante la entrevista. Si los ofrecen, no guardarlos.

---

## 4. Guion

Las preguntas en **negrita** son las que no se pueden saltar. El resto se usa si hay tiempo o si la conversación va por ahí.

### 4.1 Apertura (3 min)
- Presentación, propósito (proyecto de grado sobre cómo las organizaciones rinden cuentas del dinero que administran), consentimiento.
- **"¿Me cuenta qué hace la organización y cuál es su papel en ella?"**

### 4.2 Cómo rinden cuentas hoy (10-15 min)
- **"¿A quién le tienen que rendir cuentas del dinero?"** (donantes, asamblea, DIAN, cooperante, copropietarios, junta)
- **"Cuénteme cómo fue la última vez que prepararon un informe de ejecución o de cuentas. ¿Qué hicieron, paso a paso?"**
- "¿Qué herramientas usan?" (Excel, software contable, informes del banco, carpetas de soportes)
- **"¿Cuánto tiempo les tomó? ¿Cuántas personas?"**
- "¿Quién revisa ese informe? ¿Qué pide?"
- "¿Cuánto les cuesta la revisoría o auditoría al año?" (si hay revisor fiscal o auditor externo)

### 4.3 Dónde duele (10 min)
- **"¿Recuerda alguna vez en que alguien dudó de las cuentas, pidió más soportes o hizo un reclamo? ¿Qué pasó?"**
- "¿Qué fue lo más difícil de demostrar?"
- "¿Alguna vez perdieron un donante, una convocatoria o la confianza de la asamblea por algo relacionado con esto?"
- **"Si pudiera cambiar una sola cosa de cómo rinden cuentas hoy, ¿cuál sería?"**

### 4.4 Qué no se puede publicar (5-10 min) — H3
- **"¿Hay información de los pagos que ustedes no publicarían aunque se la pidieran? ¿Por qué?"** (montos a proveedores, nombres de beneficiarios, salarios, contratistas en zonas de riesgo)
- "¿Alguna vez publicar algo les causó un problema?"
- "¿Qué publican hoy en su página o en sus informes?"

### 4.5 Solo para revisores fiscales, auditores y cooperantes — H4
- **"Cuando revisa las cuentas de una organización, ¿qué revisa exactamente? ¿Todo o una muestra?"**
- "¿Cómo sabe que los soportes que le entregan están completos?"
- **"Si tuviera una prueba de que todos los pagos del período fueron a proveedores de una lista autorizada y no pasaron del presupuesto, sin ver cada pago, ¿qué cambiaría en su trabajo? ¿Qué no cambiaría?"**
- "¿Qué necesitaría para confiar en esa prueba?"

### 4.6 Solo para veedurías y periodistas
- "¿Cómo verifican hoy el uso de recursos de una organización o un contrato?"
- "¿Qué información les falta? ¿Qué información sobra o pone en riesgo a alguien?"

### 4.7 Presentación de OpenPay (5 min, al final)
Mostrar https://open-pay-one.vercel.app/verificar con la prueba de ejemplo. Explicación en una frase:

> "La organización registra sus pagos; OpenPay publica una prueba de que todos fueron a proveedores autorizados y no pasaron del presupuesto. Cualquiera la puede verificar sin ver los pagos y sin tener que creerle ni a la organización ni a nosotros."

- **"¿Qué le parece útil y qué no? ¿Qué le falta?"**
- "¿A quién más le serviría esto?"

### 4.8 Cierre y compromiso (5 min) — H5
- **"Estamos buscando 2 o 3 organizaciones para un piloto sin mover dinero: registrar un mes de pagos reales y publicar la prueba. ¿Le interesaría? ¿Quién tendría que aprobarlo?"**
- Si dice que sí: pedir el **siguiente paso concreto** (reunión con quien decide, fecha). Un "sí" sin siguiente paso se anota como "interés genérico".
- **"¿A quién más debería entrevistar?"**
- Agradecer y confirmar cómo pueden pedir que se borren sus datos.

---

## 5. Plantilla de notas

Una nota por entrevista en `docs/entrevistas/E<nn>.md`, **sin nombres de personas ni organizaciones**: el código `E01`, `E02`… se cruza con la lista de contactos que está fuera del repositorio.

```markdown
# E<nn> — <segmento> — <fecha>

- Rol del entrevistado: <p. ej. directora administrativa, revisor fiscal>
- Tamaño: <presupuesto anual aprox. / nº de pagos al mes / nº de copropietarios>
- Entrevistaron: <iniciales> · Consentimiento: sí (<medio>) · Grabación: sí / no

## Cómo rinden cuentas hoy
<pasos, herramientas, a quién>

## Números
- Tiempo por informe: 
- Personas: 
- Costo de revisoría / auditoría al año: 

## Episodios concretos (con fecha aproximada)
- 

## Qué no publicarían y por qué
- 

## Reacción a OpenPay
- Útil: 
- No útil / objeciones: 
- Le falta: 

## Compromiso
- [ ] Piloto con siguiente paso concreto: <qué, quién, cuándo>
- [ ] Interés genérico
- [ ] No

## Referidos
- 

## Hipótesis
| H1 | H2 | H3 | H4 | H5 |
|---|---|---|---|---|
| + / − / ? | | | | |

## Cita textual más reveladora
> 
```

---

## 6. Síntesis

Después de cada 5 entrevistas, y al final:

1. Llenar la tabla de hipótesis con los totales (+, −, ?).
2. Listar los dolores que aparecen en **3 o más** entrevistas, con la palabra que usó la gente (no la nuestra).
3. Listar las objeciones repetidas.
4. Decidir: ¿seguimos igual, cambiamos de segmento, o cambiamos el problema?

Resultado de la fase (se escribe en §8 de este documento):
- Estado de H1-H5 con sus números.
- Las 2-3 organizaciones del piloto, con el siguiente paso acordado. Si no hay ninguna, **no se empieza la Fase 4**: se vuelve a entrevistar o se cambia de segmento.
- Cambios que hay que hacer al producto o al modelo de amenaza antes del piloto.

---

## 7. Preguntas para la asesoría legal

Para un consultorio jurídico universitario o un abogado en protección de datos. **Todas están abiertas**: son preguntas, no conclusiones nuestras. Llevar este documento y `POLITICA_DATOS.md`.

### Protección de datos (Ley 1581 de 2012)
1. En un piloto, ¿OpenPay es **encargado** del tratamiento de los datos de la organización? ¿Qué contrato o acuerdo de transmisión hay que firmar con ella?
2. La base está en Supabase y el portal en Vercel, con servidores fuera de Colombia. ¿Eso es **transferencia o transmisión internacional**? ¿Qué se necesita para hacerla bien?
3. Los proveedores personas naturales y los beneficiarios no firman nada con OpenPay. ¿Basta la autorización que les pide la organización, o hace falta algo más?
4. Borrar la sal hace que el hash en la cadena ya no se pueda vincular con la persona (*crypto-shredding*, VISION §9). ¿Eso cumple con la **supresión** que exige la ley, aunque el hash siga en una cadena que no se puede borrar?
5. ¿Hay que registrar las bases de datos en el RNBD de la SIC durante un piloto universitario?

### Transparencia (Ley 1712 de 2014)
6. ¿Qué organizaciones privadas son **sujetos obligados** por administrar recursos públicos? Si una de ellas usa OpenPay, ¿cambia lo que tiene que publicar?
7. ¿Publicar agregados y pruebas, en vez del detalle, puede **reemplazar** alguna obligación de publicación, o solo complementarla?

### Actividad financiera y SARLAFT
8. OpenPay registra y prueba pagos que la organización hace desde su propio banco; no recibe, custodia ni transfiere dinero. ¿Esa actividad necesita alguna licencia o registro ante la Superintendencia Financiera?
9. ¿OpenPay queda sujeto a algún régimen de prevención de lavado de activos (SARLAFT / SAGRILAFT) en ese modelo? ¿Y si más adelante se mueve dinero con un aliado regulado (Fase 6)?
10. ¿Tiene sentido acercarse al espacio de innovación de la Superfinanciera (innovasfc) en esta etapa, o es prematuro?

### Responsabilidad
11. Si una organización registra pagos falsos y la prueba sale válida (supuesto S5: se verifica lo registrado, no el banco), ¿qué responsabilidad tiene OpenPay? ¿Cómo hay que redactar los términos y el portal para no prometer de más?
12. ¿Qué cláusulas mínimas debe tener el acuerdo de piloto con una organización (confidencialidad, datos, terminación, uso de resultados en el trabajo de grado)?

### Propiedad intelectual
13. El código es público en GitHub. ¿Qué derechos tiene la universidad sobre un trabajo de grado, y es compatible con una licencia de código abierto?

---

## 8. Resultados

*(Se llena al terminar la fase.)*
