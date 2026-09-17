#!/usr/bin/env sh
# Prueba la migración de mandatos en un Postgres desechable (no toca Supabase).
# Uso: sh packages/web/supabase/tests/mandates/run.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
MIG="$DIR/../../migrations/20260916180000_mandates.sql"
docker rm -f op-mandates-test >/dev/null 2>&1 || true
docker run -d --name op-mandates-test -e POSTGRES_PASSWORD=local postgres:16 >/dev/null
trap 'docker rm -f op-mandates-test >/dev/null' EXIT
until docker exec op-mandates-test pg_isready -U postgres -q; do sleep 1; done
sleep 2
run() { docker exec -i op-mandates-test psql -U postgres -v ON_ERROR_STOP=1 -q < "$1"; }
run "$DIR/00_stub.sql"
run "$MIG"
run "$MIG"   # debe poder ejecutarse dos veces
run "$DIR/20_tests.sql" 2>&1 | grep -E "OK |FALLA|ERROR|PASARON"
