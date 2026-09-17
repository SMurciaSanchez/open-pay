# La ceremonia del circuito

> **Estado al 2026-09-17: la ceremonia actual es de desarrollo y no sirve para
> producción.** Está generada en una sola máquina, por una sola persona. Antes
> de usar OpenPay con datos reales hay que rehacerla como se describe abajo.

## Qué es y por qué existe

El circuito de OpenPay usa **Groth16**, que antes de poder usarse necesita
generar dos claves: una para construir pruebas y otra para verificarlas. Esa
generación parte de un número aleatorio que **hay que destruir**.

Si alguien se queda con ese número, puede **fabricar pruebas de cosas falsas**:
por ejemplo, probar que todos los pagos fueron a proveedores autorizados cuando
no lo fueron.

Dos precisiones que importan y que conviene no exagerar en ninguna dirección:

- Lo que se rompe es la **solidez**, no la privacidad. Con el número se pueden
  falsificar pruebas, pero **no destapar los datos de nadie**. Los montos, los
  proveedores y las fechas siguen sin poder recuperarse.
- Por eso las claves se generan entre **varios participantes**: alcanza con que
  **uno solo** haya destruido su parte para que el conjunto sea seguro. No hay
  que confiar en todos, hay que confiar en que al menos uno fue honesto.

## Las dos fases

| Fase | Qué cubre | Quién la hace |
|---|---|---|
| **1 — Powers of Tau** | Universal: sirve para cualquier circuito hasta cierto tamaño | Normalmente se reutiliza una ceremonia pública grande |
| **2 — Setup del circuito** | Propia de *este* circuito; cambia si el circuito cambia | La hace el proyecto |

## Por qué la fase 1 hoy se genera localmente

Lo normal es **no** generar la fase 1, sino descargar la de Hermez, que tuvo
miles de participantes. El **17 de septiembre de 2026**, los tres espejos
conocidos respondían `AccessDenied`:

- `https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_18.ptau`
- `https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_18.ptau`
- `https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/hermez-raw-18`

Por eso `scripts/build.sh` genera la fase 1 en la máquina donde corre. Sirve para
desarrollar y para que las pruebas del repositorio pasen, **y para nada más**.

## Qué hay que hacer antes de usar esto de verdad

- [ ] **Conseguir un Powers of Tau público de 2^18.** Buscar un espejo vivo del
      archivo de Hermez o del Perpetual Powers of Tau, y verificar su hash
      contra el que publica la ceremonia original. Es lo primero que hay que
      resolver: sin esto, todo lo demás queda apoyado en una fase 1 casera.
- [ ] **Hacer la fase 2 como ceremonia con varios participantes.** Como mínimo
      los dos fundadores y dos o tres personas de afuera del proyecto — un
      profesor, alguien de una veeduría, alguien de una fundación. Cada uno
      corre `snarkjs zkey contribute` sobre el resultado del anterior.
- [ ] **Publicar cada contribución** con su hash y el nombre de quien la hizo,
      para que cualquiera pueda rehacer la cadena y comprobar que su aporte
      está adentro.
- [ ] **Anclar la huella de la clave de verificación** en `CommitmentRegistry`
      (`RootKind.VerificationKey`), para que el portal público no tenga que ser
      creído sobre su palabra.
- [ ] **Rehacer la ceremonia si el circuito cambia.** Cualquier modificación a
      `authorized_within_budget.circom` invalida la fase 2 anterior.

## Cómo se corre una contribución

```sh
# Cada participante parte del archivo del anterior y entrega el suyo
npx snarkjs zkey contribute anterior.zkey mi_aporte.zkey \
  --name="Nombre de quien contribuye"
# Pide entropía por teclado: teclear al azar un rato largo

# Cualquiera puede comprobar la cadena completa
npx snarkjs zkey verify circuito.r1cs pot18_final.ptau final.zkey
```

## Cómo se explica esto en la tesis

No como un detalle técnico escondido, sino como parte del argumento. La pregunta
honesta que un jurado puede hacer es *"¿y por qué le creo a tu prueba?"*, y la
respuesta tiene tres partes:

1. El circuito es público y se puede leer: dice exactamente qué se está probando.
2. La ceremonia fue distribuida y sus contribuciones están publicadas: basta con
   que uno de los participantes haya sido honesto.
3. La huella de la clave está anclada en la cadena: el portal no puede servir
   una clave distinta sin que se note.

Mientras la tercera y la segunda no estén hechas, decirlo. Un sistema que se
presenta como verificable y esconde su punto débil es peor que uno que lo
declara.

## Ver también

- [`PLAN_OPENPAY_ZK.md`](PLAN_OPENPAY_ZK.md) — la hoja de ruta y dónde encaja esto
- [`MODELO_AMENAZA.md`](MODELO_AMENAZA.md) — qué se supone y qué no
- `packages/circuits/scripts/build.sh` — el script que corre la ceremonia de desarrollo
