#!/usr/bin/env bash
# Exporta Supabase (session pooler :5432) e restaura no Postgres local do compose.
#
# Uso na VPS:
#   cd /opt/someli-contabilidade
#   cp deploy/contabo/.env.example deploy/contabo/.env   # preencha as senhas
#   bash deploy/contabo/migrate-from-supabase.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/deploy/contabo/.env"
COMPOSE=(docker compose -f "$ROOT/deploy/contabo/docker-compose.yml" --env-file "$ENV_FILE")
DUMP="/tmp/someli-supabase.dump"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Crie $ENV_FILE a partir de .env.example"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

SUPABASE_HOST="${SUPABASE_HOST:-aws-1-us-east-1.pooler.supabase.com}"
SUPABASE_PORT="${SUPABASE_PORT:-5432}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
SUPABASE_USER="${SUPABASE_USER:-postgres.eeortzijalyvffwdyats}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Defina SUPABASE_DB_PASSWORD no $ENV_FILE"
  exit 1
fi

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "Defina POSTGRES_PASSWORD no $ENV_FILE"
  exit 1
fi

echo "==> Subindo Postgres local (se ainda não estiver)..."
"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" stop api 2>/dev/null || true

echo "==> Dump Supabase (Postgres 17 via Docker) -> $DUMP"
docker run --rm \
  -e PGPASSWORD="$SUPABASE_DB_PASSWORD" \
  -e PGSSLMODE=require \
  postgres:17-alpine pg_dump \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -Fc --no-owner --no-acl \
  > "$DUMP"

NETWORK="$("${COMPOSE[@]}" ps -q db | xargs docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' | head -1)"

echo "==> Restore no Postgres local (pg_restore 17 via Docker)..."
docker run --rm -i --network "$NETWORK" \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  postgres:17-alpine pg_restore \
  -h db -U someli -d someli \
  --clean --if-exists --no-owner --no-acl \
  < "$DUMP" || true

echo "==> Subindo API..."
"${COMPOSE[@]}" up -d --build api

echo "==> Health:"
sleep 10
curl -sf "http://127.0.0.1:8081/management/health" && echo

echo "Concluído. Atualize VITE_API_URL na Vercel e teste o login."
