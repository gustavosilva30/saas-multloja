# Deploy NexusERP no Easypanel

## Visão Geral

O frontend já está na **Vercel**. No Easypanel você precisa criar **3 serviços**:

| Serviço | Tipo | Domínio sugerido |
|---------|------|-----------------|
| PostgreSQL | Template gerenciado | interno (sem domínio público) |
| MinIO | App customizada | `storage.seudominio.com` |
| Backend API | App via GitHub | `api.seudominio.com` |

---

## Pré-requisitos

- Easypanel instalado na VPS
- Domínio apontando para o IP da VPS (registros A ou CNAME)
- Repositório no GitHub com o código
- Secrets gerados (ver seção abaixo)

## Gerando os secrets

Execute na sua máquina ou na VPS:

```bash
# JWT Secret (64 bytes hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Senha do banco (aleatória)
openssl rand -base64 32

# Senha do MinIO (aleatória)
openssl rand -base64 24
```

---

## Passo 1 — Criar o Projeto no Easypanel

1. Acesse o painel Easypanel → **Create Project**
2. Nome: `nexuserp`
3. Clique em **Create**

---

## Passo 2 — PostgreSQL (serviço gerenciado)

1. Dentro do projeto, clique em **Create Service → PostgreSQL**
2. Preencha:
   - **Service Name:** `postgres`
   - **Image:** `postgres:16`
   - **Database:** `nexus_erp`
   - **User:** `nexus`
   - **Password:** `<sua senha gerada>`
3. Clique em **Create**
4. Anote a **Connection String** interna que o Easypanel gera:
   ```
   postgresql://nexus:<senha>@nexuserp_postgres:5432/nexus_erp
   ```

### Rodar as migrations

Após o PostgreSQL iniciar, clique em **Terminal** no serviço e execute:

```bash
# O schema já fica em backend/database/init/ e é executado automaticamente
# pelo docker-entrypoint-initdb.d no primeiro boot.
# Se precisar rodar manualmente:
psql -U nexus -d nexus_erp -f /caminho/para/01_schema_tables.sql
```

---

## Passo 3 — MinIO (armazenamento de arquivos)

1. Clique em **Create Service → App**
2. **Source:** Docker Image
3. **Image:** `minio/minio:latest`
4. **Command:** `server /data --console-address ":9001"`
5. **Domains:**
   - Porta `9000` → `storage.seudominio.com` (API S3)
   - Porta `9001` → `minio-console.seudominio.com` (Console web)
6. **Volumes:** `/data` → `nexus-minio-data`
7. **Environment Variables:**

```env
MINIO_ROOT_USER=nexus
MINIO_ROOT_PASSWORD=<senha minio gerada>
MINIO_BROWSER_REDIRECT_URL=https://minio-console.seudominio.com
```

8. Clique em **Deploy**

---

## Passo 4 — Backend API (via GitHub)

1. Clique em **Create Service → App**
2. **Source:** GitHub
3. **Repository:** `seu-usuario/saas-multloja`
4. **Branch:** `master`
5. **Build Context:** `./backend`
6. **Dockerfile:** `./backend/Dockerfile`
7. **Domain:** `api.seudominio.com` → porta `3000`
8. **Environment Variables** (adicione uma a uma):

```env
NODE_ENV=production
PORT=3000

# Cole a connection string do Passo 2
DATABASE_URL=postgresql://nexus:<senha>@nexuserp_postgres:5432/nexus_erp

JWT_SECRET=<jwt secret gerado>
JWT_EXPIRES_IN=7d

MINIO_ENDPOINT=nexuserp_minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=nexus
MINIO_SECRET_KEY=<senha minio gerada>
MINIO_BUCKET=nexus-uploads

# URL do seu frontend na Vercel
CORS_ORIGIN=https://seu-app.vercel.app
```

> **Importante:** `MINIO_ENDPOINT` usa o nome interno do serviço Easypanel.
> O padrão é `<projeto>_<serviço>` — ex: `nexuserp_minio`.

9. Clique em **Deploy**

---

## Passo 5 — Atualizar variáveis do Frontend (Vercel)

No painel da Vercel, vá em **Settings → Environment Variables** e atualize:

```env
VITE_SUPABASE_URL=https://api.seudominio.com
```

> O projeto usa Supabase no frontend? Se estiver apontando para o backend próprio,
> atualize a URL da API para `https://api.seudominio.com`.

---

## Passo 6 — Verificar o deploy

```bash
# Verificar health do backend
curl https://api.seudominio.com/health

# Resposta esperada:
# {
#   "status": "ok",
#   "timestamp": "...",
#   "environment": "production",
#   "checks": {
#     "database": "ok",
#     "storage": "ok"
#   }
# }
```

---

## Serviços no Easypanel — Resumo

```
Projeto: nexuserp
│
├── postgres   (Template PostgreSQL 16)
│   └── interno — sem domínio público
│
├── minio      (App Docker)
│   ├── storage.seudominio.com       → porta 9000 (API)
│   └── minio-console.seudominio.com → porta 9001 (Console)
│
└── backend    (App GitHub)
    └── api.seudominio.com → porta 3000
```

---

## Troubleshooting

### Backend não conecta no PostgreSQL
- Confirme que o nome do serviço PostgreSQL no Easypanel é exatamente o usado em `DATABASE_URL`
- Veja os logs do backend: **Service → Logs**

### MinIO healthcheck falhando
- O MinIO leva ~10s para inicializar — aguarde e faça redeploy se necessário
- Verifique se `MINIO_ROOT_PASSWORD` tem pelo menos 8 caracteres

### CORS error no frontend
- Confirme que `CORS_ORIGIN` no backend bate exatamente com a URL do frontend (sem barra final)
- Ex: `https://nexuserp.vercel.app` (não `https://nexuserp.vercel.app/`)

### Deploy automático no push
No Easypanel, em cada App → **Settings → Auto Deploy**: ative para que o push no GitHub dispare rebuild automático.

---

## Custos estimados de VPS

| Recursos | Mínimo recomendado |
|----------|-------------------|
| CPU | 2 vCPU |
| RAM | 4 GB (PostgreSQL + MinIO + Node) |
| Disco | 20 GB SSD |
| Provedor | Hetzner CX22 (~€4/mês), DigitalOcean Basic ($12/mês) |
