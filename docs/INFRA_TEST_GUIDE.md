# 🧪 Guia de Teste da Infraestrutura

Como validar que toda a stack está funcionando corretamente.

---

## 🎯 Resumo das Portas

| Serviço | Porta Host | Porta Container | Uso |
|---------|-----------|-----------------|-----|
| Backend API | 3000 | 3000 | API REST |
| PostgreSQL | 5432 | 5432 | Banco de dados |
| MinIO API | 9000 | 9000 | S3 API |
| MinIO Console | 9001 | 9001 | Web UI |
| Redis | 6379 | 6379 | Cache |
| pgAdmin | 5050 | 80 | Admin DB |

**Sem conflitos**: As portas são padrão e não conflitam entre si.

---

## 🚀 Iniciar a Infraestrutura

```bash
# 1. Garantir que está na branch backend-api
git checkout backend-api

# 2. Configurar ambiente
cp env.backend.template backend/.env

# 3. Editar backend/.env (opcional para teste local)
# Verificar: CORS_ORIGIN=http://localhost:5173

# 4. Subir serviços
docker-compose -f docker-compose.backend.yml --profile dev up -d

# 5. Verificar se estão rodando
docker ps
```

---

## ✅ Checklist de Verificação

### 1. Verificar Containers

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Esperado:
```
nexus-postgres      Up 30 seconds    0.0.0.0:5432->5432/tcp
nexus-minio         Up 30 seconds    0.0.0.0:9000-9001->9000-9001/tcp
nexus-redis         Up 30 seconds    0.0.0.0:6379->6379/tcp
nexus-backend-dev   Up 30 seconds    0.0.0.0:3000->3000/tcp
```

### 2. Verificar Logs

```bash
# Backend
docker logs nexus-backend-dev --tail 50

# Esperado ver:
# ✅ MinIO bucket initialized
# ✅ Connected to PostgreSQL
# 🚀 Server running on port 3000

# PostgreSQL
docker logs nexus-postgres --tail 20

# MinIO
docker logs nexus-minio --tail 20
```

### 3. Verificar Banco de Dados

```bash
# Conectar ao PostgreSQL
docker exec -it nexus-postgres psql -U nexus -d nexus_erp -c "\dt"

# Deve listar as tabelas:
#  user_profiles
#  tenants
#  products
#  customers
#  sales
#  etc...
```

### 4. Verificar MinIO Bucket

```bash
# Instalar mc (MinIO Client) no container
docker exec nexus-minio mc alias set local http://localhost:9000 nexus minio_password_2024

# Listar buckets
docker exec nexus-minio mc ls local/

# Deve mostrar: [bucket] nexus-uploads
```

---

## 🧪 Executar Testes Automatizados

### Opção 1: Script Bash (Linux/Mac/Git Bash Windows)

```bash
chmod +x scripts/test-api.sh
./scripts/test-api.sh
```

### Opção 2: PowerShell (Windows)

```powershell
.\scripts\test-api.ps1
```

### Opção 3: Comandos cURL Manuais

#### 1. Health Check
```bash
curl http://localhost:3000/health
# Resposta esperada: {"status":"ok",...}
```

#### 2. Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123",
    "full_name": "Test User",
    "tenant_name": "Test Store",
    "niche": "varejo"
  }'
# Resposta: {"token":"eyJhbGc...","user":{...}}
```

#### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "password123"
  }'
# Resposta: {"token":"eyJhbGc...","user":{...}}
# GUARDE O TOKEN!
```

#### 4. Get Current User (Autenticado)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### 5. List Products
```bash
curl "http://localhost:3000/api/products?page=1&limit=10" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### 6. Create Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "name": "Produto Teste",
    "sku": "TEST-001",
    "sale_price": 99.99,
    "stock_quantity": 100
  }'
```

---

## 🔍 MinIO - Teste de Upload

### Via Console Web

1. Acesse: http://localhost:9001
2. Login: `nexus` / `minio_password_2024`
3. Verifique se o bucket `nexus-uploads` existe
4. Dentro do bucket: deve ter pasta `tenants/` (vazia inicialmente)

### Via API (depois de rodar os testes)

```bash
# Gerar URL presigned (requer token JWT)
curl -X POST http://localhost:3000/api/upload/presign \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg", "folder": "products"}'

# Resposta: {"uploadUrl":"...","publicUrl":"..."}
```

---

## 🐛 Troubleshooting

### "Connection refused" na porta 3000
```bash
# Backend não subiu
docker logs nexus-backend-dev
# Verifique se o DATABASE_URL está correto
```

### "Cannot connect to database"
```bash
# PostgreSQL não está pronto
docker logs nexus-postgres
# Aguarde mais alguns segundos e tente novamente
```

### "Bucket not found"
```bash
# MinIO ainda não inicializou ou bucket não foi criado
docker logs nexus-minio
docker restart nexus-backend-dev
```

### "CORS error" (quando testar com frontend)
```bash
# Verificar CORS_ORIGIN no backend/.env
docker-compose -f docker-compose.backend.yml restart backend-dev
```

---

## 📊 Validação Final

Se todos os testes passarem, você verá:

```
==========================================
✅ ALL TESTS PASSED!
==========================================
Test User: test_1234567890@nexus.local
Tenant ID: 550e8400-...
Product ID: 660e8400-...
JWT Token: eyJhbGciOiJIUzI1NiIs...
```

---

## 🎉 Próximos Passos

1. **Frontend**: Atualizar para usar `http://localhost:3000/api`
2. **Integração**: Testar login no frontend React
3. **Deploy**: Quando tudo funcionar, subir para VPS

---

## 📁 Arquivos de Teste

| Arquivo | Descrição |
|---------|-----------|
| `scripts/test-api.sh` | Testes automatizados (Bash) |
| `scripts/test-api.ps1` | Testes automatizados (PowerShell) |
| `docs/INFRA_TEST_GUIDE.md` | Este guia |

---

**Status da Infraestrutura**: ✅ MinIO bucket criado automaticamente na inicialização do backend (via `initializeBucket()` no `src/index.ts`)
