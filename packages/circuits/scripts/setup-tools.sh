#!/usr/bin/env sh
# Baja el compilador de circom. Es un binario suelto de iden3: no tiene
# instalador, no toca el registro de Windows y se desinstala borrándolo.
#
# El hash de abajo es el de la versión que se usó para escribir este circuito.
# Si no coincide, PARAR: o cambió la versión o el archivo no es el que dice ser.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=v2.1.9
SHA256=b31d9a9e2cddff16438423869068a9cbc428d37a328d3d1516962a23a1753b17

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) ARCHIVO=circom-windows-amd64.exe; DESTINO="$DIR/tools/circom.exe" ;;
  Darwin)               ARCHIVO=circom-macos-amd64;       DESTINO="$DIR/tools/circom" ;;
  *)                    ARCHIVO=circom-linux-amd64;       DESTINO="$DIR/tools/circom" ;;
esac

mkdir -p "$DIR/tools"
echo "Bajando circom $VERSION..."
curl -sL --create-dirs -o "$DESTINO" \
  "https://github.com/iden3/circom/releases/download/$VERSION/$ARCHIVO"
chmod +x "$DESTINO"

OBTENIDO=$(sha256sum "$DESTINO" | cut -d' ' -f1)
if [ "$OBTENIDO" != "$SHA256" ]; then
  echo "EL HASH NO COINCIDE"
  echo "  esperado: $SHA256"
  echo "  obtenido: $OBTENIDO"
  rm -f "$DESTINO"
  exit 1
fi

echo "Listo: $DESTINO"
"$DESTINO" --version
