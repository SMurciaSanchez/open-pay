# La regla ZK de OpenPay

Un circuito que demuestra, **sin revelar ningún pago**, que una organización que
administra dinero ajeno cumplió dos reglas en un período:

1. **Todos** los pagos del lote fueron a proveedores de su lista autorizada.
2. La suma de esos pagos no superó el presupuesto del rubro.

Quien verifica no ve montos, ni proveedores, ni fechas, ni identificadores, ni
siquiera cuántos pagos hubo. Solo ve tres números: la raíz del lote, la raíz del
conjunto de proveedores y el tope del rubro.

## Por qué el circuito recorre el lote entero

Lo barato sería verificar el camino de Merkle de cada pago que el probador
declara. Pero eso demostraría *"estos pagos están en el lote y son correctos"*,
que deja abierta la puerta grande: **esconder los pagos incómodos** y no
declararlos.

Por eso el circuito **recalcula la raíz del lote desde todas las hojas** y la
compara con la que está anclada. Si alguien marca un pago real como casilla
vacía, la raíz que sale no es la anclada y la prueba no se puede construir. Es lo
que convierte "algunos pagos" en "todos los pagos".

Ese es el motivo de que el árbol sea pequeño: la cuenta crece con el tamaño del
árbol, así que la garantía se paga en restricciones. Hoy son **64 hojas**
(`DEFAULT_TREE_HEIGHT = 6` en `contracts/src/commitment.ts`): 147.100
restricciones y dominio 2^18.

Hubo un rodeo que conviene no repetir. El árbol se bajó a 16 hojas el 18-09
porque el `groth16 setup` con 64 corrió 15,4 horas sin escribir el `.zkey`, y se
dio por hecho que el circuito era demasiado grande. No lo era: la causa fue un
livelock de `fastfile` (ver `scripts/fastfile-fix.cjs`), y el proceso no iba a
terminar nunca, con 64 hojas o con 16. Arreglado eso, el setup de 64 hojas tarda
unos 2-3 minutos y se volvió a la altura original.

Subir la altura otra vez es un cambio de una línea, pero **invalida toda raíz ya
anclada**: el tamaño del árbol es parte del formato del compromiso.

La prueba de esta decisión está en `test/circuit.test.ts`, en el bloque *"no se
puede esconder un pago"*.

## Cómo se usa

```sh
npm install
sh scripts/setup-tools.sh   # baja circom y comprueba su hash
npm run build               # compila el circuito y corre la ceremonia
npm test                    # 42 pruebas unitarias
npm run aceptacion          # + pruebas de aceptación PT y PP (95 en total, lee Base Sepolia)
npm run demo                # genera build/demo-proof.json para el portal
npm run copy-vkey           # copia la clave de verificación al portal
npm run vkey-hash           # imprime la huella para anclarla en la cadena
```

Para probar el portal: `npm run demo`, después `cd ../web && npm run dev`, y
pegar `build/demo-proof.json` en `/verificar`. Cambiándole un dígito a la prueba,
la página tiene que decir que no es válida.

## Qué hay acá

| Archivo | Qué hace |
|---|---|
| `circuits/authorized_within_budget.circom` | La regla. Es el archivo que hay que leer para saber qué se está probando |
| `circuits/merkle.circom` | Árboles de Merkle con Poseidon, dentro del circuito |
| `src/witness.ts` | Arma las entradas del circuito desde los datos de un fondo |
| `src/prove.ts` | Genera y verifica pruebas; calcula la huella de la clave |
| `src/demo.ts` | Una prueba de ejemplo con datos inventados |
| `scripts/build.sh` | Compilación y ceremonia |

El cálculo de los compromisos vive en `packages/contracts/src/commitment.ts` y
**se importa, no se copia**: el circuito y el constructor de lotes tienen que
usar el mismo Poseidon, con los mismos campos y en el mismo orden. Si se
separaran, las pruebas dejarían de verificar sin que nada avisara.

## Pruebas de aceptación

`test/acceptance/` tiene las dos pruebas que exige `docs/MODELO_AMENAZA.md` §7,
escritas desde el lado de un tercero que no confía en OpenPay: solo usan la
prueba publicada, la clave que sirve el portal y la cadena leída por un nodo
público.

- `transparency.test.ts` (PT): la prueba verifica sin código de OpenPay, lo
  publicado está anclado, y un tramposo con todos los datos no logra probar un
  proveedor no autorizado, un total sobre el tope, un pago omitido ni uno
  modificado. El portal da el mismo veredicto.
- `privacy.test.ts` (PP): juego de indistinguibilidad sobre monto, proveedor,
  fecha y número de pagos; fuerza bruta de hojas; búsqueda de datos privados en
  todo lo publicado. Cada ataque tiene un control que muestra que el ataque
  funciona cuando las sales son débiles.

Un tercero no necesita la ceremonia: `sh scripts/build.sh --solo-compilar`
alcanza, porque compilar es determinista y las pruebas negativas solo calculan
testigos. `OPENPAY_SIN_RED=1` salta las lecturas de red.

## Lo que este circuito NO demuestra

- **Que el dinero se haya movido.** Eso lo dice la conciliación bancaria, y el
  banco sigue siendo la fuente (supuesto S5 de `docs/MODELO_AMENAZA.md`).
- **Que la lista de proveedores esté bien armada.** Demuestra que los pagos
  fueron a esa lista, no que esa lista sea la correcta. Quién puede modificarla
  y con qué control es un problema de la capa de mandatos, no del circuito.
- **Que el precio pagado fuera razonable.** Es otra regla y todavía no existe.

## Advertencia sobre la ceremonia

La ceremonia que corre `scripts/build.sh` es **de desarrollo**: se genera en una
sola máquina, con un solo participante. Quien tenga esa aleatoriedad podría
fabricar pruebas falsas — no destapar datos, pero sí probar cosas que no
ocurrieron.

Antes de cualquier uso real hay que rehacerla. Los pasos están en
[`docs/CEREMONIA.md`](../../docs/CEREMONIA.md).

## Números del circuito

| | |
|---|---|
| Restricciones | 147.100 |
| Pagos por lote | 64 |
| Proveedores por fondo | 64 |
| Señales públicas | 3 |
| Entradas privadas | 1.152 |
| Sistema de prueba | Groth16 sobre BN254 |
| Función de hash | Poseidon (compatible con circomlib) |
