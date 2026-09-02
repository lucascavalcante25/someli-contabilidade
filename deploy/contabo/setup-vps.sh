#!/usr/bin/env bash
# Setup inicial na VPS Contabo (mesma máquina do Semear).
# Rode como root na VPS:
#   bash deploy/contabo/setup-vps.sh

set -euo pipefail

APP_DIR="/opt/someli-contabilidade"
REPO="${SOMELI_REPO:-https://github.com/lucascavalcante25/someli-contabilidade.git}"

echo "==> Diretório $APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main

if [[ ! -f deploy/contabo/.env ]]; then
  cp deploy/contabo/.env.example deploy/contabo/.env
  echo ""
  echo "IMPORTANTE: edite deploy/contabo/.env com POSTGRES_PASSWORD, JWT_SECRET e SUPABASE_DB_PASSWORD"
  echo "  nano $APP_DIR/deploy/contabo/.env"
  echo ""
  exit 0
fi

echo "==> Nginx (se ainda não instalado)"
if ! command -v nginx >/dev/null 2>&1; then
  apt-get update && apt-get install -y nginx certbot python3-certbot-nginx
fi

cp deploy/contabo/nginx/someli-api.conf /etc/nginx/sites-available/someli-api.conf
ln -sf /etc/nginx/sites-available/someli-api.conf /etc/nginx/sites-enabled/someli-api.conf
nginx -t && systemctl reload nginx

echo ""
echo "Próximos passos:"
echo "  1. DuckDNS: crie someli-contabilidade.duckdns.org apontando para o IP desta VPS"
echo "  2. certbot --nginx -d someli-contabilidade.duckdns.org"
echo "  3. bash deploy/contabo/migrate-from-supabase.sh"
echo "  4. Vercel: VITE_API_URL=https://someli-contabilidade.duckdns.org"
