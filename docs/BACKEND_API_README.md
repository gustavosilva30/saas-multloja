# 🚀 Nexus Backend API

Arquitetura alternativa com **PostgreSQL puro + MinIO** (sem Supabase).

---

## 📋 Diferenças da Branch `backend-api`

| Feature | Branch `main` (Supabase) | Branch `backend-api` (PostgreSQL)
|---------|--------------------------|----------------------------------
| Banco | Supabase | PostgreSQL 16
| Auth | Supabase Auth | JWT + bcrypt (próprio)
| Storage | Supabase Storage | MinIO (S3-compatible)
| RLS | PostgreSQL RLS | Middleware Node.js
| Backend | Apenas frontend | Node.js API completa
| Custo | Supabase Pro $25/mês | VPS apenas ~$5/mês

---

## 🏗️ Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   VPS       │────▶│  PostgreSQL │
│  (Frontend) │     │  (Node.js)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    MinIO    │
                    │   (S3 API)  │
                    └─────────────┘
```

---

## 🚀 Quick Start

### 1. Iniciar Backend Local

```bash
# Copiar env
cp env.backend.template backend/.env

# Editar backend/.env com suas configurações

# Subir serviços
docker-compose -f docker-compose.backend.yml --profile dev up -d

# Instalar dependências e rodar
cd backend
npm install
npm run dev
```

### 2. URLs Locais

| Serviço | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| MinIO API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |
| Redis | localhost:6379 |
| pgAdmin (opcional) | http://localhost:5050 |

---

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/           # Database, MinIO, app config
│   ├── middleware/       # Auth, error handling
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── index.ts         # Entry point
├── database/
│   └── init/
│       └── 01_schema.sql # PostgreSQL schema
├── Dockerfile            # Production
├── Dockerfile.dev        # Development
└── package.json
```

---

## 🔐 Autenticação

### JWT Flow

```
1. POST /api/auth/register → Cria user + tenant
2. POST /api/auth/login → Retorna JWT token
3. Header: Authorization: Bearer <token>
4. Middleware verifica token e injecta req.user
5. Tenant isolation automática
```

### Roles

- `owner` - Todos os poderes
- `admin` - Gerencia users, configurações
- `operator` - Vendas, produtos, clientes
- `viewer` - Apenas leitura

---

## 📦 MinIO (Storage)

### Características

- **S3 API compatible** - Funciona com AWS SDK
- **Presigned URLs** - Upload/download seguro
- **Self-hosted** - Controle total
- **Bucket policies** - ACLs flexíveis

### Uso

```typescript
// Upload
const url = await getPresignedUploadUrl('products/image.jpg');
await fetch(url, { method: 'PUT', body: file });

// Download
const downloadUrl = await getPresignedDownloadUrl('products/image.jpg');
```

---

## 🗄️ Banco de Dados

### Migrations

```bash
# Auto-migrate on startup
# Schema em: backend/database/init/01_schema.sql

# Manual migration
cd backend
npm run db:migrate
```

### Conexão

```typescript
import { query, withTransaction } from './config/database';

// Simple query
const result = await query('SELECT * FROM products WHERE tenant_id = $1', [tenantId]);

// Transaction
await withTransaction(async (client) => {
  await client.query('INSERT...');
  await client.query('UPDATE...');
});
```

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - User atual
- `POST /api/auth/change-password`
- `POST /api/auth/refresh`

### Products
- `GET /api/products` - Listar (paginação, filtros)
- `GET /api/products/:id` - Detalhes
- `POST /api/products` - Criar
- `PUT /api/products/:id` - Atualizar
- `DELETE /api/products/:id` - Deletar (soft)
- `PATCH /api/products/:id/stock` - Ajustar estoque

### Customers
- `GET /api/customers`
- `POST /api/customers`
- etc...

### Sales
- `GET /api/sales`
- `POST /api/sales`
- etc...

### Upload
- `POST /api/upload/presign` - Gerar URL presigned

---

## 🛡️ Segurança

### Implementado

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Role-based access control
- ✅ Tenant isolation
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ CORS configurável
- ✅ Input validation (express-validator)
- ✅ SQL injection protection (parameterized queries)

---

## 🚢 Deploy

### Produção (VPS)

```bash
# 1. Copiar arquivos para VPS
rsync -avz backend/ root@your-vps:/opt/nexus/backend/
rsync -avz docker-compose.backend.yml root@your-vps:/opt/nexus/
rsync -avz env.backend.template root@your-vps:/opt/nexus/.env

# 2. Na VPS
cd /opt/nexus
# Editar .env com valores de produção

docker-compose -f docker-compose.backend.yml --profile production up -d
```

### Vercel (Frontend)

```bash
# Variáveis na Vercel:
VITE_API_URL=https://api.seudominio.com/api
VITE_MINIO_URL=https://storage.seudominio.com
```

---

## 🧪 Testes

```bash
cd backend
npm test
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Verificar PostgreSQL
docker logs nexus-postgres
# Verificar env DATABASE_URL
```

### "MinIO connection refused"
```bash
# Verificar MinIO
docker logs nexus-minio
# Bucket existe?
docker exec nexus-minio mc ls local/
```

### "JWT verification failed"
```bash
# JWT_SECRET deve ter 32+ caracteres
# Verificar se é o mesmo no frontend e backend
```

---

## 📚 Documentação Relacionada

- [VPS CORS Setup](./VPS_CORS_SETUP.md)
- [Deploy Checklist](./DEPLOY_VERCEL_CHECKLIST.md)
- [PostgreSQL Schema](./../backend/database/init/01_schema.sql)

---

## 🆘 Suporte

Problemas? Verifique:

1. Logs: `docker-compose -f docker-compose.backend.yml logs -f`
2. Health: `curl http://localhost:3000/health`
3. Database: `docker exec nexus-postgres psql -U nexus -d nexus_erp -c "\dt"`

---

**Branch**: `backend-api`  
**Stack**: Node.js + Express + PostgreSQL + MinIO + Redis  
**Licença**: MIT
