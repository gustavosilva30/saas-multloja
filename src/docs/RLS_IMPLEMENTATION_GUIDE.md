# Guia de Implementação RLS - NexusERP

## Resumo
Este guia cobre a implementação de **Row Level Security (RLS)** no Supabase/PostgreSQL para isolamento multi-tenant no NexusERP.

---

## 📋 Checklist de Implementação

### 1. Configuração no Supabase Dashboard

#### 1.1 Executar o Schema SQL
1. Acesse o [Supabase Dashboard](https://app.supabase.io)
2. Vá em **SQL Editor**
3. Cole todo o conteúdo de `@/src/data/supabase_schema.sql`
4. Execute o script

#### 1.2 Configurar o Auth Hook (CRITICAL)
1. No Dashboard, vá em **Authentication > Hooks**
2. Ative **"Custom Access Token Hook"**
3. Defina a função: `public.custom_access_token_hook`

Isso garante que `tenant_id` e `user_role` sejam injetados automaticamente no JWT de cada usuário.

---

## 🔒 Como o RLS Funciona

### Exemplo de Política
```sql
CREATE POLICY "products_isolation_select" ON public.products
  FOR SELECT USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );
```

### Fluxo de Segurança
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuário   │────▶│   JWT Token │────▶│   Supabase  │
│   Login     │     │  (tenant_id │     │   Postgres  │
│             │     │   user_role) │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  RLS Check  │
                                         │ tenant_id = │
                                         │ JWT.tenant_id│
                                         └──────┬──────┘
                                                │
                                         ┌──────▼──────┐
                                         │   Dados do  │
                                         │    Tenant   │
                                         │   apenas    │
                                         └─────────────┘
```

---

## 🚀 Uso no Frontend (React)

### Autenticação
```typescript
import { supabase } from '@/lib/supabase';

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@empresa.com',
  password: 'senha123'
});

// O JWT automaticamente contém:
// { app_metadata: { tenant_id: "uuid", user_role: "admin" } }
```

### CRUD de Produtos
```typescript
import { productsApi } from '@/lib/supabase';

// Listar - RLS filtra automaticamente pelo tenant_id do JWT
const { data: products, error } = await productsApi.list();

// Criar - tenant_id é automaticamente validado pelo RLS
const { data: newProduct, error } = await productsApi.create({
  sku: 'PROD001',
  name: 'Produto Teste',
  sale_price: 99.90
  // tenant_id é extraído do JWT pelo RLS
});
```

### Verificar Permissões
```typescript
import { isAdmin, getCurrentUserRole } from '@/lib/supabase';

// Verificar se é admin
if (await isAdmin()) {
  // Mostrar botões de administração
}

// Verificar role específica
const role = await getCurrentUserRole();
if (role === 'owner' || role === 'admin') {
  // Permitir ações destrutivas
}
```

---

## 📊 Estrutura de Tabelas com RLS

| Tabela | tenant_id | Políticas |
|--------|-----------|-------------|
| `tenants` | Sim | SELECT/UPDATE (próprio tenant) |
| `user_profiles` | Sim | CRUD completo |
| `products` | Sim | CRUD completo |
| `customers` | Sim | CRUD completo |
| `sales` | Sim | CRUD (DELETE apenas admin) |
| `sale_items` | Sim | CRUD completo |
| `financial_transactions` | Sim | CRUD (DELETE apenas admin) |
| `bank_accounts` | Sim | CRUD (DELETE apenas admin) |
| `cash_movements` | Sim | CRUD (UPDATE/DELETE apenas admin) |

---

## ⚠️ Segurança Importante

### NUNCA confie apenas no frontend:

```typescript
// ❌ ERRADO - Não fazer isso!
await supabase.from('sales').select('*'); // Sem where tenant_id!

// ✅ CORRETO - RLS faz a verificação automaticamente
await supabase.from('sales').select('*'); // RLS filtra pelo JWT
```

O RLS é a **última linha de defesa**. Mesmo que um desenvolvedor esqueça de filtrar no código, o banco de dados bloqueia o acesso.

---

## 🔧 Configuração de Variáveis de Ambiente

```env
# .env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📈 Vantagens desta Arquitetura

1. **Segurança Absoluta**: Dados isolados no nível do banco
2. **Performance**: Sem JOINs complexos para verificar permissões
3. **Escalabilidade**: Novos tenants = apenas novas rows
4. **Manutenção**: Uma codebase para todos os tenants

---

## 🧪 Testando o RLS

### Teste 1: Verificar Isolamento
```sql
-- Simular usuário do Tenant A
SET LOCAL auth.jwt = '{"app_metadata": {"tenant_id": "uuid-A", "user_role": "user"}}';

SELECT * FROM products;
-- Deve retornar apenas produtos do Tenant A
```

### Teste 2: Tentativa de Acesso Invasão
```sql
-- Tentar acessar dados de outro tenant
INSERT INTO products (tenant_id, sku, name)
VALUES ('uuid-B', 'HACK', 'Tentativa de invasão');
-- ❌ DEVE FALHAR - violação de RLS
```

---

## 📚 Arquivos Relacionados

- `@/src/data/supabase_schema.sql` - Schema completo com RLS
- `@/src/lib/supabase.ts` - Cliente e APIs
- `@/src/lib/database.types.ts` - Tipos TypeScript
- `@/src/docs/SUPABASE_RBAC_NEXTJS.md` - Documentação complementar
