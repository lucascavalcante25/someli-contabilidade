# Deploy - SOMELI Contabilidade

## Resumo

- **Frontend:** Vercel
- **Backend:** Render
- **Banco de dados:** Supabase (PostgreSQL)

---

## 1. Supabase (Banco de dados)

1. No painel do Supabase, vá em **Project Settings** → **Database**
2. Copie a **Connection string** (URI ou Session mode)
3. Para o backend Spring, use no formato JDBC: `jdbc:postgresql://HOST:PORT/postgres`
   - Exemplo direto: `jdbc:postgresql://db.jksueuziekvhdmctbtey.supabase.co:5432/postgres`
   - Exemplo pooler: `jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:6543/postgres`
4. `DB_USERNAME`: geralmente `postgres` (ou `postgres.[ref]` no pooler)
5. `DB_PASSWORD`: a senha do banco

**Importante:** O backend usa **Flyway** para migrations. As tabelas serão criadas automaticamente na primeira execução.

---

## 2. Render (Backend)

1. Crie um novo **Web Service**
2. Conecte o repositório Git
3. Configurações:
   - **Language:** Docker
   - **Branch:** main
   - **Region:** Oregon (US West) ou a mais próxima
   - **Root Directory:** `backend`
   - **Dockerfile Path:** `./Dockerfile` (padrão, relativo ao Root Directory)

4. **Variáveis de ambiente** (Environment → Add Environment Variable):
   - `DB_URL` = Connection string do Supabase (ex: `jdbc:postgresql://...`)
   - `DB_USERNAME` = usuário do Supabase (geralmente `postgres`)
   - `DB_PASSWORD` = senha do Supabase
   - `JWT_SECRET` = string aleatória longa e segura (ex: gerar com `openssl rand -base64 64`)
   - `FRONTEND_URL` = URL do frontend na Vercel (ex: `https://someli.vercel.app`) — para CORS

5. Após o deploy, anote a URL do backend (ex: `https://someli-backend.onrender.com`)

---

## 3. Vercel (Frontend)

1. Importe o repositório no Vercel
2. **Root Directory:** deixe em branco (raiz do projeto)
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`

5. **Variáveis de ambiente:**
   - `VITE_API_URL` = URL do backend no Render (ex: `https://someli-backend.onrender.com`)

6. Faça o deploy

---

## 4. Ordem recomendada

1. **Supabase** — criar projeto e obter connection string  
2. **Render** — deploy do backend com as variáveis de ambiente  
3. **Vercel** — deploy do frontend com `VITE_API_URL` apontando para o backend no Render
