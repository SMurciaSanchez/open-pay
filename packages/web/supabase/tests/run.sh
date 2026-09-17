#!/usr/bin/env sh
# Aplica TODAS las migraciones en un Postgres desechable (dos veces, para
# comprobar que se pueden repetir) y corre las pruebas. No toca Supabase.
# Uso: sh packages/web/supabase/tests/run.sh   (requiere Docker)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
C=openpay-db-test
docker rm -f $C >/dev/null 2>&1 || true
docker run -d --name $C -e POSTGRES_PASSWORD=local postgres:16 >/dev/null
trap 'docker rm -f $C >/dev/null' EXIT
until docker exec $C pg_isready -U postgres -q; do sleep 1; done
sleep 2
run() { docker exec -i $C psql -U postgres -v ON_ERROR_STOP=1 -q -o /dev/null < "$1"; }

run "$DIR/00_supabase_stub.sql"
for pass in 1 2; do
  for m in "$DIR"/../migrations/*.sql; do run "$m" 2>/dev/null; done
done
echo "Migraciones aplicadas dos veces sin error"
run "$DIR/10_helpers.sql"
FAIL=0
for t in "$DIR"/2*.sql "$DIR"/3*.sql; do
  echo "== $(basename "$t")"
  OUT=$(run "$t" 2>&1) || FAIL=1
  echo "$OUT" | sed -n "s/.*NOTICE:  //p; /FALLA\|ERROR/p"
done
[ $FAIL -eq 0 ] && echo "=== TODAS LAS PRUEBAS PASARON ===" || { echo "=== HAY FALLAS ==="; exit 1; }
