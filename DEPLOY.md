# Deploy - SOMELI Contabilidade

## Resumo (produção atual)

| Peça | Onde |
|------|------|
| **Frontend** | Vercel (`someli-contabilidade.vercel.app`) |
| **API** | Contabo VPS — porta `8081` (mesma máquina do Semear) |
| **Banco** | Postgres local na VPS (Docker) |

Legado: Render + Supabase (substituídos após migração).

---

## Contabo (API + Postgres na mesma VPS do Semear)

### Arquitetura

```
Vercel (front)  →  Nginx HTTPS  →  Someli API :8081  →  Postgres (container)
Semear API :8080 (stack separado, não conflita)
```

### 1. DuckDNS

Crie um hostname apontando para o **mesmo IP** da VPS do Semear, por exemplo:

- `someli-contabilidade.duckdns.org`

### 2. Setup na VPS (uma vez)

```bash
ssh root@169.58.179.91
cd /opt
git clone https://github.com/lucascavalcante25/someli-contabilidade.git
cd someli-contabilidade
cp deploy/contabo/.env.example deploy/contabo/.env
nano deploy/contabo/.env   # POSTGRES_PASSWORD, JWT_SECRET (Render), SUPABASE_DB_PASSWORD
bash deploy/contabo/setup-vps.sh
bash deploy/contabo/migrate-from-supabase.sh
certbot --nginx -d someli-contabilidade.duckdns.org
```

### 3. Variáveis (`deploy/contabo/.env`)

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_PASSWORD` | Senha do Postgres **local** (nova, forte) |
| `JWT_SECRET` | Copie do Render (mantém tokens válidos se igual) |
| `ALLOWED_ORIGINS` | `https://someli-contabilidade.vercel.app` |
| `SUPABASE_DB_PASSWORD` | Senha do Supabase (só para migração) |

CORS no código usa `ALLOWED_ORIGINS` (não `CORS_ORIGINS` do Render).

### 4. Vercel

Atualize:

- `VITE_API_URL` = `https://someli-contabilidade.duckdns.org`

Redeploy do front.

### 5. Deploy automático (GitHub Actions)

Push na `main` em `backend/**` ou `deploy/contabo/**` dispara deploy via SSH.

Secrets (reutilize os do Semear): `CONTABO_HOST`, `CONTABO_USER`, `CONTABO_SSH_KEY`.

### 6. Migrar para VPS dedicada depois

Sim, é simples:

1. Nova VPS Contabo
2. `pg_dump` do Postgres local atual (ou copiar volume Docker `pgdata`)
3. Clone do repo + `.env` + `docker compose up`
4. Atualizar DNS DuckDNS para o novo IP
5. Certbot no novo servidor

Não precisa mudar código — só infra e DNS.

---

## Migração Supabase → pg_dump

O script `deploy/contabo/migrate-from-supabase.sh` usa o **session pooler** (IPv4):

- Host: `aws-1-us-east-1.pooler.supabase.com`
- Porta: `5432`
- User: `postgres.eeortzijalyvffwdyats`
- Database: `postgres`
- Senha: a do painel Supabase / Render `DB_PASSWORD`

Conexão direta (`db.eeortzijalyvffwdyats.supabase.co`) exige IPv6 na VPS; o pooler evita isso.

---

## Legado: Render + Supabase

<details>
<summary>Instruções antigas (Render)</summary>

### Supabase

1. Connection pooler (Session mode), porta `5432` ou transaction `6543`
2. `DB_USERNAME`: `postgres.[PROJECT_REF]`

### Render

- Root Directory: `backend`
- Docker
- Variáveis: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `ALLOWED_ORIGINS`

### Vercel

- `VITE_API_URL` = URL do Render

</details>
