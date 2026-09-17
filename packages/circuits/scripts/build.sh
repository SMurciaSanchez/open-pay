#!/usr/bin/env sh
# Compila el circuito y genera las claves de prueba y verificación.
#
# ⚠️  LA CEREMONIA QUE CORRE ESTE SCRIPT ES DE DESARROLLO, NO SIRVE PARA
#     PRODUCCIÓN. Genera el Powers of Tau localmente y aporta una sola
#     contribución, en esta misma máquina. Quien tenga la aleatoriedad usada
#     acá podría fabricar pruebas falsas — no destapar datos, pero sí probar
#     cosas que no ocurrieron.
#
#     Por qué se genera local: los tres espejos públicos del Powers of Tau de
#     Hermez (storage.googleapis.com/zkevm, hermez.s3-eu-west-1.amazonaws.com y
#     pse-trusted-setup-ppot) responden AccessDenied desde 2026-09-17.
#
#     Antes de cualquier uso real hay que rehacer la fase 2 como ceremonia con
#     varios participantes y publicar las contribuciones. Ver docs/CEREMONIA.md.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

CIRCUITO=authorized_within_budget
POTENCIA=18
CIRCOM=./tools/circom.exe
[ -x "$CIRCOM" ] || CIRCOM=circom

export NODE_OPTIONS=--max-old-space-size=8192
SNARKJS="npx snarkjs"

mkdir -p build ptau

echo "── 1/5  Compilando el circuito"
"$CIRCOM" "circuits/$CIRCUITO.circom" --r1cs --wasm --sym -o build -l node_modules
$SNARKJS r1cs info "build/$CIRCUITO.r1cs"

echo "── 2/5  Powers of Tau (fase 1, universal)"
if [ ! -f "ptau/pot${POTENCIA}_final.ptau" ]; then
  [ -f "ptau/pot${POTENCIA}_0000.ptau" ] || \
    $SNARKJS powersoftau new bn128 "$POTENCIA" "ptau/pot${POTENCIA}_0000.ptau"
  $SNARKJS powersoftau contribute "ptau/pot${POTENCIA}_0000.ptau" \
    "ptau/pot${POTENCIA}_0001.ptau" --name="OpenPay dev" -e="$(head -c 64 /dev/urandom | base64)"
  echo "   preparando fase 2 (es el paso lento)"
  $SNARKJS powersoftau prepare phase2 "ptau/pot${POTENCIA}_0001.ptau" \
    "ptau/pot${POTENCIA}_final.ptau"
else
  echo "   ya existe, se reutiliza"
fi

echo "── 3/5  Setup Groth16 (fase 2, propia de este circuito)"
$SNARKJS groth16 setup "build/$CIRCUITO.r1cs" "ptau/pot${POTENCIA}_final.ptau" \
  "build/${CIRCUITO}_0000.zkey"

echo "── 4/5  Contribución a la fase 2"
$SNARKJS zkey contribute "build/${CIRCUITO}_0000.zkey" "build/${CIRCUITO}_final.zkey" \
  --name="OpenPay dev" -e="$(head -c 64 /dev/urandom | base64)"

echo "── 5/5  Exportando la clave de verificación"
$SNARKJS zkey export verificationkey "build/${CIRCUITO}_final.zkey" \
  "build/verification_key.json"

echo
echo "Listo:"
echo "  build/${CIRCUITO}_final.zkey        clave para PROBAR (no se publica)"
echo "  build/verification_key.json         clave para VERIFICAR (va al portal)"
echo "  build/${CIRCUITO}_js/               wasm para calcular el testigo"
echo
echo "El hash de la clave de verificación se ancla en CommitmentRegistry con:"
echo "  npx ts-node src/vkey-hash.ts"
